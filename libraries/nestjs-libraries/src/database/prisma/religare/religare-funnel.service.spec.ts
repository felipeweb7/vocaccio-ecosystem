import { ReligareFunnelService, WEBHOOK_REPROCESS_MAX_AGE_MS } from './religare-funnel.service';

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

  const PAID_CHECKOUT_WITH_LEAD = {
    id: CHECKOUT_ID,
    lead: { email: LEAD_EMAIL, fullName: 'Lead Teste' },
  };

  function makeService(overrides: {
    insertCheckoutEventIfNew?: jest.Mock;
    findCheckoutEventByProviderEventId?: jest.Mock;
    findCheckoutByProviderReference?: jest.Mock;
    checkPayment?: jest.Mock;
    markCheckoutPaid?: jest.Mock;
  }) {
    const repo = {
      insertCheckoutEventIfNew:
        overrides.insertCheckoutEventIfNew ??
        jest.fn().mockResolvedValue({ id: EVENT_ID, processedAt: null }),
      findCheckoutEventByProviderEventId:
        overrides.findCheckoutEventByProviderEventId ?? jest.fn().mockResolvedValue(null),
      findCheckoutByProviderReference:
        overrides.findCheckoutByProviderReference ??
        jest.fn().mockResolvedValue(makeCheckout()),
      linkEventToCheckout: jest.fn().mockResolvedValue(undefined),
      markEventProcessed: jest.fn().mockResolvedValue(undefined),
      markCheckoutPaid:
        overrides.markCheckoutPaid ??
        jest.fn().mockResolvedValue({ transitioned: true, checkout: PAID_CHECKOUT_WITH_LEAD }),
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
    const loggerError = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    return { service, repo, infinitePay, emailService, loggerError };
  }

  /**
   * Simula a linha de `ReligareCheckoutEvent` entre entregas: o 1º insert cria,
   * os seguintes caem em conflito (null) e a busca devolve o estado atual.
   */
  function makeEventStore(receivedAt: Date = new Date()) {
    let stored: { id: string; processedAt: Date | null; receivedAt: Date } | null = null;
    return {
      insertCheckoutEventIfNew: jest.fn().mockImplementation(async () => {
        if (stored) return null;
        stored = { id: EVENT_ID, processedAt: null, receivedAt };
        return stored;
      }),
      findCheckoutEventByProviderEventId: jest.fn().mockImplementation(async () => stored),
      markEventProcessedImpl: async () => {
        if (stored) stored = { ...stored, processedAt: new Date() };
      },
    };
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

  describe('e-mail de confirmação: nome do lead é escapado no HTML', () => {
    function serviceWithLeadName(fullName: string | null) {
      return makeService({
        markCheckoutPaid: jest.fn().mockResolvedValue({
          transitioned: true,
          checkout: { id: CHECKOUT_ID, lead: { email: LEAD_EMAIL, fullName } },
        }),
      });
    }
    const WEBHOOK_BODY = { order_nsu: ORDER_NSU, transaction_nsu: TRANSACTION_NSU, invoice_slug: 'slug-1' };

    it('nome hostil: <script> e <img onerror> viram texto inerte, nunca tag', async () => {
      const hostile = '<script>alert(1)</script>"><img src=x onerror=alert(2)>';
      const { service, emailService } = serviceWithLeadName(hostile);

      await service.handleInfinitePayWebhook(WEBHOOK_BODY);

      expect(emailService.sendEmailSync).toHaveBeenCalledTimes(1);
      const html = emailService.sendEmailSync.mock.calls[0][2] as string;
      expect(html).not.toContain('<script');
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;');
      // o resto do template continua íntegro
      expect(html.startsWith('<p>Olá, ')).toBe(true);
      expect(html).toContain('<strong>');
    });

    it('nome legítimo: acento preservado; & e apóstrofo escapados (nada de dupla escapada)', async () => {
      const { service, emailService } = serviceWithLeadName("José & Maria D'Ávila");

      await service.handleInfinitePayWebhook(WEBHOOK_BODY);

      const html = emailService.sendEmailSync.mock.calls[0][2] as string;
      expect(html).toContain('Olá, José &amp; Maria D&#39;Ávila!');
      expect(html).not.toContain('&amp;amp;');
    });

    it('sem nome: saudação genérica, sem "null" nem "undefined" no HTML', async () => {
      const { service, emailService } = serviceWithLeadName(null);

      await service.handleInfinitePayWebhook(WEBHOOK_BODY);

      const html = emailService.sendEmailSync.mock.calls[0][2] as string;
      expect(html.startsWith('<p>Olá!</p>')).toBe(true);
      expect(html).not.toMatch(/null|undefined/);
    });
  });

  const BODY = { order_nsu: ORDER_NSU, transaction_nsu: TRANSACTION_NSU, invoice_slug: 'slug-1' };

  it('(b) replay de evento JÁ processado -> idempotente, não chama payment_check de novo', async () => {
    const { service, repo, infinitePay, emailService } = makeService({
      insertCheckoutEventIfNew: jest.fn().mockResolvedValue(null), // conflito -> já existia
      findCheckoutEventByProviderEventId: jest
        .fn()
        .mockResolvedValue({ id: EVENT_ID, processedAt: new Date() }),
    });

    const result = await service.handleInfinitePayWebhook(BODY);

    expect(repo.findCheckoutEventByProviderEventId).toHaveBeenCalledWith(TRANSACTION_NSU);
    expect(infinitePay.checkPayment).not.toHaveBeenCalled();
    expect(repo.markCheckoutPaid).not.toHaveBeenCalled();
    expect(emailService.sendEmailSync).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, message: null });
  });

  it('(a) replay de evento NÃO processado (WH-01) -> reprocessa e confirma', async () => {
    const { service, repo, infinitePay, emailService } = makeService({
      insertCheckoutEventIfNew: jest.fn().mockResolvedValue(null),
      findCheckoutEventByProviderEventId: jest
        .fn()
        .mockResolvedValue({ id: EVENT_ID, processedAt: null }),
    });

    const result = await service.handleInfinitePayWebhook(BODY);

    expect(infinitePay.checkPayment).toHaveBeenCalledTimes(1);
    expect(repo.markCheckoutPaid).toHaveBeenCalledWith(CHECKOUT_ID);
    expect(repo.markEventProcessed).toHaveBeenCalledWith(EVENT_ID);
    expect(emailService.sendEmailSync).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, message: null });
  });

  it('(c) payment_check lança -> evento fica NÃO processado; retentativa seguinte confirma', async () => {
    // Estado simulado do evento entre as duas entregas.
    let stored: { id: string; processedAt: Date | null } | null = null;
    const insertCheckoutEventIfNew = jest.fn().mockImplementation(async () => {
      if (stored) return null;
      stored = { id: EVENT_ID, processedAt: null };
      return stored;
    });
    const findCheckoutEventByProviderEventId = jest.fn().mockImplementation(async () => stored);
    const checkPayment = jest
      .fn()
      .mockRejectedValueOnce(new Error('infinitepay_timeout'))
      .mockResolvedValueOnce({ paid: true, paidAmountCents: AMOUNT_CENTS });
    const { service, repo, emailService } = makeService({
      insertCheckoutEventIfNew,
      findCheckoutEventByProviderEventId,
      checkPayment,
    });
    repo.markEventProcessed.mockImplementation(async () => {
      stored = { id: EVENT_ID, processedAt: new Date() };
    });

    const first = await service.handleInfinitePayWebhook(BODY);
    expect(first).toEqual({ success: false, message: 'server_error' });
    expect(repo.markEventProcessed).not.toHaveBeenCalled();
    expect(repo.markCheckoutPaid).not.toHaveBeenCalled();

    const retry = await service.handleInfinitePayWebhook(BODY);
    expect(retry).toEqual({ success: true, message: null });
    expect(checkPayment).toHaveBeenCalledTimes(2);
    expect(repo.markCheckoutPaid).toHaveBeenCalledTimes(1);
    expect(repo.markEventProcessed).toHaveBeenCalledWith(EVENT_ID);
    expect(emailService.sendEmailSync).toHaveBeenCalledTimes(1);

    // Terceira entrega: agora sim é replay de evento processado.
    const replay = await service.handleInfinitePayWebhook(BODY);
    expect(replay).toEqual({ success: true, message: null });
    expect(checkPayment).toHaveBeenCalledTimes(2);
  });

  it('(d) valor incorreto: payment_check confirma paid mas valor não bate -> NUNCA marca PAID nem processado', async () => {
    const { service, repo, emailService } = makeService({
      checkPayment: jest
        .fn()
        .mockResolvedValue({ paid: true, paidAmountCents: 1_000 }), // != AMOUNT_CENTS
    });

    const result = await service.handleInfinitePayWebhook(BODY);

    expect(repo.markCheckoutPaid).not.toHaveBeenCalled();
    expect(repo.markEventProcessed).not.toHaveBeenCalled();
    expect(emailService.sendEmailSync).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, message: 'amount_mismatch' });
  });

  it('payment_check diz não pago -> não marca processado e pede retentativa (400)', async () => {
    const { service, repo } = makeService({
      checkPayment: jest.fn().mockResolvedValue({ paid: false, paidAmountCents: 0 }),
    });

    const result = await service.handleInfinitePayWebhook(BODY);

    expect(repo.markCheckoutPaid).not.toHaveBeenCalled();
    expect(repo.markEventProcessed).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, message: 'payment_not_confirmed' });
  });

  it('checkout já PAID -> decisão terminal: marca processado sem payment_check nem e-mail', async () => {
    const { service, repo, infinitePay, emailService } = makeService({
      findCheckoutByProviderReference: jest
        .fn()
        .mockResolvedValue(makeCheckout({ status: 'PAID' })),
    });

    const result = await service.handleInfinitePayWebhook(BODY);

    expect(infinitePay.checkPayment).not.toHaveBeenCalled();
    expect(repo.markEventProcessed).toHaveBeenCalledWith(EVENT_ID);
    expect(emailService.sendEmailSync).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, message: null });
  });

  it('(e) WH-05: dois eventos concorrentes pro mesmo checkout -> CAS deixa 1 transição, 1 e-mail só', async () => {
    const markCheckoutPaid = jest
      .fn()
      .mockResolvedValueOnce({ transitioned: true, checkout: PAID_CHECKOUT_WITH_LEAD })
      .mockResolvedValueOnce({ transitioned: false, checkout: PAID_CHECKOUT_WITH_LEAD });
    const insertCheckoutEventIfNew = jest
      .fn()
      .mockResolvedValueOnce({ id: 'event-a', processedAt: null })
      .mockResolvedValueOnce({ id: 'event-b', processedAt: null });
    const { service, repo, emailService } = makeService({
      markCheckoutPaid,
      insertCheckoutEventIfNew,
    });

    const [a, b] = await Promise.all([
      service.handleInfinitePayWebhook({ ...BODY, transaction_nsu: 'txn-a' }),
      service.handleInfinitePayWebhook({ ...BODY, transaction_nsu: 'txn-b' }),
    ]);

    expect(a).toEqual({ success: true, message: null });
    expect(b).toEqual({ success: true, message: null });
    expect(markCheckoutPaid).toHaveBeenCalledTimes(2);
    expect(emailService.sendEmailSync).toHaveBeenCalledTimes(1);
    // Os dois eventos têm decisão terminal correta -> ambos processados.
    expect(repo.markEventProcessed).toHaveBeenCalledWith('event-a');
    expect(repo.markEventProcessed).toHaveBeenCalledWith('event-b');
  });

  it('(e) WH-05: CAS com count 0 (outro gatilho confirmou antes) -> NÃO envia 2º e-mail', async () => {
    const { service, repo, emailService } = makeService({
      markCheckoutPaid: jest
        .fn()
        .mockResolvedValue({ transitioned: false, checkout: PAID_CHECKOUT_WITH_LEAD }),
    });

    const result = await service.handleInfinitePayWebhook(BODY);

    expect(emailService.sendEmailSync).not.toHaveBeenCalled();
    expect(repo.markEventProcessed).toHaveBeenCalledWith(EVENT_ID);
    expect(result).toEqual({ success: true, message: null });
  });

  it('order_nsu desconhecido: nunca confia em checkoutId do payload, não chama payment_check, não marca processado', async () => {
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
    expect(repo.markEventProcessed).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, message: 'unknown_order' });
  });

  it('(b) mesmo transaction_nsu em paralelo (2º cai em P2002, evento sem processedAt), CAS com estado compartilhado -> UM e-mail', async () => {
    // Estado compartilhado do checkout: o CAS do mock reproduz a semântica do
    // repository (só quem vê status != PAID faz a transição). Nada de
    // `mockResolvedValueOnce` com transitioned pré-fixado: quem ganha a corrida
    // é decidido pelo estado, não pelo roteiro do teste.
    let status = 'PENDING';
    const markCheckoutPaid = jest.fn().mockImplementation(async () => {
      const transitioned = status !== 'PAID';
      status = 'PAID';
      return { transitioned, checkout: PAID_CHECKOUT_WITH_LEAD };
    });
    const insertCheckoutEventIfNew = jest
      .fn()
      .mockResolvedValueOnce({ id: EVENT_ID, processedAt: null })
      .mockResolvedValueOnce(null); // P2002 -> repository devolve null
    const findCheckoutEventByProviderEventId = jest
      .fn()
      .mockResolvedValue({ id: EVENT_ID, processedAt: null });
    const { service, repo, infinitePay, emailService } = makeService({
      insertCheckoutEventIfNew,
      findCheckoutEventByProviderEventId,
      markCheckoutPaid,
    });

    const [a, b] = await Promise.all([
      service.handleInfinitePayWebhook(BODY),
      service.handleInfinitePayWebhook(BODY),
    ]);

    expect(a).toEqual({ success: true, message: null });
    expect(b).toEqual({ success: true, message: null });
    expect(infinitePay.checkPayment).toHaveBeenCalledTimes(2);
    expect(markCheckoutPaid).toHaveBeenCalledTimes(2);
    expect(emailService.sendEmailSync).toHaveBeenCalledTimes(1);
    expect(repo.markEventProcessed).toHaveBeenCalledTimes(2);
  });

  it('(c) conflito de insert mas a busca devolve null -> server_error SEM chamar payment_check', async () => {
    const { service, repo, infinitePay, emailService, loggerError } = makeService({
      insertCheckoutEventIfNew: jest.fn().mockResolvedValue(null),
      findCheckoutEventByProviderEventId: jest.fn().mockResolvedValue(null),
    });

    const result = await service.handleInfinitePayWebhook(BODY);

    expect(result).toEqual({ success: false, message: 'server_error' });
    expect(infinitePay.checkPayment).not.toHaveBeenCalled();
    expect(repo.markCheckoutPaid).not.toHaveBeenCalled();
    expect(repo.markEventProcessed).not.toHaveBeenCalled();
    expect(emailService.sendEmailSync).not.toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('religare_webhook_event_conflict_missing')
    );
  });

  describe('(d) resposta negativa seguida de sucesso na retentativa (estado corrigido)', () => {
    it('payment_not_confirmed -> 400; retentativa com pagamento confirmado confirma e marca processado', async () => {
      const store = makeEventStore();
      const checkPayment = jest
        .fn()
        .mockResolvedValueOnce({ paid: false, paidAmountCents: 0 })
        .mockResolvedValueOnce({ paid: true, paidAmountCents: AMOUNT_CENTS });
      const { service, repo, emailService } = makeService({ ...store, checkPayment });
      repo.markEventProcessed.mockImplementation(store.markEventProcessedImpl);

      const first = await service.handleInfinitePayWebhook(BODY);
      expect(first).toEqual({ success: false, message: 'payment_not_confirmed' });
      expect(repo.markEventProcessed).not.toHaveBeenCalled();
      expect(emailService.sendEmailSync).not.toHaveBeenCalled();

      const retry = await service.handleInfinitePayWebhook(BODY);
      expect(retry).toEqual({ success: true, message: null });
      expect(repo.markCheckoutPaid).toHaveBeenCalledTimes(1);
      expect(repo.markEventProcessed).toHaveBeenCalledWith(EVENT_ID);
      expect(emailService.sendEmailSync).toHaveBeenCalledTimes(1);
    });

    it('amount_mismatch -> 400; retentativa com valor correto confirma e marca processado', async () => {
      const store = makeEventStore();
      const checkPayment = jest
        .fn()
        .mockResolvedValueOnce({ paid: true, paidAmountCents: 1_000 })
        .mockResolvedValueOnce({ paid: true, paidAmountCents: AMOUNT_CENTS });
      const { service, repo, emailService } = makeService({ ...store, checkPayment });
      repo.markEventProcessed.mockImplementation(store.markEventProcessedImpl);

      const first = await service.handleInfinitePayWebhook(BODY);
      expect(first).toEqual({ success: false, message: 'amount_mismatch' });
      expect(repo.markCheckoutPaid).not.toHaveBeenCalled();
      expect(repo.markEventProcessed).not.toHaveBeenCalled();

      const retry = await service.handleInfinitePayWebhook(BODY);
      expect(retry).toEqual({ success: true, message: null });
      expect(repo.markCheckoutPaid).toHaveBeenCalledTimes(1);
      expect(repo.markEventProcessed).toHaveBeenCalledWith(EVENT_ID);
      expect(emailService.sendEmailSync).toHaveBeenCalledTimes(1);
    });

    it('unknown_order -> 400; retentativa com checkout já existente confirma e marca processado', async () => {
      const store = makeEventStore();
      const findCheckoutByProviderReference = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeCheckout());
      const { service, repo, infinitePay, emailService } = makeService({
        ...store,
        findCheckoutByProviderReference,
      });
      repo.markEventProcessed.mockImplementation(store.markEventProcessedImpl);

      const first = await service.handleInfinitePayWebhook(BODY);
      expect(first).toEqual({ success: false, message: 'unknown_order' });
      expect(infinitePay.checkPayment).not.toHaveBeenCalled();
      expect(repo.markEventProcessed).not.toHaveBeenCalled();

      const retry = await service.handleInfinitePayWebhook(BODY);
      expect(retry).toEqual({ success: true, message: null });
      expect(infinitePay.checkPayment).toHaveBeenCalledTimes(1);
      expect(repo.markCheckoutPaid).toHaveBeenCalledTimes(1);
      expect(repo.markEventProcessed).toHaveBeenCalledWith(EVENT_ID);
      expect(emailService.sendEmailSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('(e) teto de idade (WEBHOOK_REPROCESS_MAX_AGE_MS = 72h) em evento existente e não processado', () => {
    const HOUR_MS = 3_600_000;

    it(`teto exportado vale 72h`, () => {
      expect(WEBHOOK_REPROCESS_MAX_AGE_MS).toBe(72 * HOUR_MS);
    });

    it.each([
      [
        'payment_not_confirmed',
        { checkPayment: jest.fn().mockResolvedValue({ paid: false, paidAmountCents: 0 }) },
      ],
      [
        'amount_mismatch',
        { checkPayment: jest.fn().mockResolvedValue({ paid: true, paidAmountCents: 1_000 }) },
      ],
      ['unknown_order', { findCheckoutByProviderReference: jest.fn().mockResolvedValue(null) }],
    ])(
      'mais velho que o teto + %s -> marca processado, loga erro sem PII e responde 200',
      async (reason, overrides) => {
        const { service, repo, emailService, loggerError } = makeService({
          insertCheckoutEventIfNew: jest.fn().mockResolvedValue(null),
          findCheckoutEventByProviderEventId: jest.fn().mockResolvedValue({
            id: EVENT_ID,
            processedAt: null,
            receivedAt: new Date(Date.now() - 73 * HOUR_MS),
          }),
          ...overrides,
        });

        const result = await service.handleInfinitePayWebhook(BODY);

        expect(result).toEqual({ success: true, message: null });
        expect(repo.markEventProcessed).toHaveBeenCalledWith(EVENT_ID);
        expect(repo.markCheckoutPaid).not.toHaveBeenCalled();
        expect(emailService.sendEmailSync).not.toHaveBeenCalled();
        const staleLog = loggerError.mock.calls
          .map((c) => String(c[0]))
          .find((m) => m.includes(`religare_webhook_stale_${reason}`));
        expect(staleLog).toBeDefined();
        expect(staleLog).toContain('ageHours=73');
        expect(staleLog).not.toContain(LEAD_EMAIL);
      }
    );

    it('DENTRO do teto + não pago -> 400 payment_not_confirmed e NÃO marca processado', async () => {
      const { service, repo, loggerError } = makeService({
        insertCheckoutEventIfNew: jest.fn().mockResolvedValue(null),
        findCheckoutEventByProviderEventId: jest.fn().mockResolvedValue({
          id: EVENT_ID,
          processedAt: null,
          receivedAt: new Date(Date.now() - 71 * HOUR_MS),
        }),
        checkPayment: jest.fn().mockResolvedValue({ paid: false, paidAmountCents: 0 }),
      });

      const result = await service.handleInfinitePayWebhook(BODY);

      expect(result).toEqual({ success: false, message: 'payment_not_confirmed' });
      expect(repo.markEventProcessed).not.toHaveBeenCalled();
      expect(loggerError).not.toHaveBeenCalledWith(expect.stringContaining('religare_webhook_stale_'));
    });

    it('mais velho que o teto mas payment_check LANÇA (timeout) -> continua transitório: server_error, NÃO marca', async () => {
      const { service, repo } = makeService({
        insertCheckoutEventIfNew: jest.fn().mockResolvedValue(null),
        findCheckoutEventByProviderEventId: jest.fn().mockResolvedValue({
          id: EVENT_ID,
          processedAt: null,
          receivedAt: new Date(Date.now() - 100 * HOUR_MS),
        }),
        checkPayment: jest.fn().mockRejectedValue(new Error('infinitepay_timeout')),
      });

      const result = await service.handleInfinitePayWebhook(BODY);

      expect(result).toEqual({ success: false, message: 'server_error' });
      expect(repo.markEventProcessed).not.toHaveBeenCalled();
    });

    it('mais velho que o teto mas PAGO e valor correto -> confirma normalmente (teto só vale pra resposta negativa)', async () => {
      const { service, repo, emailService } = makeService({
        insertCheckoutEventIfNew: jest.fn().mockResolvedValue(null),
        findCheckoutEventByProviderEventId: jest.fn().mockResolvedValue({
          id: EVENT_ID,
          processedAt: null,
          receivedAt: new Date(Date.now() - 100 * HOUR_MS),
        }),
      });

      const result = await service.handleInfinitePayWebhook(BODY);

      expect(result).toEqual({ success: true, message: null });
      expect(repo.markCheckoutPaid).toHaveBeenCalledWith(CHECKOUT_ID);
      expect(emailService.sendEmailSync).toHaveBeenCalledTimes(1);
    });
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
        transitioned: true,
        checkout: {
          id: CHECKOUT.id,
          lead: { email: CHECKOUT.lead.email, fullName: CHECKOUT.lead.fullName },
        },
      }),
      markCheckoutPaid: jest.fn().mockResolvedValue({
        transitioned: true,
        checkout: {
          id: CHECKOUT.id,
          lead: { email: CHECKOUT.lead.email, fullName: CHECKOUT.lead.fullName },
        },
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

  it('verifyCheckoutPayment: CAS perdeu a corrida (webhook confirmou antes) -> already_paid, sem 2º e-mail', async () => {
    const { service, emailService, infinitePay } = makeService({
      findLatestEventForCheckout: jest.fn().mockResolvedValue({
        payload: { transaction_nsu: 'txn-admin-1', invoice_slug: null },
      }),
      markCheckoutPaid: jest.fn().mockResolvedValue({
        transitioned: false,
        checkout: { id: CHECKOUT.id, lead: { email: CHECKOUT.lead.email, fullName: null } },
      }),
    });
    infinitePay.checkPayment.mockResolvedValue({ paid: true, paidAmountCents: CHECKOUT.amountCents });

    const result = await service.verifyCheckoutPayment(CHECKOUT.id);

    expect(result.status).toBe('already_paid');
    expect(emailService.sendEmailSync).not.toHaveBeenCalled();
  });

  it('markCheckoutPaidManually: CAS perdeu a corrida -> não reenvia e-mail', async () => {
    const { service, emailService } = makeService({
      markCheckoutManuallyPaid: jest.fn().mockResolvedValue({
        transitioned: false,
        checkout: { id: CHECKOUT.id, lead: { email: CHECKOUT.lead.email, fullName: null } },
      }),
    });

    const result = await service.markCheckoutPaidManually(CHECKOUT.id, 'admin-user-1');

    expect(result.id).toBe(CHECKOUT.id);
    expect(emailService.sendEmailSync).not.toHaveBeenCalled();
  });

  it('(f) verifyCheckoutPayment: checkout de OUTRA org (repo filtra por orgId e devolve null) -> checkout_not_found, sem chamar payment_check', async () => {
    const { service, repo, infinitePay, emailService } = makeService({
      findCheckoutById: jest.fn().mockResolvedValue(null),
    });

    await expect(service.verifyCheckoutPayment('checkout-de-outra-org')).rejects.toThrow(
      'checkout_not_found'
    );

    // orgId vem do servidor (env), nunca do chamador.
    expect(repo.findCheckoutById).toHaveBeenCalledWith(
      'checkout-de-outra-org',
      'vocaccio-org-seed'
    );
    expect(repo.findLatestEventForCheckout).not.toHaveBeenCalled();
    expect(infinitePay.checkPayment).not.toHaveBeenCalled();
    expect(repo.markCheckoutPaid).not.toHaveBeenCalled();
    expect(emailService.sendEmailSync).not.toHaveBeenCalled();
  });

  it('(f) verifyCheckoutPayment: checkout já PAID -> already_paid, sem chamar payment_check nem e-mail', async () => {
    const { service, repo, infinitePay, emailService } = makeService({
      findCheckoutById: jest.fn().mockResolvedValue({ ...CHECKOUT, status: 'PAID' }),
    });

    const result = await service.verifyCheckoutPayment(CHECKOUT.id);

    expect(result.status).toBe('already_paid');
    expect(infinitePay.checkPayment).not.toHaveBeenCalled();
    expect(repo.markCheckoutPaid).not.toHaveBeenCalled();
    expect(emailService.sendEmailSync).not.toHaveBeenCalled();
  });
});
