import { ReligareFunnelService } from './religare-funnel.service';

/**
 * Executado de verdade neste worktree (node_modules instalado, jest com
 * heap ampliado + isolatedModules — ver docs/religare/funil-fundacao.md,
 * seção 8, pra evidência da última rodada e o comando exato).
 */

/**
 * Stub de EmailService pros testes que não exercitam o caminho de
 * confirmação de pagamento (e por isso nunca chamam sendEmailSync) — evita
 * repetir `{ sendEmailSync: jest.fn() }` em todo `makeService` que não
 * precisa dele. Testes que PRECISAM inspecionar a chamada de e-mail montam
 * o próprio mock (ver `handleInfinitePayWebhook`/`confirmCheckoutPaid`
 * abaixo).
 */
const EMAIL_SERVICE_STUB = { sendEmailSync: jest.fn().mockResolvedValue(undefined) };
describe('ReligareFunnelService.handleInfinitePayWebhook', () => {
  const CHECKOUT_ID = 'checkout-1';
  const EVENT_ID = 'event-1';
  const ORDER_NSU = 'RLG-abc123';
  const TRANSACTION_NSU = 'txn-999';
  const AMOUNT_CENTS = 47_640;

  function makeCheckout(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: CHECKOUT_ID,
      leadId: 'lead-1',
      provider: 'infinitepay',
      providerReference: ORDER_NSU,
      amountCents: AMOUNT_CENTS,
      installments: 12,
      status: 'PENDING',
      checkoutUrl: 'https://checkout.infinitepay.io/xyz',
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  const LEAD_EMAIL = 'lead@example.com';

  function makeService(overrides: {
    insertCheckoutEventIfNew?: jest.Mock;
    findCheckoutByProviderReference?: jest.Mock;
    checkPayment?: jest.Mock;
  }) {
    const repo = {
      insertCheckoutEventIfNew:
        overrides.insertCheckoutEventIfNew ??
        jest.fn().mockResolvedValue({ id: EVENT_ID }),
      findCheckoutByProviderReference:
        overrides.findCheckoutByProviderReference ??
        jest.fn().mockResolvedValue(makeCheckout()),
      linkEventToCheckout: jest.fn().mockResolvedValue(undefined),
      markEventProcessed: jest.fn().mockResolvedValue(undefined),
      markCheckoutPaid: jest.fn().mockResolvedValue({
        id: CHECKOUT_ID,
        lead: { email: LEAD_EMAIL, fullName: 'Lead Teste' },
      }),
    };
    const infinitePay = {
      checkPayment:
        overrides.checkPayment ??
        jest.fn().mockResolvedValue({ paid: true, paidAmountCents: AMOUNT_CENTS }),
    };
    const emailService = { sendEmailSync: jest.fn().mockResolvedValue(undefined) };
    const service = new ReligareFunnelService(
      repo as any,
      {} as any,
      infinitePay as any,
      emailService as any
    );
    return { service, repo, infinitePay, emailService };
  }

  it('sucesso: valor confere -> marca PAID, dispara e-mail e responde success:true', async () => {
    const { service, repo, infinitePay, emailService } = makeService({});

    const result = await service.handleInfinitePayWebhook({
      order_nsu: ORDER_NSU,
      transaction_nsu: TRANSACTION_NSU,
      invoice_slug: 'slug-1',
    });

    expect(infinitePay.checkPayment).toHaveBeenCalledWith({
      orderNsu: ORDER_NSU,
      transactionNsu: TRANSACTION_NSU,
      invoiceSlug: 'slug-1',
    });
    expect(repo.markCheckoutPaid).toHaveBeenCalledWith(CHECKOUT_ID);
    expect(repo.markEventProcessed).toHaveBeenCalledWith(EVENT_ID);
    // Ponto único de disparo (confirmCheckoutPaid) -- webhook automático
    // também dispara o e-mail de confirmação, igual ao caminho manual.
    expect(emailService.sendEmailSync).toHaveBeenCalledWith(
      LEAD_EMAIL,
      expect.any(String),
      expect.any(String)
    );
    expect(result).toEqual({ success: true, message: null });
  });

  it('replay: providerEventId repetido -> não reprocessa, não chama payment_check', async () => {
    const { service, repo, infinitePay } = makeService({
      insertCheckoutEventIfNew: jest.fn().mockResolvedValue(null), // conflito -> já existia
    });

    const result = await service.handleInfinitePayWebhook({
      order_nsu: ORDER_NSU,
      transaction_nsu: TRANSACTION_NSU,
      invoice_slug: 'slug-1',
    });

    expect(infinitePay.checkPayment).not.toHaveBeenCalled();
    expect(repo.markCheckoutPaid).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, message: null });
  });

  it('valor incorreto: payment_check confirma paid mas valor não bate -> NUNCA marca PAID', async () => {
    const { service, repo } = makeService({
      checkPayment: jest
        .fn()
        .mockResolvedValue({ paid: true, paidAmountCents: 1_000 }), // != AMOUNT_CENTS
    });

    const result = await service.handleInfinitePayWebhook({
      order_nsu: ORDER_NSU,
      transaction_nsu: TRANSACTION_NSU,
      invoice_slug: 'slug-1',
    });

    expect(repo.markCheckoutPaid).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, message: 'amount_mismatch' });
  });

  it('order_nsu desconhecido: nunca confia em checkoutId do payload, não chama payment_check', async () => {
    const { service, repo, infinitePay } = makeService({
      findCheckoutByProviderReference: jest.fn().mockResolvedValue(null),
    });

    const result = await service.handleInfinitePayWebhook({
      order_nsu: 'nao-existe',
      transaction_nsu: TRANSACTION_NSU,
      invoice_slug: null,
    });

    expect(infinitePay.checkPayment).not.toHaveBeenCalled();
    expect(repo.markCheckoutPaid).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, message: 'unknown_order' });
  });
});

const ORIGINAL_ENV = process.env;

describe('ReligareFunnelService.captureLead — passo 1 (startLead, DRAFT)', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, RELIGARE_PROD_ORG_ID: 'vocaccio-org-seed' };
  });
  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  function makeService(repoOverrides: Record<string, jest.Mock> = {}) {
    const repo = {
      countRecentDraftsForOrg: jest.fn().mockResolvedValue(0),
      createDraftLead: jest.fn().mockResolvedValue({
        id: 'lead-1',
        status: 'DRAFT',
        profileId: null,
        fullName: null,
        email: null,
        whatsapp: null,
        birthDate: new Date('1990-05-10T00:00:00Z'),
        birthTime: '14:30',
        birthPlace: 'São Paulo',
        source: null,
      }),
      ...repoOverrides,
    };
    const service = new ReligareFunnelService(
      repo as any,
      {} as any,
      {} as any,
      EMAIL_SERVICE_STUB as any
    );
    return { service, repo };
  }

  it('cria lead DRAFT sem email/whatsapp quando nascimento + consentVersion estão completos', async () => {
    const { service, repo } = makeService();

    const result = await service.captureLead({
      birthDate: '1990-05-10',
      birthTime: '14:30',
      birthPlace: 'São Paulo',
      consentVersion: 'v1',
    } as any);

    expect(repo.createDraftLead).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'vocaccio-org-seed',
        birthDate: '1990-05-10',
        birthTime: '14:30',
        birthPlace: 'São Paulo',
        consentVersion: 'v1',
      })
    );
    // Passo 1 nunca gera checkout — isso só acontece no passo 2.
    expect(result).toEqual({ leadId: 'lead-1', checkoutId: null, checkoutUrl: null });
  });

  it('rejeita passo 1 sem birthDate/birthTime/birthPlace/consentVersion', async () => {
    const { service, repo } = makeService();

    await expect(
      service.captureLead({ consentVersion: 'v1' } as any)
    ).rejects.toThrow();
    expect(repo.createDraftLead).not.toHaveBeenCalled();
  });
});

describe('ReligareFunnelService.captureLead — passo 2 (completeLead, por leadId)', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, RELIGARE_PROD_ORG_ID: 'vocaccio-org-seed' };
  });
  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  const EXISTING_DRAFT = {
    id: 'lead-1',
    status: 'DRAFT',
    profileId: null,
    fullName: null,
    email: null,
    whatsapp: null,
    birthDate: new Date('1990-05-10T00:00:00Z'),
    birthTime: '14:30',
    birthPlace: 'São Paulo',
    source: null,
  };

  it('completa o lead por (id=leadId, orgId=servidor) — nunca por email/whatsapp', async () => {
    const repo = {
      findLeadById: jest.fn().mockResolvedValue(EXISTING_DRAFT),
      updateLead: jest.fn().mockResolvedValue({
        ...EXISTING_DRAFT,
        email: 'lead@example.com',
      }),
      markLeadNew: jest.fn().mockResolvedValue(undefined),
      findLatestCheckoutForLead: jest.fn().mockResolvedValue({
        id: 'checkout-1',
        status: 'PAID',
        checkoutUrl: 'https://checkout.infinitepay.io/xyz',
        providerReference: 'RLG-x',
        amountCents: 47_640,
        installments: 12,
      }),
    };
    const service = new ReligareFunnelService(
      repo as any,
      {} as any,
      {} as any,
      EMAIL_SERVICE_STUB as any
    );

    const result = await service.captureLead({
      leadId: 'lead-1',
      email: 'lead@example.com',
    } as any);

    expect(repo.findLeadById).toHaveBeenCalledWith('lead-1', 'vocaccio-org-seed');
    // Sem fullName ainda -> vira NEW, não QUALIFIED (profile não é criado).
    expect(repo.markLeadNew).toHaveBeenCalledWith('lead-1');
    expect(result.leadId).toBe('lead-1');
    expect(result.checkoutId).toBe('checkout-1');
  });

  it('leadId que não pertence à org do servidor (ou não existe) -> erro genérico, sem vazar detalhe', async () => {
    const repo = { findLeadById: jest.fn().mockResolvedValue(null) };
    const service = new ReligareFunnelService(
      repo as any,
      {} as any,
      {} as any,
      EMAIL_SERVICE_STUB as any
    );

    await expect(
      service.captureLead({ leadId: 'lead-de-outra-org', email: 'a@b.com' } as any)
    ).rejects.toThrow();
  });

  it('rejeita passo 2 sem email nem whatsapp — nem chega a consultar o banco', async () => {
    const repo = { findLeadById: jest.fn() };
    const service = new ReligareFunnelService(
      repo as any,
      {} as any,
      {} as any,
      EMAIL_SERVICE_STUB as any
    );

    await expect(service.captureLead({ leadId: 'lead-1' } as any)).rejects.toThrow();
    expect(repo.findLeadById).not.toHaveBeenCalled();
  });
});

describe('ReligareFunnelService — RELIGARE_PROD_ORG_ID fail-closed', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.RELIGARE_PROD_ORG_ID;
  });
  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('sem RELIGARE_PROD_ORG_ID -> recusa processar, NUNCA usa vocaccio-org-seed como default', async () => {
    const repo = { countRecentDraftsForOrg: jest.fn(), createDraftLead: jest.fn() };
    const service = new ReligareFunnelService(
      repo as any,
      {} as any,
      {} as any,
      EMAIL_SERVICE_STUB as any
    );

    await expect(
      service.captureLead({
        birthDate: '1990-05-10',
        birthTime: '14:30',
        birthPlace: 'São Paulo',
        consentVersion: 'v1',
      } as any)
    ).rejects.toThrow('religare_funnel_misconfigured');
    expect(repo.createDraftLead).not.toHaveBeenCalled();
  });
});

describe('ReligareFunnelService.captureLead — URL pública (guard do passo 2)', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, RELIGARE_PROD_ORG_ID: 'vocaccio-org-seed' };
  });
  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('nunca chama a InfinitePay se webhook_url/redirect_url apontam pra localhost', async () => {
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:3000'; // default de dev, não público
    process.env.FRONTEND_URL = 'http://localhost:4200';
    process.env.INFINITEPAY_WEBHOOK_TOKEN = 'test-token';

    const existingLead = {
      id: 'lead-1',
      status: 'DRAFT',
      profileId: null,
      fullName: null,
      email: null,
      whatsapp: null,
      birthDate: new Date('1990-05-10T00:00:00Z'),
      birthTime: '14:30',
      birthPlace: 'São Paulo',
      source: null,
    };
    const repo = {
      findLeadById: jest.fn().mockResolvedValue(existingLead),
      updateLead: jest.fn().mockResolvedValue({ ...existingLead, email: 'teste@example.com' }),
      markLeadNew: jest.fn().mockResolvedValue(undefined),
      findLatestCheckoutForLead: jest.fn().mockResolvedValue(null),
      createCheckout: jest.fn().mockResolvedValue({
        id: 'checkout-1',
        leadId: 'lead-1',
        provider: 'infinitepay',
        providerReference: 'RLG-test',
        amountCents: 47_640,
        installments: 12,
        status: 'PENDING',
        checkoutUrl: null,
      }),
      markCheckoutFailed: jest.fn().mockResolvedValue(undefined),
    };
    const infinitePay = { createPaymentLink: jest.fn() };
    const service = new ReligareFunnelService(
      repo as any,
      {} as any,
      infinitePay as any,
      EMAIL_SERVICE_STUB as any
    );

    const result = await service.captureLead({
      leadId: 'lead-1',
      email: 'teste@example.com',
    } as any);

    expect(infinitePay.createPaymentLink).not.toHaveBeenCalled();
    expect(repo.markCheckoutFailed).toHaveBeenCalledWith('checkout-1');
    expect(result.checkoutUrl).toBeNull();
  });
});

/**
 * Painel admin (docs/religare/funil-fundacao.md, seção 8, 6ª rodada):
 * verificação manual de pagamento e marcação manual como pago. Ambas passam
 * pelo mesmo `confirmCheckoutPaid` que o webhook -- por isso reaproveitam a
 * asserção de e-mail em vez de reimplementar a lógica de disparo.
 */
describe('ReligareFunnelService — admin: verifyCheckoutPayment / markCheckoutPaidManually', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, RELIGARE_PROD_ORG_ID: 'vocaccio-org-seed' };
  });
  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  const CHECKOUT = {
    id: 'checkout-9',
    providerReference: 'RLG-admin-test',
    amountCents: 47_640,
    status: 'PENDING',
    lead: { id: 'lead-9', orgId: 'vocaccio-org-seed', email: 'admin-lead@example.com', fullName: 'Admin Lead', whatsapp: null },
  };

  function makeService(repoOverrides: Record<string, jest.Mock> = {}) {
    const emailService = { sendEmailSync: jest.fn().mockResolvedValue(undefined) };
    const infinitePay = { checkPayment: jest.fn() };
    const repo = {
      findCheckoutById: jest.fn().mockResolvedValue(CHECKOUT),
      findLatestEventForCheckout: jest.fn().mockResolvedValue(null),
      markCheckoutManuallyPaid: jest.fn().mockResolvedValue({
        id: CHECKOUT.id,
        lead: { email: CHECKOUT.lead.email, fullName: CHECKOUT.lead.fullName },
      }),
      markCheckoutPaid: jest.fn().mockResolvedValue({
        id: CHECKOUT.id,
        lead: { email: CHECKOUT.lead.email, fullName: CHECKOUT.lead.fullName },
      }),
      ...repoOverrides,
    };
    const service = new ReligareFunnelService(
      repo as any,
      {} as any,
      infinitePay as any,
      emailService as any
    );
    return { service, repo, infinitePay, emailService };
  }

  it('markCheckoutPaidManually: usa manualPaidAt/manualPaidByUserId, nunca chama a InfinitePay, dispara e-mail', async () => {
    const { service, repo, infinitePay, emailService } = makeService();

    const result = await service.markCheckoutPaidManually(CHECKOUT.id, 'admin-user-1');

    expect(repo.findCheckoutById).toHaveBeenCalledWith(CHECKOUT.id, 'vocaccio-org-seed');
    expect(repo.markCheckoutManuallyPaid).toHaveBeenCalledWith(CHECKOUT.id, 'admin-user-1');
    expect(infinitePay.checkPayment).not.toHaveBeenCalled();
    expect(emailService.sendEmailSync).toHaveBeenCalledWith(
      CHECKOUT.lead.email,
      expect.any(String),
      expect.any(String)
    );
    expect(result.id).toBe(CHECKOUT.id);
  });

  it('markCheckoutPaidManually: checkout já PAID -> idempotente, não reprocessa nem reenvia e-mail', async () => {
    const { service, repo, emailService } = makeService({
      findCheckoutById: jest.fn().mockResolvedValue({ ...CHECKOUT, status: 'PAID' }),
    });

    await service.markCheckoutPaidManually(CHECKOUT.id, 'admin-user-1');

    expect(repo.markCheckoutManuallyPaid).not.toHaveBeenCalled();
    expect(emailService.sendEmailSync).not.toHaveBeenCalled();
  });

  it('verifyCheckoutPayment: sem ReligareCheckoutEvent ainda -> recusa (gap conhecido), não inventa transaction_nsu', async () => {
    const { service, infinitePay } = makeService({
      findLatestEventForCheckout: jest.fn().mockResolvedValue(null),
    });

    await expect(service.verifyCheckoutPayment(CHECKOUT.id)).rejects.toThrow(
      'no_webhook_event_to_reconcile'
    );
    expect(infinitePay.checkPayment).not.toHaveBeenCalled();
  });

  it('verifyCheckoutPayment: evento presente, InfinitePay confirma valor -> marca PAID (paidAt, não manualPaidAt) e dispara e-mail', async () => {
    const { service, repo, infinitePay, emailService } = makeService({
      findLatestEventForCheckout: jest.fn().mockResolvedValue({
        payload: { transaction_nsu: 'txn-admin-1', invoice_slug: 'slug-admin-1' },
      }),
    });
    infinitePay.checkPayment.mockResolvedValue({ paid: true, paidAmountCents: CHECKOUT.amountCents });

    const result = await service.verifyCheckoutPayment(CHECKOUT.id);

    expect(infinitePay.checkPayment).toHaveBeenCalledWith({
      orderNsu: CHECKOUT.providerReference,
      transactionNsu: 'txn-admin-1',
      invoiceSlug: 'slug-admin-1',
    });
    expect(repo.markCheckoutPaid).toHaveBeenCalledWith(CHECKOUT.id);
    expect(repo.markCheckoutManuallyPaid).not.toHaveBeenCalled();
    expect(emailService.sendEmailSync).toHaveBeenCalled();
    expect(result.status).toBe('paid');
  });
});
