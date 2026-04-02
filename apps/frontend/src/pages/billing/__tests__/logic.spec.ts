import { describe, expect, it } from "vitest"
import { calculateEstimatedTotal, validateCanSubmit } from "../new/logic"

describe("Billing Creation Logic", () => {
  describe("calculateEstimatedTotal", () => {
    const mockItems = [
      {
        id: 1,
        shippedQty: 10,
        orderItem: {
          unitPrice: "12.50",
          part: { commonPrices: { 标准价: 12.5 } },
        },
      },
      {
        id: 2,
        shippedQty: 5,
        orderItem: {
          unitPrice: "8",
          part: { commonPrices: { 标准价: 8 } },
        },
      },
    ] as any

    it("正确计算已选明细的总额", () => {
      const selectedIds = new Set([1, 2])
      const total = calculateEstimatedTotal(mockItems, selectedIds, [])
      expect(total).toBe(10 * 12.5 + 5 * 8)
    })

    it("只计算已选中的明细", () => {
      const selectedIds = new Set([1])
      const total = calculateEstimatedTotal(mockItems, selectedIds, [])
      expect(total).toBe(10 * 12.5)
    })

    it("正确累加附加费用", () => {
      const selectedIds = new Set([1])
      const extraItems = [{ desc: "运费", amount: "50" }]
      const total = calculateEstimatedTotal(mockItems, selectedIds, extraItems)
      expect(total).toBe(10 * 12.5 + 50)
    })

    it("忽略无效的附加费用", () => {
      const selectedIds = new Set([1])
      const extraItems = [{ desc: "", amount: "abc" }, { desc: "负数", amount: "-10" }]
      const total = calculateEstimatedTotal(mockItems, selectedIds, extraItems)
      expect(total).toBe(10 * 12.5)
    })
  })

  describe("validateCanSubmit", () => {
    it("已选明细且有客户时返回 true", () => {
      expect(validateCanSubmit(new Set([1]), "客户A")).toBe(true)
    })

    it("未选明细时返回 false", () => {
      expect(validateCanSubmit(new Set(), "客户A")).toBe(false)
    })

    it("未选客户时返回 false", () => {
      expect(validateCanSubmit(new Set([1]), "")).toBe(false)
    })
  })
})
