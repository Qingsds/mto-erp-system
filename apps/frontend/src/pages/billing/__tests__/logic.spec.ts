import { describe, expect, it } from "vitest"
import { calculateEstimatedTotal, validateCanSubmit } from "../new/logic"

describe("Billing Creation Logic", () => {
  describe("calculateEstimatedTotal", () => {
    type MockItems = Parameters<typeof calculateEstimatedTotal>[0]

    const mockItems = [
      {
        id: 1,
        shippedQty: 10,
        orderItem: {
          unitPrice: "12.50",
          part: { commonPrices: { standard: 12.5 } },
        },
      },
      {
        id: 2,
        shippedQty: 5,
        orderItem: {
          unitPrice: "8",
          part: { commonPrices: { standard: 8 } },
        },
      },
    ] as unknown as MockItems

    it("calculates the total for selected delivery items", () => {
      const selectedIds = new Set([1, 2])
      const total = calculateEstimatedTotal(mockItems, selectedIds, [])
      expect(total).toBe(10 * 12.5 + 5 * 8)
    })

    it("only counts selected delivery items", () => {
      const selectedIds = new Set([1])
      const total = calculateEstimatedTotal(mockItems, selectedIds, [])
      expect(total).toBe(10 * 12.5)
    })

    it("adds extra items into the total", () => {
      const selectedIds = new Set([1])
      const extraItems = [{ desc: "shipping", amount: "50" }]
      const total = calculateEstimatedTotal(mockItems, selectedIds, extraItems)
      expect(total).toBe(10 * 12.5 + 50)
    })

    it("ignores invalid extra items", () => {
      const selectedIds = new Set([1])
      const extraItems = [{ desc: "", amount: "abc" }, { desc: "negative", amount: "-10" }]
      const total = calculateEstimatedTotal(mockItems, selectedIds, extraItems)
      expect(total).toBe(10 * 12.5)
    })
  })

  describe("validateCanSubmit", () => {
    it("returns true when a customer is selected and at least one item is selected", () => {
      expect(validateCanSubmit(new Set([1]), 1)).toBe(true)
    })

    it("returns false when no delivery item is selected", () => {
      expect(validateCanSubmit(new Set(), 1)).toBe(false)
    })

    it("returns false when no customer is selected", () => {
      expect(validateCanSubmit(new Set([1]), 0)).toBe(false)
    })
  })
})
