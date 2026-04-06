/**
 * 对账单盖章预览数据。
 *
 * 负责：
 * - 通过带鉴权头的请求拉取原始 PDF
 * - 输出工作台可直接使用的二进制数据
 */

import { useQuery } from "@tanstack/react-query"
import request from "@/lib/utils/request"
import { buildBillingPreviewUrl } from "@/hooks/api/useDocuments"

export function useBillingSealPreview(billingId?: number) {
  const query = useQuery({
    queryKey: ["billing", "seal-preview", billingId],
    queryFn: async (): Promise<Uint8Array> => {
      const blob = await request.get<Blob, Blob>(buildBillingPreviewUrl(billingId!), {
        responseType: "blob",
      })

      return new Uint8Array(await blob.arrayBuffer())
    },
    enabled: !!billingId,
  })

  return {
    pdfBytes: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
