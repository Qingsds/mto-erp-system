/**
 * parts.schema.ts
 *
 * 职责：Parts 模块 UI 专属内容
 *  - Zod 表单校验 schema（前端验证，对齐后端 DTO 字段）
 *  - Excel 导入 schema + 列名映射
 *
 * 不在这里定义：
 *  - Part / PartListItem / PartDetail / PartDrawing 接口
 *    → 见 hooks/api/useParts.ts（唯一 API 类型出处）
 *  - remark 字段：后端 CreatePartRequest / UpdatePartRequest 均无此字段，不纳入表单提交
 */

import { z } from "zod"

// ─── 价格字典行（UI 数组格式，对应 commonPrices Record）──
export const PriceEntrySchema = z.object({
  label: z.string().min(1, "价格名称不能为空"),
  value: z.coerce
    .number()
    .refine(Number.isFinite, "请输入有效金额")
    .positive("金额必须大于 0"),
})

// ─── 新增 / 编辑零件表单（对齐 CreatePartRequest / UpdatePartRequest）
// 字段：name, material, spec, commonPrices（由 prices 数组在提交时转换）
export const PartFormSchema = z.object({
  name:     z.string().min(1, "零件名称不能为空").max(100),
  material: z.string().min(1, "材质不能为空").max(100),
  spec:     z.string().max(100).optional(),
  prices:   z.array(PriceEntrySchema).min(1, "至少填写一项价格"),
  customerIds: z.array(z.number().int().positive()).default([]),
})

export type PartFormInput = z.input<typeof PartFormSchema>
export type PartFormValues = z.output<typeof PartFormSchema>

// ─── Excel 导入行（对齐 CreatePartRequest 可映射字段）────
// 列名: 零件名称→name, 零件材质→material, 规格→spec, 零件价格→commonPrices.标准价
const ALIAS: Record<string, string> = {
  零件名称: "零件名称", 名称:  "零件名称", name:     "零件名称",
  零件材质: "零件材质", 材质:  "零件材质", material: "零件材质",
  零件价格: "零件价格", 价格:  "零件价格", 单价:     "零件价格", price: "零件价格",
  规格:    "规格",     spec:  "规格",
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
  零件价格: z.coerce
    .number()
    .refine(Number.isFinite, "价格必须是数字")
    .positive("价格必须大于 0"),
  规格: z.string().optional(),
})

export type ImportRow = z.infer<typeof ImportRowSchema>

export interface ImportResult {
  valid:   (ImportRow & { _row: number })[]
  invalid: { _row: number; errors: string[] }[]
}
