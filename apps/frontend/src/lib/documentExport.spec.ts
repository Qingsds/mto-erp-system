import { describe, expect, it } from "vitest"
import type { DeliveryDetail } from "@/hooks/api/useDeliveries"
import type { OrderDetail } from "@/hooks/api/useOrders"
import {
  buildDeliveryDetailRows,
  buildOrderPriceDetailRows,
  getDeliveryExportPreview,
  getOrderExportPreview,
  resolveSettlementQty,
} from "./documentExport"

function createOrderFixture(status: OrderDetail["status"]): OrderDetail {
  return {
    id: 101,
    customerName: "测试客户",
    status,
    reason: status === "CLOSED_SHORT" ? "部分报废不补" : undefined,
    createdAt: "2026-03-23T10:00:00.000Z",
    deliveries: [],
    items: [
      {
        id: 1,
        orderId: 101,
        partId: 11,
        orderedQty: 10,
        shippedQty: 7,
        unitPrice: "12.50",
        part: {
          id: 11,
          partNumber: "P-0011",
          name: "联轴器",
          material: "45#钢",
          spec: undefined,
          commonPrices: { 标准价: 12.5 },
        },
      },
      {
        id: 2,
        orderId: 101,
        partId: 12,
        orderedQty: 5,
        shippedQty: 5,
        unitPrice: "8",
        part: {
          id: 12,
          partNumber: "P-0012",
          name: "压板",
          material: "Q235",
          spec: undefined,
          commonPrices: { 标准价: 8 },
        },
      },
    ],
  }
}

function createDeliveryFixture(): DeliveryDetail {
  return {
    id: 201,
    orderId: 101,
    deliveryDate: "2026-03-23T09:00:00.000Z",
    status: "SHIPPED",
    remark: "存在报废件，详见工艺记录",
    order: {
      id: 101,
      customerName: "测试客户",
      createdAt: "2026-03-20T09:00:00.000Z",
    },
    items: [
      {
        id: 1,
        deliveryNoteId: 201,
        orderItemId: 1,
        shippedQty: 3,
        remark: null,
        orderItem: {
          id: 1,
          orderId: 101,
          partId: 11,
          unitPrice: "12.50",
          orderedQty: 10,
          shippedQty: 7,
          part: {
            id: 11,
            partNumber: "P-0011",
            name: "联轴器",
            material: "45#钢",
            spec: null,
            commonPrices: { 标准价: 12.5 },
          },
        },
      },
      {
        id: 2,
        deliveryNoteId: 201,
        orderItemId: 2,
        shippedQty: 2,
        remark: "表面轻微划痕",
        orderItem: {
          id: 2,
          orderId: 101,
          partId: 12,
          unitPrice: "8",
          orderedQty: 5,
          shippedQty: 5,
          part: {
            id: 12,
            partNumber: "P-0012",
            name: "压板",
            material: "Q235",
            spec: null,
            commonPrices: { 标准价: 8 },
          },
        },
      },
    ],
  }
}

describe("resolveSettlementQty", () => {
  it("短交结案按已发数量结算", () => {
    expect(resolveSettlementQty(10, 7, true)).toBe(7)
  })

  it("非短交按下单数量结算", () => {
    expect(resolveSettlementQty(10, 7, false)).toBe(10)
  })
})

describe("buildOrderPriceDetailRows", () => {
  it("短交订单会扣除缺少数量金额并标注废件备注", () => {
    const rows = buildOrderPriceDetailRows(createOrderFixture("CLOSED_SHORT"))

    expect(rows[0][0]).toBe("联轴器")
    expect(rows[0][1]).toBe(7)
    expect(rows[0][3]).toBe(87.5)
    expect(rows[0][4]).toContain("短交废件 3 件")
    expect(rows[1][1]).toBe(5)
    expect(rows[1][3]).toBe(40)
  })

  it("非短交订单仍按下单数量计费", () => {
    const rows = buildOrderPriceDetailRows(createOrderFixture("PARTIAL_SHIPPED"))
    expect(rows[0][1]).toBe(10)
    expect(rows[0][3]).toBe(125)
    expect(rows[0][4]).toBe("—")
  })
})

describe("buildDeliveryDetailRows", () => {
  it("整单备注含废件关键词时，空行备注自动补提示", () => {
    const rows = buildDeliveryDetailRows(createDeliveryFixture())
    expect(rows[0][0]).toBe("联轴器")
    expect(rows[0][3]).toContain("含废件")
  })

  it("行备注存在时优先使用行备注", () => {
    const rows = buildDeliveryDetailRows(createDeliveryFixture())
    expect(rows[1][3]).toBe("表面轻微划痕")
  })
})

describe("export preview config", () => {
  it("可隐藏备注列", () => {
    const orderPreview = getOrderExportPreview(
      createOrderFixture("PARTIAL_SHIPPED"),
      { showRemarks: false },
    )
    const deliveryPreview = getDeliveryExportPreview(
      createDeliveryFixture(),
      { showRemarks: false },
    )

    expect(orderPreview.headers).toEqual(["零件", "数量", "价格", "合计"])
    expect(orderPreview.rows[0]).toHaveLength(4)
    expect(deliveryPreview.headers).toEqual(["零件", "材质", "数量"])
    expect(deliveryPreview.rows[0]).toHaveLength(3)
  })

  it("可隐藏状态字段", () => {
    const orderPreview = getOrderExportPreview(
      createOrderFixture("PARTIAL_SHIPPED"),
      { showStatus: false },
    )
    const deliveryPreview = getDeliveryExportPreview(
      createDeliveryFixture(),
      { showStatus: false },
    )

    expect(orderPreview.meta.join(" ")).not.toContain("状态：")
    expect(deliveryPreview.meta.join(" ")).not.toContain("状态：")
  })

  it("日期格式可配置为斜杠格式", () => {
    const orderPreview = getOrderExportPreview(
      createOrderFixture("CLOSED_SHORT"),
      { dateFormat: "YYYY/MM/DD" },
    )
    const deliveryPreview = getDeliveryExportPreview(
      createDeliveryFixture(),
      { dateFormat: "YYYY/MM/DD" },
    )

    expect(orderPreview.meta.join(" ")).toContain("2026/03/23")
    expect(deliveryPreview.meta.join(" ")).toContain("2026/03/23")
  })

  it("可隐藏客户、订单号、制表时间字段", () => {
    const orderPreview = getOrderExportPreview(
      createOrderFixture("PARTIAL_SHIPPED"),
      {
        showCustomer: false,
        showOrderNo: false,
        showPreparedAt: false,
      },
    )
    const deliveryPreview = getDeliveryExportPreview(
      createDeliveryFixture(),
      {
        showCustomer: false,
        showOrderNo: false,
        showPreparedAt: false,
      },
    )

    const orderMetaText = orderPreview.meta.join(" ")
    expect(orderMetaText).not.toContain("客户：")
    expect(orderMetaText).not.toContain("订单号：")
    expect(orderMetaText).not.toContain("制表日期：")

    const deliveryMetaText = deliveryPreview.meta.join(" ")
    expect(deliveryMetaText).not.toContain("客户：")
    expect(deliveryMetaText).not.toContain("关联订单：")
    expect(deliveryMetaText).not.toContain("制表日期：")
  })

  it("汇总行不再显示日期", () => {
    const orderPreview = getOrderExportPreview(
      createOrderFixture("CLOSED_SHORT"),
      { showRemarks: true },
    )
    const deliveryPreview = getDeliveryExportPreview(
      createDeliveryFixture(),
      { showRemarks: true },
    )

    expect(orderPreview.summary.join(" ")).not.toContain("日期：")
    expect(deliveryPreview.summary.join(" ")).not.toContain("发货日期：")
  })
})
