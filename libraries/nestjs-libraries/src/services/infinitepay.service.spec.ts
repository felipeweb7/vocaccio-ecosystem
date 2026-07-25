import { InfinitePayService } from './infinitepay.service';

/**
 * fetch() sem timeout/tratamento de rede deixava a requisição do usuário
 * (ou o processamento do webhook) pendurada se a InfinitePay travasse ou
 * caísse — ver docs/religare/funil-fundacao.md. `INFINITEPAY_TIMEOUT_MS`
 * bem baixo aqui evita que os testes de timeout demorem de verdade.
 */
describe('InfinitePayService — timeout e falha de rede', () => {
  const ORIGINAL_ENV = process.env;
  const ORIGINAL_FETCH = global.fetch;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      INFINITEPAY_HANDLE: 'test-handle',
      INFINITEPAY_TIMEOUT_MS: '20',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    global.fetch = ORIGINAL_FETCH;
  });

  function mockFetchNeverResolvesUntilAbort() {
    global.fetch = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('This operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        })
    ) as unknown as typeof fetch;
  }

  function mockFetchNetworkFailure() {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch;
  }

  describe('createPaymentLink', () => {
    const params = {
      orderNsu: 'RLG-timeout-test',
      amountCents: 47_640,
      installments: 12,
      productName: 'Mapa Religare',
      webhookUrl: 'https://vocacc.io/api/religare/webhook',
      redirectUrl: 'https://vocacc.io/religare/obrigado',
    };

    it('timeout: aborta e lança infinitepay_links_timeout sem travar indefinidamente', async () => {
      mockFetchNeverResolvesUntilAbort();
      const service = new InfinitePayService();

      await expect(service.createPaymentLink(params)).rejects.toThrow(
        'infinitepay_links_timeout'
      );
    });

    it('falha de rede: lança infinitepay_links_network_error (não tenta parsear resposta inexistente)', async () => {
      mockFetchNetworkFailure();
      const service = new InfinitePayService();

      await expect(service.createPaymentLink(params)).rejects.toThrow(
        'infinitepay_links_network_error'
      );
    });
  });

  describe('checkPayment', () => {
    const params = {
      orderNsu: 'RLG-timeout-test',
      transactionNsu: 'txn-timeout-test',
      invoiceSlug: null,
    };

    it('timeout: aborta e lança infinitepay_payment_check_timeout — nunca confirma pagamento sem resposta', async () => {
      mockFetchNeverResolvesUntilAbort();
      const service = new InfinitePayService();

      await expect(service.checkPayment(params)).rejects.toThrow(
        'infinitepay_payment_check_timeout'
      );
    });

    it('falha de rede: lança infinitepay_payment_check_network_error', async () => {
      mockFetchNetworkFailure();
      const service = new InfinitePayService();

      await expect(service.checkPayment(params)).rejects.toThrow(
        'infinitepay_payment_check_network_error'
      );
    });
  });
});
