import { z } from "zod/v4"

// ─── Price entry ──────────────────────────────────────────
export const PriceEntrySchema = z.object({
  label: z.string().min(1, "价格名称不能为空"),
  value: z.coerce.number().refine(Number.isFinite, "请输入有效金额").positive("金额必须大于 0"),
})

// ─── Part form ────────────────────────────────────────────
export const PartFormSchema = z.object({
  name: z.string().min(1, "零件名称不能为空").max(100),
  material: z.string().min(1, "材质不能为空").max(100),
  spec: z.string().max(100).optional(),
  remark: z.string().max(500).optional(),
  prices: z.array(PriceEntrySchema).min(1, "至少填写一项价格"),
})

export type PartFormValues = z.infer<typeof PartFormSchema>

// ─── Part record (API response) ───────────────────────────
export interface Part {
  id: number
  partNumber: string
  name: string
  material: string
  spec?: string
  remark?: string
  prices: { label: string; value: number }[]
  createdAt: string
}

// ─── Excel import row ─────────────────────────────────────
// Column aliases: accept both Chinese and English headers
const ALIAS: Record<string, string> = {
  "零件名称": "零件名称", "名称": "零件名称", "name": "零件名称",
  "零件材质": "零件材质", "材质": "零件材质", "material": "零件材质",
  "零件价格": "零件价格", "价格": "零件价格", "单价": "零件价格", "price": "零件价格",
  "备注": "备注", "remark": "备注", "note": "备注",
}

export function normalizeImportRow(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    const key = ALIAS[k.trim()] ?? ALIAS[k.trim().toLowerCase()]
    if (key) result[key] = v
  }
  return result
}

export const ImportRowSchema = z.object({
  零件名称: z.string().min(1, "零件名称不能为空"),
  零件材质: z.string().min(1, "材质不能为空"),
  零件价格: z.coerce.number().refine(Number.isFinite, "价格必须是数字").positive("价格必须大于 0"),
  备注: z.string().optional(),
})

export type ImportRow = z.infer<typeof ImportRowSchema>

export interface ImportResult {
  valid: (ImportRow & { _row: number })[]
  invalid: { _row: number; errors: string[] }[]
}
