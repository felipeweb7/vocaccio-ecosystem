import { ReligareCheckoutStatus } from '@prisma/client';
import { ReligareFunnelRepository } from './religare-funnel.repository';

/**
 * Atomicidade da confirmação de pagamento (WH-05): a garantia vive no
 * `updateMany` com `where: { id, status: { not: PAID } }` (compare-and-set no
 * banco). Estes testes afirmam os ARGUMENTOS reais enviados ao Prisma — um
 * mock que só confirma "foi chamado" não prova nada.
 */
describe('ReligareFunnelRepository — transição atômica para PAID (CAS)', () => {
  const CHECKOUT = { id: 'checkout-1', lead: { email: 'lead@example.com', fullName: 'Lead' } };

  function makeRepo(count: number) {
    const model = {
      religareCheckout: {
        updateMany: jest.fn().mockResolvedValue({ count }),
        findUnique: jest.fn().mockResolvedValue(CHECKOUT),
      },
    };
    const repo = new ReligareFunnelRepository({ model } as any);
    return { repo, model };
  }

  it('markCheckoutPaid: updateMany com where { id, status: { not: PAID } } e data PAID+paidAt', async () => {
    const { repo, model } = makeRepo(1);

    await repo.markCheckoutPaid('checkout-1');

    expect(model.religareCheckout.updateMany).toHaveBeenCalledTimes(1);
    const args = model.religareCheckout.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({
      id: 'checkout-1',
      status: { not: ReligareCheckoutStatus.PAID },
    });
    expect(args.data.status).toBe(ReligareCheckoutStatus.PAID);
    expect(args.data.paidAt).toBeInstanceOf(Date);
    expect(args.data.manualPaidAt).toBeUndefined();
  });

  it('markCheckoutManuallyPaid: mesmo where CAS; grava manualPaidAt/manualPaidByUserId, nunca paidAt', async () => {
    const { repo, model } = makeRepo(1);

    await repo.markCheckoutManuallyPaid('checkout-1', 'admin-1');

    const args = model.religareCheckout.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({
      id: 'checkout-1',
      status: { not: ReligareCheckoutStatus.PAID },
    });
    expect(args.data.status).toBe(ReligareCheckoutStatus.PAID);
    expect(args.data.manualPaidAt).toBeInstanceOf(Date);
    expect(args.data.manualPaidByUserId).toBe('admin-1');
    expect(args.data.paidAt).toBeUndefined();
  });

  it('count 1 -> transitioned true (esta chamada fez a transição) e devolve o checkout com contato do lead', async () => {
    const { repo, model } = makeRepo(1);

    const result = await repo.markCheckoutPaid('checkout-1');

    expect(result).toEqual({ transitioned: true, checkout: CHECKOUT });
    expect(model.religareCheckout.findUnique).toHaveBeenCalledWith({
      where: { id: 'checkout-1' },
      include: { lead: { select: { email: true, fullName: true } } },
    });
  });

  it('count 0 (outro gatilho já virou PAID) -> transitioned false; manual idem', async () => {
    const auto = await makeRepo(0).repo.markCheckoutPaid('checkout-1');
    const manual = await makeRepo(0).repo.markCheckoutManuallyPaid('checkout-1', 'admin-1');

    expect(auto.transitioned).toBe(false);
    expect(manual.transitioned).toBe(false);
  });
});
