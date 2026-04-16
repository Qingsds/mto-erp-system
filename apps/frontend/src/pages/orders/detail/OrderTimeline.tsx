/**
 * OrderTimeline.tsx
 *
 * 职责：
 * - 以时间线形式渲染订单关键事件
 */

import type { TimelineEvent } from "./types"
import { formatDateTime } from "./utils"
import { UserIdentityInline } from "@/components/common/UserIdentityInline"

interface OrderTimelineProps {
  /** 已按时间排序的事件列表。 */
  timeline: TimelineEvent[]
}

export function OrderTimeline({ timeline }: OrderTimelineProps) {
  return (
    <div className="p-3 sm:p-4 flex flex-col gap-2">
      {timeline.map((event, idx) => (
        <div key={`${event.time}-${idx}`} className="flex gap-2.5">
          <div className="w-5 flex flex-col items-center pt-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {idx < timeline.length - 1 && (
              <span className="mt-1 flex-1 w-px bg-border" />
            )}
          </div>
          <div className="flex-1 pb-3">
            <p className="text-sm font-medium">{event.title}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>{formatDateTime(event.time)}</span>
              {event.actorName && (
                <span className="inline-flex items-center gap-1.5">
                  <span>操作人</span>
                  <UserIdentityInline
                    user={{ realName: event.actorName }}
                    className="min-w-0"
                    textClassName="text-[11px]"
                  />
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{event.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
