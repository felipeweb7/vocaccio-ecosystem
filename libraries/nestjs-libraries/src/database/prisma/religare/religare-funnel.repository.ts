import { Injectable } from '@nestjs/common';
import { Prisma, ReligareCheckoutStatus, ReligareLeadStatus } from '@prisma/client';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

const LEAD_SELECT = {
  id: true,
  status: true,
  profileId: true,
  fullName: true,
  email: true,
  whatsapp: true,
  birthDate: true,
  birthTime: true,
  birthPlace: true,
  source: true,
} as const;

/** Só o necessário pro e-mail de confirmação de pagamento (ver `sendPaidConfirmationEmail` no service). */
const CHECKOUT_LEAD_CONTACT_INCLUDE = {
  lead: { select: { email: true, fullName: true } },
} as const;

const ADMIN_LEAD_LIST_SELECT = {
  id: true,
  status: true,
  email: true,
  whatsapp: true,
  fullName: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ADMIN_CHECKOUT_LIST_SELECT = {
  id: true,
  status: true,
  provider: true,
  providerReference: true,
  amountCents: true,
  installments: true,
  checkoutUrl: true,
  paidAt: true,
  manualPaidAt: true,
  manualPaidByUserId: true,
  createdAt: true,
  updatedAt: true,
  lead: {
    select: { id: true, email: true, whatsapp: true, fullName: true },
  },
} as const;

function paginationParams(params: { page?: number; limit?: number }) {
  const page = Math.max(0, params.page || 0);
  const limit = Math.min(Math.max(1, params.limit || 20), 100);
  return { page, limit, skip: page * limit };
}

@Injectable()
export class ReligareFunnelRepository {
  constructor(
    private _db: PrismaRepository<
      'religareLead' | 'religareCheckout' | 'religareCheckoutEvent'
    >
  ) {}

  /**
   * Único jeito de localizar um lead pro passo 2 — sempre por id + orgId do
   * servidor. Nunca por email/whatsapp (não há mais dedup por contato: cada
   * passo 1 gera um lead DRAFT novo; o passo 2 sempre referencia um leadId
   * específico).
   */
  findLeadById(id: string, orgId: string) {
    return this._db.model.religareLead.findFirst({
      where: { id, orgId },
      select: LEAD_SELECT,
    });
  }

  /** Passo 1: cria um lead DRAFT com nascimento + consentimento, sem contato. */
  createDraftLead(data: {
    orgId: string;
    birthDate: string;
    birthTime: string;
    birthPlace: string;
    consentVersion: string;
    source: string | null;
  }) {
    return this._db.model.religareLead.create({
      data: {
        orgId: data.orgId,
        birthDate: new Date(data.birthDate),
        birthTime: data.birthTime,
        birthPlace: data.birthPlace,
        consentVersion: data.consentVersion,
        consentedAt: new Date(),
        source: data.source,
        status: ReligareLeadStatus.DRAFT,
      },
      select: LEAD_SELECT,
    });
  }

  /** Passo 2: completa o lead já existente com contato (e opcionalmente mais dados). */
  updateLead(
    id: string,
    data: {
      fullName: string | null;
      email: string | null;
      whatsapp: string | null;
      birthDate: string | null;
      birthTime: string | null;
      birthPlace: string | null;
      consentVersion: string | null;
      source: string | null;
    }
  ) {
    return this._db.model.religareLead.update({
      where: { id },
      data: {
        fullName: data.fullName,
        email: data.email,
        whatsapp: data.whatsapp,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        birthTime: data.birthTime ?? undefined,
        birthPlace: data.birthPlace ?? undefined,
        ...(data.consentVersion
          ? { consentVersion: data.consentVersion, consentedAt: new Date() }
          : {}),
        source: data.source,
      },
      select: LEAD_SELECT,
    });
  }

  /** Tem contato mas ainda não virou ReligareProfile. Nunca chamar se já QUALIFIED+. */
  markLeadNew(id: string) {
    return this._db.model.religareLead.update({
      where: { id },
      data: { status: ReligareLeadStatus.NEW },
      select: { id: true },
    });
  }

  linkLeadToProfile(id: string, profileId: string) {
    return this._db.model.religareLead.update({
      where: { id },
      data: { profileId, status: ReligareLeadStatus.QUALIFIED },
      select: { id: true },
    });
  }

  /** Checkout mais recente do lead — usado pra decidir se cria um novo ou reaproveita um pendente. */
  findLatestCheckoutForLead(leadId: string) {
    return this._db.model.religareCheckout.findFirst({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createCheckout(data: {
    leadId: string;
    provider: string;
    providerReference: string;
    amountCents: number;
    installments: number;
  }) {
    return this._db.model.religareCheckout.create({
      data: {
        leadId: data.leadId,
        provider: data.provider,
        providerReference: data.providerReference,
        amountCents: data.amountCents,
        installments: data.installments,
        status: ReligareCheckoutStatus.PENDING,
      },
    });
  }

  updateCheckoutUrl(id: string, checkoutUrl: string) {
    return this._db.model.religareCheckout.update({
      where: { id },
      data: { checkoutUrl },
    });
  }

  markCheckoutFailed(id: string) {
    return this._db.model.religareCheckout.update({
      where: { id },
      data: { status: ReligareCheckoutStatus.FAILED },
    });
  }

  findCheckoutByProviderReference(providerReference: string) {
    return this._db.model.religareCheckout.findUnique({
      where: { providerReference },
    });
  }

  /**
   * Caminho automático (webhook) OU verificação manual disparada pelo admin
   * mas CONFIRMADA pela InfinitePay (`payment_check`) — por isso usa `paidAt`,
   * nunca `manualPaidAt` (esse é reservado pro admin confiar sem reconciliar,
   * ver `markCheckoutManuallyPaid`). Inclui o e-mail/nome do lead pra
   * `ReligareFunnelService.sendPaidConfirmationEmail` disparar o e-mail sem
   * uma segunda query.
   */
  markCheckoutPaid(id: string) {
    return this._db.model.religareCheckout.update({
      where: { id },
      data: { status: ReligareCheckoutStatus.PAID, paidAt: new Date() },
      include: CHECKOUT_LEAD_CONTACT_INCLUDE,
    });
  }

  /**
   * Admin confia no pagamento sem reconciliar contra a InfinitePay — por
   * isso `manualPaidAt`/`manualPaidByUserId`, nunca `paidAt` (ver comentário
   * do campo no schema.prisma).
   */
  markCheckoutManuallyPaid(id: string, adminUserId: string) {
    return this._db.model.religareCheckout.update({
      where: { id },
      data: {
        status: ReligareCheckoutStatus.PAID,
        manualPaidAt: new Date(),
        manualPaidByUserId: adminUserId,
      },
      include: CHECKOUT_LEAD_CONTACT_INCLUDE,
    });
  }

  /**
   * Busca por (id, orgId-do-lead) — mesma disciplina de `findLeadById`, nunca
   * por id isolado, pra um admin de uma org nunca alcançar checkout de outra
   * (hoje só existe a org de produção, mas a query já nasce correta).
   */
  findCheckoutById(id: string, orgId: string) {
    return this._db.model.religareCheckout.findFirst({
      where: { id, lead: { orgId } },
      include: {
        lead: {
          select: { id: true, orgId: true, email: true, fullName: true, whatsapp: true },
        },
      },
    });
  }

  /**
   * Evento mais recente do checkout — é dali que a verificação manual de
   * admin tira `transaction_nsu`/`invoice_slug` pra chamar `payment_check`
   * (esses campos nunca foram persistidos fora do payload bruto do webhook,
   * ver docs/religare/funil-fundacao.md). Se nenhum webhook chegou ainda,
   * retorna null — o service trata isso como gap conhecido, não inventa valor.
   */
  findLatestEventForCheckout(checkoutId: string) {
    return this._db.model.religareCheckoutEvent.findFirst({
      where: { checkoutId },
      orderBy: { receivedAt: 'desc' },
    });
  }

  /** Admin: lista leads da org paginada, com status/contato pra dar contexto no painel. */
  async listLeadsPaginated(
    orgId: string,
    params: { page?: number; limit?: number; status?: ReligareLeadStatus; email?: string }
  ) {
    const { page, limit, skip } = paginationParams(params);
    const where: Prisma.ReligareLeadWhereInput = { orgId };
    if (params.status) where.status = params.status;
    if (params.email) where.email = { contains: params.email, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this._db.model.religareLead.findMany({
        where,
        select: ADMIN_LEAD_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this._db.model.religareLead.count({ where }),
    ]);

    return { items, total, page, limit, hasMore: skip + items.length < total };
  }

  /** Admin: lista checkouts da org paginada, com email/whatsapp/fullName do lead já embutidos. */
  async listCheckoutsPaginated(
    orgId: string,
    params: { page?: number; limit?: number; status?: ReligareCheckoutStatus }
  ) {
    const { page, limit, skip } = paginationParams(params);
    const where: Prisma.ReligareCheckoutWhereInput = { lead: { orgId } };
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this._db.model.religareCheckout.findMany({
        where,
        select: ADMIN_CHECKOUT_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this._db.model.religareCheckout.count({ where }),
    ]);

    return { items, total, page, limit, hasMore: skip + items.length < total };
  }

  /**
   * Grava o evento ANTES de processar. Retorna null se já existia (conflito
   * de providerEventId) — idempotência de webhook, sem reprocessar.
   */
  async insertCheckoutEventIfNew(data: {
    providerEventId: string;
    eventType: string;
    payload: Prisma.InputJsonValue;
  }) {
    try {
      return await this._db.model.religareCheckoutEvent.create({ data });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return null;
      }
      throw err;
    }
  }

  linkEventToCheckout(eventId: string, checkoutId: string) {
    return this._db.model.religareCheckoutEvent.update({
      where: { id: eventId },
      data: { checkoutId },
    });
  }

  markEventProcessed(eventId: string) {
    return this._db.model.religareCheckoutEvent.update({
      where: { id: eventId },
      data: { processedAt: new Date() },
    });
  }

  countRecentDraftsForOrg(orgId: string, sinceMs: number) {
    return this._db.model.religareLead.count({
      where: { orgId, createdAt: { gte: new Date(Date.now() - sinceMs) } },
    });
  }
}
