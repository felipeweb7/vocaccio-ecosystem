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

  markCheckoutPaid(id: string) {
    return this._db.model.religareCheckout.update({
      where: { id },
      data: { status: ReligareCheckoutStatus.PAID, paidAt: new Date() },
    });
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
