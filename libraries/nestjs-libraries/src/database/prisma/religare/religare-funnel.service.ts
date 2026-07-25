import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, ReligareCheckoutStatus, ReligareLeadStatus } from '@prisma/client';
import { ReligareFunnelRepository } from './religare-funnel.repository';
import { ReligareRepository } from './religare.repository';
import { RELIGARE_MAPA_PRODUCT } from './religare-funnel-pricing';
import { CreateReligareLeadDto } from '@gitroom/nestjs-libraries/dtos/religare/funnel.dto';
import { InfinitePayService } from '@gitroom/nestjs-libraries/services/infinitepay.service';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

function normalizeWhatsapp(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) return null;
  return digits;
}

function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function isValidBirthTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

/**
 * A InfinitePay chama `webhook_url` a partir dos servidores dela — uma URL
 * `localhost`/`127.0.0.1` (padrão de dev em `NEXT_PUBLIC_BACKEND_URL`/
 * `FRONTEND_URL`) nunca vai ser alcançável. Falha alto e cedo em vez de
 * registrar silenciosamente um webhook que nunca vai chegar.
 */
function isPublicHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1' &&
      parsed.hostname !== '0.0.0.0'
    );
  } catch {
    return false;
  }
}

export interface CaptureLeadResult {
  leadId: string;
  checkoutId: string | null;
  checkoutUrl: string | null;
}

@Injectable()
export class ReligareFunnelService {
  private readonly logger = new Logger(ReligareFunnelService.name);

  constructor(
    private _repo: ReligareFunnelRepository,
    private _religareRepository: ReligareRepository,
    private _infinitePay: InfinitePayService
  ) {}

  /**
   * Falha fechado: NUNCA usa 'vocaccio-org-seed' (ou qualquer outra org)
   * como default silencioso. Se essa env var não estiver setada em algum
   * ambiente, o funil inteiro recusa a processar — melhor um 500 óbvio do
   * que gravar dados de teste na org de produção real por engano.
   */
  private prodOrgId(): string {
    const orgId = process.env.RELIGARE_PROD_ORG_ID;
    if (!orgId) {
      throw new Error('religare_funnel_misconfigured: RELIGARE_PROD_ORG_ID ausente');
    }
    return orgId;
  }

  /** Roteia pro passo 1 (sem leadId) ou passo 2 (com leadId) do funil. */
  async captureLead(dto: CreateReligareLeadDto): Promise<CaptureLeadResult> {
    if (dto.leadId) {
      return this.completeLead(dto.leadId, dto);
    }
    return this.startLead(dto);
  }

  /**
   * Passo 1: persiste nascimento + consentimento imediatamente, SEM exigir
   * contato — vira um ReligareLead DRAFT. `leadId` retornado (UUID v4, 122
   * bits de entropia) é o "token" que o passo 2 usa pra completar o mesmo
   * lead — ver docs/religare/funil-fundacao.md sobre por que isso é seguro
   * o bastante sem precisar de um campo de token separado.
   */
  private async startLead(dto: CreateReligareLeadDto): Promise<CaptureLeadResult> {
    const orgId = this.prodOrgId();

    if (
      !dto.birthDate ||
      !isValidBirthDate(dto.birthDate) ||
      !dto.birthTime ||
      !isValidBirthTime(dto.birthTime) ||
      !dto.birthPlace?.trim() ||
      !dto.consentVersion?.trim()
    ) {
      throw new BadRequestException('invalid_request');
    }

    const recentCount = await this._repo.countRecentDraftsForOrg(orgId, RATE_LIMIT_WINDOW_MS);
    if (recentCount >= RATE_LIMIT_MAX) {
      throw new BadRequestException('rate_limited');
    }

    const lead = await this._repo.createDraftLead({
      orgId,
      birthDate: dto.birthDate,
      birthTime: dto.birthTime,
      birthPlace: dto.birthPlace.trim(),
      consentVersion: dto.consentVersion.trim(),
      source: dto.source?.trim() || null,
    });

    return { leadId: lead.id, checkoutId: null, checkoutUrl: null };
  }

  /**
   * Passo 2: completa um lead JÁ EXISTENTE por (id=leadId, orgId=servidor)
   * — nunca por email/whatsapp (não há mais dedup por contato). Exige pelo
   * menos email ou whatsapp. Cria o ReligareProfile quando os campos
   * mínimos completam e então gera/reaproveita o checkout.
   */
  private async completeLead(
    leadId: string,
    dto: CreateReligareLeadDto
  ): Promise<CaptureLeadResult> {
    const orgId = this.prodOrgId();

    const email = dto.email ? dto.email.trim().toLowerCase() : null;
    let whatsapp: string | null = null;
    if (dto.whatsapp) {
      whatsapp = normalizeWhatsapp(dto.whatsapp);
      if (!whatsapp) throw new BadRequestException('invalid_request');
    }
    if (!email && !whatsapp) {
      throw new BadRequestException('invalid_request');
    }
    if (dto.birthDate && !isValidBirthDate(dto.birthDate)) {
      throw new BadRequestException('invalid_request');
    }
    if (dto.birthTime && !isValidBirthTime(dto.birthTime)) {
      throw new BadRequestException('invalid_request');
    }

    // orgId sempre do servidor — um leadId de outra org (ou inexistente)
    // dá o mesmo erro genérico, sem revelar se o id existe em outro lugar.
    const existingLead = await this._repo.findLeadById(leadId, orgId);
    if (!existingLead) {
      throw new BadRequestException('invalid_request');
    }

    const fullName = dto.fullName?.trim() || null;
    const birthDate = dto.birthDate || null;
    const birthTime = dto.birthTime || null;
    const birthPlace = dto.birthPlace?.trim() || null;
    const source = dto.source?.trim() || null;

    // Merge, nunca sobrescreve com null: o passo 2 pode não reenviar campos
    // já capturados no passo 1.
    const lead = await this._repo.updateLead(existingLead.id, {
      fullName: fullName ?? existingLead.fullName,
      email: email ?? existingLead.email,
      whatsapp: whatsapp ?? existingLead.whatsapp,
      birthDate:
        birthDate ??
        (existingLead.birthDate ? existingLead.birthDate.toISOString().slice(0, 10) : null),
      birthTime: birthTime ?? existingLead.birthTime,
      birthPlace: birthPlace ?? existingLead.birthPlace,
      consentVersion: dto.consentVersion?.trim() || null,
      source: source ?? existingLead.source,
    });

    // ReligareProfile.name é NOT NULL — por isso fullName entra nos "campos
    // mínimos" junto com os 3 campos de nascimento.
    if (!lead.profileId && lead.fullName && lead.birthDate && lead.birthTime && lead.birthPlace) {
      const profile = await this._religareRepository.createProfile(orgId, {
        name: lead.fullName,
        birthDate: lead.birthDate.toISOString().slice(0, 10),
        birthTime: lead.birthTime,
        birthPlace: lead.birthPlace,
      });
      await this._repo.linkLeadToProfile(lead.id, profile.id);
    } else if (!lead.profileId && lead.status === ReligareLeadStatus.DRAFT) {
      // Tem contato agora mas ainda falta fullName pra virar profile.
      await this._repo.markLeadNew(lead.id);
    }

    const checkout = await this.ensureCheckout(lead.id);

    return {
      leadId: lead.id,
      checkoutId: checkout?.id ?? null,
      checkoutUrl: checkout?.checkoutUrl ?? null,
    };
  }

  /**
   * Idempotente: reaproveita um checkout PAID/PROCESSING/PENDING-com-link
   * existente em vez de gerar um novo a cada resubmissão do modal. Só chama
   * a InfinitePay quando realmente precisa de um link novo.
   */
  private async ensureCheckout(leadId: string) {
    const existing = await this._repo.findLatestCheckoutForLead(leadId);

    if (
      existing &&
      (existing.status === ReligareCheckoutStatus.PAID ||
        existing.status === ReligareCheckoutStatus.PROCESSING ||
        (existing.status === ReligareCheckoutStatus.PENDING && existing.checkoutUrl))
    ) {
      return existing;
    }

    const checkout =
      existing ??
      (await this._repo.createCheckout({
        leadId,
        provider: 'infinitepay',
        providerReference: `RLG-${randomUUID()}`,
        amountCents: RELIGARE_MAPA_PRODUCT.totalCents,
        installments: RELIGARE_MAPA_PRODUCT.installments,
      }));

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const webhookToken = process.env.INFINITEPAY_WEBHOOK_TOKEN;
    const frontendUrl = process.env.FRONTEND_URL;
    if (!backendUrl || !webhookToken || !frontendUrl) {
      this.logger.error('religare_funnel_misconfigured: faltam envs obrigatórias');
      await this._repo.markCheckoutFailed(checkout.id);
      return { ...checkout, status: ReligareCheckoutStatus.FAILED, checkoutUrl: null };
    }

    const webhookUrl = `${backendUrl}/religare/infinitepay-webhook?token=${webhookToken}`;
    const redirectUrl = `${frontendUrl}${process.env.RELIGARE_CHECKOUT_REDIRECT_PATH || '/religare/obrigado'}`;

    // A InfinitePay chama webhook_url a partir dos servidores dela — se
    // NEXT_PUBLIC_BACKEND_URL/FRONTEND_URL ainda apontam pro default de dev
    // (localhost), isso nunca vai funcionar. Falha alto e cedo em vez de
    // registrar silenciosamente um webhook inalcançável.
    if (!isPublicHttpsUrl(webhookUrl) || !isPublicHttpsUrl(redirectUrl)) {
      this.logger.error(
        `religare_funnel_non_public_url webhookUrl_valid=${isPublicHttpsUrl(webhookUrl)} redirectUrl_valid=${isPublicHttpsUrl(redirectUrl)}`
      );
      await this._repo.markCheckoutFailed(checkout.id);
      return { ...checkout, status: ReligareCheckoutStatus.FAILED, checkoutUrl: null };
    }

    try {
      const { checkoutUrl } = await this._infinitePay.createPaymentLink({
        orderNsu: checkout.providerReference,
        amountCents: checkout.amountCents,
        installments: checkout.installments,
        productName: RELIGARE_MAPA_PRODUCT.name,
        webhookUrl,
        redirectUrl,
      });
      return await this._repo.updateCheckoutUrl(checkout.id, checkoutUrl);
    } catch (err) {
      this.logger.error(
        `religare_checkout_link_failed leadId=${leadId} checkoutId=${checkout.id}`,
        err instanceof Error ? err.message : err
      );
      return this._repo.markCheckoutFailed(checkout.id);
    }
  }

  /**
   * Processa o webhook da InfinitePay. Token já validado pelo controller
   * (comparação em tempo constante) antes de chamar este método.
   */
  async handleInfinitePayWebhook(body: {
    order_nsu?: unknown;
    transaction_nsu?: unknown;
    invoice_slug?: unknown;
  }): Promise<{ success: boolean; message: string | null }> {
    const orderNsu = typeof body.order_nsu === 'string' ? body.order_nsu : null;
    const transactionNsu =
      typeof body.transaction_nsu === 'string' ? body.transaction_nsu : null;
    const invoiceSlug = typeof body.invoice_slug === 'string' ? body.invoice_slug : null;

    if (!orderNsu || !transactionNsu) {
      return { success: false, message: 'invalid_payload' };
    }

    // 1) Grava o evento ANTES de processar — idempotência por providerEventId
    // = transaction_nsu (confirmado na doc oficial da InfinitePay como "ID
    // único da transação"; não existe campo de event id separado — ver
    // docs/religare/funil-fundacao.md).
    const event = await this._repo.insertCheckoutEventIfNew({
      providerEventId: transactionNsu,
      eventType: 'payment_webhook',
      // Prisma.InputJsonValue não aceita `unknown` recursivamente — mesmo
      // padrão já usado em religare.service.ts (astrology/dna/humanDesign).
      payload: body as unknown as Prisma.InputJsonValue,
    });

    if (!event) {
      // Já processado antes — replay idempotente, não reprocessa.
      return { success: true, message: null };
    }

    try {
      const checkout = await this._repo.findCheckoutByProviderReference(orderNsu);
      if (!checkout) {
        this.logger.error(`religare_webhook_unknown_order order_nsu=${orderNsu}`);
        return { success: false, message: 'unknown_order' };
      }

      await this._repo.linkEventToCheckout(event.id, checkout.id);

      if (checkout.status === ReligareCheckoutStatus.PAID) {
        await this._repo.markEventProcessed(event.id);
        return { success: true, message: null };
      }

      // 2) Reconciliação ativa — nunca confia no valor/status do payload recebido.
      const check = await this._infinitePay.checkPayment({
        orderNsu,
        transactionNsu,
        invoiceSlug,
      });

      if (!check.paid) {
        await this._repo.markEventProcessed(event.id);
        return { success: true, message: null };
      }

      if (check.paidAmountCents !== checkout.amountCents) {
        this.logger.error(
          `religare_webhook_amount_mismatch checkoutId=${checkout.id} expected=${checkout.amountCents} got=${check.paidAmountCents}`
        );
        return { success: false, message: 'amount_mismatch' };
      }

      // 3) Confirmado pela própria InfinitePay — só agora marca como pago.
      await this._repo.markCheckoutPaid(checkout.id);
      await this._repo.markEventProcessed(event.id);

      // TODO(religare-funil): criar ServiceRequest aqui após status PAID
      // confirmado. Depende de mapear Religare -> ServiceOffering (domínio
      // do Ateliê Virtual), decisão de produto ainda não tomada.

      return { success: true, message: null };
    } catch (err) {
      this.logger.error(
        'religare_webhook_processing_failed',
        err instanceof Error ? err.message : err
      );
      return { success: false, message: 'server_error' };
    }
  }
}
