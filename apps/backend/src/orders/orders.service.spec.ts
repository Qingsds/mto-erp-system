import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

type MergeCandidate = {
  id: number;
  customerId: number | null;
  customerName: string;
  status: 'PENDING' | 'PARTIAL_SHIPPED' | 'SHIPPED' | 'CLOSED_SHORT';
  createdAt: Date;
  mergedMembership: { mergedOrderId: number } | null;
};

function candidate(
  id: number,
  customerId: number | null,
  overrides: Partial<MergeCandidate> = {},
): MergeCandidate {
  return {
    id,
    customerId,
    customerName: '同名客户',
    status: 'PENDING',
    createdAt: new Date(`2026-07-${String(id).padStart(2, '0')}T00:00:00.000Z`),
    mergedMembership: null,
    ...overrides,
  };
}

describe('OrdersService merged-order validation', () => {
  const service = new OrdersService({} as never, {} as never);
  const validate = (
    orders: MergeCandidate[],
    orderIds: number[] = orders.map((order) => order.id),
    currentMergedOrderId?: number,
  ) => {
    const tx = {
      order: {
        findMany: jest.fn().mockResolvedValue(orders),
      },
    };
    return (
      service as unknown as {
        validateMergedOrderMembers: (
          transaction: unknown,
          ids: number[],
          currentId?: number,
        ) => Promise<unknown>;
      }
    ).validateMergedOrderMembers(tx, orderIds, currentMergedOrderId);
  };

  it('uses customer IDs rather than matching display names', async () => {
    await expect(
      validate([candidate(1, 10), candidate(2, 20)]),
    ).rejects.toThrow(new BadRequestException('只能合并同一客户的订单'));
  });

  it('allows short-closed orders', async () => {
    await expect(
      validate([
        candidate(1, 10),
        candidate(2, 10, { status: 'CLOSED_SHORT' }),
      ]),
    ).resolves.toMatchObject({
      customerId: 10,
      orderIds: [1, 2],
    });
  });

  it('rejects an order already owned by another active merge', async () => {
    await expect(
      validate([
        candidate(1, 10),
        candidate(2, 10, { mergedMembership: { mergedOrderId: 99 } }),
      ]),
    ).rejects.toThrow('订单 2 已属于其他合并订单');
  });

  it('allows existing members while adjusting the same merge', async () => {
    await expect(
      validate(
        [
          candidate(1, 10, { mergedMembership: { mergedOrderId: 7 } }),
          candidate(2, 10),
        ],
        undefined,
        7,
      ),
    ).resolves.toMatchObject({
      customerId: 10,
      orderIds: [1, 2],
    });
  });
});
