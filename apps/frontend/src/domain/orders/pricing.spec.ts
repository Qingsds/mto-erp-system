import { describe, it, expect } from "vitest"
import {
  resolveUnitPrice,
  resolveSettlementQty,
  computeListOrderAmount,
  computeOrderStats,
} from "./pricing"
import type { OrderDetail, OrderListItem } from "@/hooks/api/useOrders"

describe("Pricing Domain Logic", () => {
  describe("resolveUnitPrice", () => {
    it("should use snapshot price if it is greater than 0", () => {
      expect(resolveUnitPrice("100.50", { "标准价": 80 })).toBe(100.5)
      expect(resolveUnitPrice(100.5, { "标准价": 80 })).toBe(100.5)
    })

    it("should fallback to standard price if snapshot is 0 or invalid", () => {
      expect(resolveUnitPrice("0", { "标准价": 80 })).toBe(80)
      expect(resolveUnitPrice(0, { "标准价": 80 })).toBe(80)
    })

    it("should fallback to any available price if standard price is missing", () => {
      expect(resolveUnitPrice(0, { "其他价": 60 })).toBe(60)
    })

    it("should return 0 if no price is available", () => {
      expect(resolveUnitPrice(0, {})).toBe(0)
      expect(resolveUnitPrice("abc", {})).toBe(0)
    })
  })

  describe("resolveSettlementQty", () => {
    it("should return orderedQty for normal orders", () => {
      expect(resolveSettlementQty(10, 5, false)).toBe(10)
    })

    it("should return shippedQty (capped) for closed-short orders", () => {
      expect(resolveSettlementQty(10, 6, true)).toBe(6)
      expect(resolveSettlementQty(10, 12, true)).toBe(10)
      expect(resolveSettlementQty(10, -1, true)).toBe(0)
    })
  })

  describe("computeListOrderAmount", () => {
    const mockOrder: OrderListItem = {
      id: 1,
      customerNo: "C001",
      customerName: "Test Customer",
      status: "PENDING",
      createdAt: "2024-01-01",
      items: [
        { id: 1, orderId: 1, partId: 1, orderedQty: 10, shippedQty: 0, unitPrice: "20.00" },
        { id: 2, orderId: 1, partId: 2, orderedQty: 5, shippedQty: 0, unitPrice: "15.00" },
      ]
    }

    it("should use totalAmount if provided by backend", () => {
      const orderWithTotal = { ...mockOrder, totalAmount: 500 }
      expect(computeListOrderAmount(orderWithTotal)).toBe(500)
    })

    it("should compute from items if totalAmount is missing", () => {
      expect(computeListOrderAmount(mockOrder)).toBe(10 * 20 + 5 * 15)
    })

    it("should respect CLOSED_SHORT status when computing from items", () => {
      const closedOrder: OrderListItem = {
        ...mockOrder,
        status: "CLOSED_SHORT",
        items: [
          { id: 1, orderId: 1, partId: 1, orderedQty: 10, shippedQty: 6, unitPrice: "20.00" },
          { id: 2, orderId: 1, partId: 2, orderedQty: 5, shippedQty: 0, unitPrice: "15.00" },
        ]
      }
      expect(computeListOrderAmount(closedOrder)).toBe(6 * 20 + 0 * 15)
    })
  })

  describe("computeOrderStats", () => {
    const mockDetail: OrderDetail = {
      id: 1,
      customerName: "Test Customer",
      status: "PENDING",
      createdAt: "2024-01-01",
      deliveries: [],
      items: [
        {
          id: 1,
          orderId: 1,
          partId: 1,
          orderedQty: 10,
          shippedQty: 6,
          unitPrice: "20.00",
          part: { id: 1, partNumber: "P001", name: "Part 1", material: "Steel", commonPrices: {} }
        },
        {
          id: 2,
          orderId: 1,
          partId: 2,
          orderedQty: 5,
          shippedQty: 0,
          unitPrice: "0.00",
          part: { id: 2, partNumber: "P002", name: "Part 2", material: "Iron", commonPrices: { "标准价": 15 } }
        }
      ]
    }

    it("should compute full stats correctly for PENDING order", () => {
      const stats = computeOrderStats(mockDetail)
      expect(stats.totalOrderedQty).toBe(15)
      expect(stats.totalShippedQty).toBe(6)
      expect(stats.totalPendingQty).toBe(4 + 5)
      expect(stats.totalAmount).toBe(10 * 20 + 5 * 15)
      expect(stats.lines[1].unitPrice).toBe(15)
    })

    it("should compute settlement amount for CLOSED_SHORT order", () => {
      const stats = computeOrderStats({ ...mockDetail, status: "CLOSED_SHORT" })
      expect(stats.totalAmount).toBe(6 * 20 + 0 * 15)
    })
  })
})
