/**
 * Preço do produto do funil — fixado no servidor, nunca aceito do navegador.
 * Mudar o preço é uma mudança de código revisada (PR), não uma env var que
 * pode ser esquecida/errada num ambiente — decisão deliberada dado o
 * histórico de auditoria de segurança deste repo em torno de dado de cliente
 * e cobrança.
 */
export const RELIGARE_MAPA_PRODUCT = {
  name: 'Mapa Religare',
  totalCents: 47_640, // 12 x R$ 39,70
  installments: 12,
} as const;
