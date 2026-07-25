import { HttpException } from '@nestjs/common';
import { ReligareAdminController } from './religare-admin.controller';

/**
 * Testa o gate `assertSuperAdmin` do `ReligareAdminController` chamando os
 * métodos do controller DIRETO (sem `Test.createTestingModule`/supertest —
 * mesmo padrão manual já usado nos specs de service, ver
 * `libs/server/database/prisma/religare/religare-funnel.service.spec.ts`).
 * `@GetUserFromRequest()` é só um decorator de parâmetro do Nest — em tempo
 * de execução o método recebe o `User` (ou o que o decorator resolver) como
 * argumento comum, então dá pra simular os 2 casos (não-superadmin vs
 * superadmin) sem HTTP nem sessão real. Fecha a pendência registrada em
 * `docs/religare/funil-fundacao.md`, seção 8.4 ("NÃO verificado").
 */

function makeController(serviceOverrides: Record<string, jest.Mock> = {}) {
  const service = {
    listLeads: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    listCheckouts: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    verifyCheckoutPayment: jest.fn().mockResolvedValue({ status: 'paid' }),
    markCheckoutPaidManually: jest.fn().mockResolvedValue({ id: 'checkout-1' }),
    ...serviceOverrides,
  };
  const controller = new ReligareAdminController(service as any);
  return { controller, service };
}

const NON_SUPERADMIN_USER = { id: 'user-1', isSuperAdmin: false } as any;
const NO_FLAG_USER = { id: 'user-2' } as any; // isSuperAdmin undefined
const SUPERADMIN_USER = { id: 'admin-1', isSuperAdmin: true } as any;

describe('ReligareAdminController — gate assertSuperAdmin', () => {
  describe('GET /admin/religare/leads (listLeads)', () => {
    it('não-superadmin -> HttpException 400, service NUNCA chamado', async () => {
      const { controller, service } = makeController();

      await expect(
        controller.listLeads(NON_SUPERADMIN_USER, undefined, undefined, undefined, undefined)
      ).rejects.toMatchObject({ status: 400 });
      expect(service.listLeads).not.toHaveBeenCalled();
    });

    it('isSuperAdmin undefined -> HttpException 400, service NUNCA chamado', async () => {
      const { controller, service } = makeController();

      await expect(
        controller.listLeads(NO_FLAG_USER, undefined, undefined, undefined, undefined)
      ).rejects.toBeInstanceOf(HttpException);
      expect(service.listLeads).not.toHaveBeenCalled();
    });

    it('superadmin -> chama o service com os args certos e retorna o resultado dele', async () => {
      const { controller, service } = makeController();

      const result = await controller.listLeads(
        SUPERADMIN_USER,
        '2',
        '10',
        'NEW',
        'lead@example.com'
      );

      expect(service.listLeads).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: 'NEW',
        email: 'lead@example.com',
      });
      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('GET /admin/religare/checkouts (listCheckouts)', () => {
    it('não-superadmin -> HttpException 400, service NUNCA chamado', async () => {
      const { controller, service } = makeController();

      await expect(
        controller.listCheckouts(NON_SUPERADMIN_USER, undefined, undefined, undefined)
      ).rejects.toMatchObject({ status: 400 });
      expect(service.listCheckouts).not.toHaveBeenCalled();
    });

    it('superadmin -> chama o service com os args certos e retorna o resultado dele', async () => {
      const { controller, service } = makeController();

      const result = await controller.listCheckouts(SUPERADMIN_USER, '1', '20', 'PAID');

      expect(service.listCheckouts).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: 'PAID',
      });
      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('POST /admin/religare/checkouts/:id/verify-payment (verifyPayment)', () => {
    it('não-superadmin -> HttpException 400, service NUNCA chamado', async () => {
      const { controller, service } = makeController();

      await expect(
        controller.verifyPayment(NON_SUPERADMIN_USER, 'checkout-9')
      ).rejects.toMatchObject({ status: 400 });
      expect(service.verifyCheckoutPayment).not.toHaveBeenCalled();
    });

    it('superadmin -> chama o service com o id certo e retorna o resultado dele', async () => {
      const { controller, service } = makeController();

      const result = await controller.verifyPayment(SUPERADMIN_USER, 'checkout-9');

      expect(service.verifyCheckoutPayment).toHaveBeenCalledWith('checkout-9');
      expect(result).toEqual({ status: 'paid' });
    });
  });

  describe('POST /admin/religare/checkouts/:id/mark-paid (markPaid)', () => {
    it('não-superadmin -> HttpException 400, service NUNCA chamado', async () => {
      const { controller, service } = makeController();

      await expect(
        controller.markPaid(NON_SUPERADMIN_USER, 'checkout-9')
      ).rejects.toMatchObject({ status: 400 });
      expect(service.markCheckoutPaidManually).not.toHaveBeenCalled();
    });

    it('superadmin -> chama o service com checkoutId + user.id e retorna o resultado dele', async () => {
      const { controller, service } = makeController();

      const result = await controller.markPaid(SUPERADMIN_USER, 'checkout-9');

      expect(service.markCheckoutPaidManually).toHaveBeenCalledWith(
        'checkout-9',
        SUPERADMIN_USER.id
      );
      expect(result).toEqual({ id: 'checkout-1' });
    });
  });
});
