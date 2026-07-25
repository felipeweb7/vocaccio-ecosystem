import { Injectable, Logger } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';

const LINKS_URL = 'https://api.checkout.infinitepay.io/links';
const PAYMENT_CHECK_URL = 'https://api.checkout.infinitepay.io/payment_check';
const DEFAULT_TIMEOUT_MS = 10_000;

function timeoutMs(): number {
  const parsed = Number(process.env.INFINITEPAY_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

/**
 * fetch() sem timeout trava a requisição do usuário (checkout) ou o
 * processamento do webhook indefinidamente se a InfinitePay travar/cair.
 * AbortController força erro depois de INFINITEPAY_TIMEOUT_MS (default 10s).
 */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs());
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

export interface CreatePaymentLinkParams {
  orderNsu: string;
  amountCents: number;
  installments: number;
  productName: string;
  webhookUrl: string;
  redirectUrl: string;
}

export interface CreatePaymentLinkResult {
  checkoutUrl: string;
  invoiceSlug: string | null;
}

export interface PaymentCheckParams {
  orderNsu: string;
  transactionNsu: string;
  invoiceSlug: string | null;
}

export interface PaymentCheckResult {
  paid: boolean;
  paidAmountCents: number | null;
}

/**
 * Cliente do Checkout Integrado da InfinitePay. Campos de request/response
 * baseados na documentação pública (central de ajuda + página de
 * desenvolvedores, checados em jul/2026) — a InfinitePay não publica um SDK
 * nem OpenAPI spec, então os nomes exatos de campo da resposta de `/links`
 * não foram confirmados contra uma chamada real. Ver
 * docs/religare/funil-fundacao.md, seção "Antes de aplicar em produção".
 */
@Injectable()
export class InfinitePayService {
  private readonly logger = new Logger(InfinitePayService.name);

  /** Cria o link de pagamento. Lança erro se a InfinitePay não retornar uma URL utilizável. */
  async createPaymentLink(
    params: CreatePaymentLinkParams
  ): Promise<CreatePaymentLinkResult> {
    const handle = process.env.INFINITEPAY_HANDLE;
    if (!handle) {
      throw new Error('infinitepay_misconfigured: INFINITEPAY_HANDLE ausente');
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(LINKS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          order_nsu: params.orderNsu,
          redirect_url: params.redirectUrl,
          webhook_url: params.webhookUrl,
          items: [
            {
              name: params.productName,
              quantity: 1,
              price: params.amountCents,
            },
          ],
          installments: params.installments,
        }),
      });
    } catch (err) {
      if (isAbortError(err)) {
        this.logger.error(`infinitepay_links_timeout order_nsu=${params.orderNsu}`);
        throw new Error('infinitepay_links_timeout');
      }
      this.logger.error(
        `infinitepay_links_network_error order_nsu=${params.orderNsu}`,
        err instanceof Error ? err.message : err
      );
      throw new Error('infinitepay_links_network_error');
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(
        `infinitepay_links_http_error status=${response.status} body_len=${text.length}`
      );
      throw new Error('infinitepay_links_failed');
    }

    const data = (await response.json()) as Record<string, unknown>;
    const checkoutUrl =
      (typeof data.url === 'string' && data.url) ||
      (typeof data.checkout_url === 'string' && data.checkout_url) ||
      (typeof data.link === 'string' && data.link) ||
      null;

    if (!checkoutUrl) {
      this.logger.error(
        `infinitepay_links_unexpected_response keys=${Object.keys(data).join(',')}`
      );
      throw new Error('infinitepay_links_no_url');
    }

    const invoiceSlug = typeof data.invoice_slug === 'string' ? data.invoice_slug : null;

    return { checkoutUrl, invoiceSlug };
  }

  /**
   * Reconciliação ativa — nunca confiar no valor/status vindo direto do
   * corpo do webhook. Chama a própria InfinitePay pra confirmar.
   */
  async checkPayment(params: PaymentCheckParams): Promise<PaymentCheckResult> {
    const handle = process.env.INFINITEPAY_HANDLE;
    if (!handle) {
      throw new Error('infinitepay_misconfigured: INFINITEPAY_HANDLE ausente');
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(PAYMENT_CHECK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          order_nsu: params.orderNsu,
          transaction_nsu: params.transactionNsu,
          slug: params.invoiceSlug,
        }),
      });
    } catch (err) {
      if (isAbortError(err)) {
        this.logger.error(`infinitepay_payment_check_timeout order_nsu=${params.orderNsu}`);
        throw new Error('infinitepay_payment_check_timeout');
      }
      this.logger.error(
        `infinitepay_payment_check_network_error order_nsu=${params.orderNsu}`,
        err instanceof Error ? err.message : err
      );
      throw new Error('infinitepay_payment_check_network_error');
    }

    if (!response.ok) {
      this.logger.error(`infinitepay_payment_check_http_error status=${response.status}`);
      throw new Error('infinitepay_payment_check_failed');
    }

    const data = (await response.json()) as Record<string, unknown>;
    return {
      paid: data.paid === true,
      paidAmountCents: typeof data.paid_amount === 'number' ? data.paid_amount : null,
    };
  }

  /**
   * Compara o token do webhook em tempo constante (contra timing attack),
   * via digest SHA-256 dos dois lados — evita o erro de tamanho diferente
   * que `timingSafeEqual` lançaria comparando strings de comprimento distinto.
   */
  validateWebhookToken(receivedToken: string | null): boolean {
    const expected = process.env.INFINITEPAY_WEBHOOK_TOKEN;
    if (!expected || !receivedToken) return false;

    const expectedDigest = createHash('sha256').update(expected).digest();
    const receivedDigest = createHash('sha256').update(receivedToken).digest();
    return timingSafeEqual(expectedDigest, receivedDigest);
  }
}
