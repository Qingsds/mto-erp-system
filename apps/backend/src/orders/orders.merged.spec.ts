import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ROLES_KEY } from '../auth/roles.decorator';

type TestOrder = {
  id: number;
  customerId: number | null;
  customerName: string;
  status: 'PENDING' | 'PARTIAL_SHIPPED' | 'SHIPPED' | 'CLOSED_SHORT';
  createdAt: Date;
  mergedMembership: { mergedOrderId: number } | null;
};

function order(
  id: number,
  customerId: number | null,
  status: TestOrder['status'] = 'PENDING',
  mergedOrderId?: number,
): TestOrder {
  return {
    id,
    customerId,
    customerName: customerId ? `客户${customerId}` : '旧订单客户',
    status,
    createdAt: new Date(
      `2026-07-${String(10 + id).padStart(2, '0')}T08:00:00.000Z`,
    ),
    mergedMembership: mergedOrderId ? { mergedOrderId } : null,
  };
}

function createHarness(initialOrders: TestOrder[]) {
  const orders = new Map(initialOrders.map((item) => [item.id, { ...item }]));
  const merges = new Map<number, { active: boolean; orderIds: number[] }>();
  let nextMergedOrderId = 50;

  const detailRecord = (id: number) => {
    const merge = merges.get(id)!;
    const members = merge.orderIds.map((orderId) => orders.get(orderId)!);
    const createdAt = new Date('2026-07-27T10:00:00.000Z');
    return {
      id,
      mergedNo: `MRG-20260727-${String(id).padStart(6, '0')}`,
      customerId: members[0].customerId,
      remark: null,
      status: merge.active ? 'ACTIVE' : 'DISSOLVED',
      createdAt,
      updatedAt: createdAt,
      customer: { name: members[0].customerName },
      createdBy: { id: 1, realName: '管理员', role: 'ADMIN' },
      orders: members.map((member) => ({
        order: {
          ...member,
          items: [],
        },
      })),
    };
  };

  const tx = {
    order: {
      findMany: jest.fn(
        async ({ where }: { where: { id: { in: number[] } } }) =>
          where.id.in.flatMap((id) => {
            const found = orders.get(id);
            return found ? [found] : [];
          }),
      ),
    },
    mergedOrder: {
      create: jest.fn(
        async ({
          data,
        }: {
          data: { orders: { create: Array<{ orderId: number }> } };
        }) => {
          const id = nextMergedOrderId++;
          const orderIds = data.orders.create.map((member) => member.orderId);
          merges.set(id, { active: true, orderIds });
          orderIds.forEach((orderId) => {
            orders.get(orderId)!.mergedMembership = { mergedOrderId: id };
          });
          return { id, createdAt: new Date('2026-07-27T10:00:00.000Z') };
        },
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: number };
          data: { status?: string };
        }) => {
          const merge = merges.get(where.id)!;
          if (data.status === 'DISSOLVED') {
            merge.active = false;
            return { id: where.id, status: 'DISSOLVED' };
          }
          return detailRecord(where.id);
        },
      ),
      findFirst: jest.fn(async ({ where }: { where: { id: number } }) => {
        const merge = merges.get(where.id);
        if (!merge?.active) return null;
        return {
          id: where.id,
          status: 'ACTIVE',
          orders: merge.orderIds.map((orderId) => ({ orderId })),
        };
      }),
    },
    mergedOrderItem: {
      deleteMany: jest.fn(
        async ({ where }: { where: { mergedOrderId: number } }) => {
          const merge = merges.get(where.mergedOrderId)!;
          merge.orderIds.forEach((orderId) => {
            orders.get(orderId)!.mergedMembership = null;
          });
          merge.orderIds = [];
          return { count: 1 };
        },
      ),
      createMany: jest.fn(
        async ({
          data,
        }: {
          data: Array<{ mergedOrderId: number; orderId: number }>;
        }) => {
          const mergedOrderId = data[0].mergedOrderId;
          const merge = merges.get(mergedOrderId)!;
          merge.orderIds = data.map((member) => member.orderId);
          data.forEach((member) => {
            orders.get(member.orderId)!.mergedMembership = { mergedOrderId };
          });
          return { count: data.length };
        },
      ),
    },
  };

  const prisma = {
    client: {
      $transaction: jest.fn(async (operation: unknown) => {
        if (typeof operation === 'function') {
          return (operation as (client: typeof tx) => unknown)(tx);
        }
        return Promise.all(operation as Promise<unknown>[]);
      }),
    },
  } as unknown as PrismaService;
  const service = new OrdersService(prisma, {} as StorageService);

  return { service, tx, orders, merges };
}

describe('OrdersService merged orders', () => {
  it('同客户订单可合并，且不限制正式订单状态', async () => {
    const harness = createHarness([
      order(1, 8, 'PENDING'),
      order(2, 8, 'PARTIAL_SHIPPED'),
      order(3, 8, 'SHIPPED'),
      order(4, 8, 'CLOSED_SHORT'),
    ]);

    const result = await harness.service.createMergedOrder(
      { orderIds: [1, 2, 3, 4], remark: '分批生产' },
      1,
    );

    expect(result.orders.map((item) => item.id)).toEqual([1, 2, 3, 4]);
    expect(harness.tx.mergedOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: 8,
          orders: {
            create: [
              { orderId: 1 },
              { orderId: 2 },
              { orderId: 3 },
              { orderId: 4 },
            ],
          },
        }),
      }),
    );
  });

  it.each([
    ['跨客户', [order(1, 8), order(2, 9)], '只能合并同一客户的订单'],
    ['缺少客户主数据', [order(1, null), order(2, null)], '缺少客户主数据'],
    [
      '已属于其他合并单',
      [order(1, 8, 'PENDING', 900), order(2, 8)],
      '已属于其他合并订单',
    ],
  ])('%s时拒绝创建', async (_name, sourceOrders, message) => {
    const harness = createHarness(sourceOrders as TestOrder[]);

    await expect(
      harness.service.createMergedOrder({ orderIds: [1, 2] }, 1),
    ).rejects.toThrow(message as string);
    expect(harness.tx.mergedOrder.create).not.toHaveBeenCalled();
  });

  it('调整后至少保留两张订单', async () => {
    const harness = createHarness([order(1, 8), order(2, 8)]);
    const merged = await harness.service.createMergedOrder(
      { orderIds: [1, 2] },
      1,
    );

    await expect(
      harness.service.updateMergedOrder(merged.id, { orderIds: [1] }),
    ).rejects.toThrow('至少选择两张订单');
  });

  it('调整移除成员后，该订单可立即加入其他合并单', async () => {
    const harness = createHarness([
      order(1, 8),
      order(2, 8),
      order(3, 8),
      order(4, 8),
    ]);
    const first = await harness.service.createMergedOrder(
      { orderIds: [1, 2, 3] },
      1,
    );

    await harness.service.updateMergedOrder(first.id, { orderIds: [2, 3] });
    const second = await harness.service.createMergedOrder(
      { orderIds: [1, 4] },
      1,
    );

    expect(second.orders.map((item) => item.id)).toEqual([1, 4]);
  });

  it('解散后释放全部成员，不删除原订单', async () => {
    const harness = createHarness([order(1, 8), order(2, 8), order(3, 8)]);
    const first = await harness.service.createMergedOrder(
      { orderIds: [1, 2] },
      1,
    );

    await harness.service.dissolveMergedOrder(first.id);
    const second = await harness.service.createMergedOrder(
      { orderIds: [1, 3] },
      1,
    );

    expect(second.orders.map((item) => item.id)).toEqual([1, 3]);
    expect(harness.orders.has(1)).toBe(true);
    expect(harness.tx.mergedOrderItem.deleteMany).toHaveBeenCalledWith({
      where: { mergedOrderId: first.id },
    });
  });
});

describe('OrdersController merged order permissions', () => {
  it.each([
    ['createMergedOrder', OrdersController.prototype.createMergedOrder],
    ['updateMergedOrder', OrdersController.prototype.updateMergedOrder],
    ['dissolveMergedOrder', OrdersController.prototype.dissolveMergedOrder],
  ])('%s 仅允许管理员', (_name, handler) => {
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['ADMIN']);
  });

  it.each([
    ['listMergedOrders', OrdersController.prototype.listMergedOrders],
    ['getMergedOrder', OrdersController.prototype.getMergedOrder],
  ])('%s 对普通用户开放', (_name, handler) => {
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
  });
});
