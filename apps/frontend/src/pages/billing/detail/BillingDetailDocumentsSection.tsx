/**
 * 对账归档区。
 *
 * 当前阶段先承载盖章归档记录与审计摘要，不伪造下载能力。
 */

import type { BillingDetail } from "@/hooks/api/useBilling"
import { BILLING_DOCUMENT_STATUS_LABEL, formatDateLabel } from "../list/shared"

interface BillingDetailDocumentsSectionProps {
  billing: BillingDetail
}

function formatHash(hash?: string | null) {
  if (!hash) return "未生成"
  if (hash.length <= 16) return hash
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`
}

export function BillingDetailDocumentsSection({
  billing,
}: BillingDetailDocumentsSectionProps) {
  return (
    <section className='border border-border bg-card'>
      <div className='border-b border-border px-3 py-3 sm:px-5 sm:py-4'>
        <h2 className='text-sm font-semibold text-foreground'>归档记录</h2>
        <p className='mt-1 text-xs text-muted-foreground'>
          盖章后会生成归档文件与审计日志；当前页面只展示状态，不提供下载。
        </p>
      </div>

      {billing.documents.length === 0 ? (
        <div className='px-4 py-10 text-center text-muted-foreground sm:px-5'>
          <i className='ri-folder-open-line text-3xl opacity-40' />
          <p className='mt-3 text-sm font-medium text-foreground'>还没有归档记录</p>
          <p className='mt-1 text-xs'>
            对账单盖章后，这里会出现归档文件与盖章审计信息。
          </p>
        </div>
      ) : (
        <div className='flex flex-col'>
          {billing.documents.map(document => {
            const latestLog = document.sealLogs[0]

            return (
              <article
                key={document.id}
                className='border-b border-border px-3 py-3 last:border-b-0 sm:px-5 sm:py-4'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-foreground'>
                      {document.fileName}
                    </p>
                    <p className='mt-1 text-[11px] text-muted-foreground'>
                      生成时间：{formatDateLabel(document.createdAt)}
                    </p>
                  </div>

                  <span className='border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700'>
                    {BILLING_DOCUMENT_STATUS_LABEL[document.status] ?? document.status}
                  </span>
                </div>

                <div className='mt-3 grid gap-2 text-xs text-muted-foreground'>
                  <p>文件摘要：{formatHash(document.fileHash)}</p>
                  {latestLog ? (
                    <>
                      <p>
                        最近盖章：{latestLog.seal.name} · {formatDateLabel(latestLog.actionTime)}
                      </p>
                      <p>
                        操作人：{latestLog.user.realName}（{latestLog.user.username}）
                        {latestLog.ipAddress ? ` · IP ${latestLog.ipAddress}` : ""}
                      </p>
                    </>
                  ) : (
                    <p>当前文档暂无盖章日志</p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
