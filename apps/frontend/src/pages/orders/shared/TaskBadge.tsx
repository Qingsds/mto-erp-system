import { Badge } from "@/components/ui/badge"
import { TaskStatusType, TaskUrgencyType } from "@erp/shared-types"

export function TaskStatusBadge({ status }: { status: TaskStatusType }) {
  switch (status) {
    case "PENDING":
      return <Badge variant="outline" className="rounded-none bg-muted/50">待排产</Badge>
    case "IN_PRODUCTION":
      return <Badge variant="outline" className="rounded-none border-blue-200 bg-blue-50 text-blue-700">生产中</Badge>
    case "QUALITY_CHECK":
      return <Badge variant="outline" className="rounded-none border-orange-200 bg-orange-50 text-orange-700">质检中</Badge>
    case "COMPLETED":
      return <Badge variant="outline" className="rounded-none border-green-200 bg-green-50 text-green-700">已入库</Badge>
    default:
      return <Badge variant="outline" className="rounded-none">{status}</Badge>
  }
}

export function TaskUrgencyBadge({ urgency }: { urgency: TaskUrgencyType }) {
  switch (urgency) {
    case "NORMAL":
      return <Badge variant="outline" className="rounded-none border-green-200 bg-green-50 text-green-700">正常</Badge>
    case "URGENT":
      return <Badge variant="outline" className="rounded-none border-orange-200 bg-orange-50 text-orange-700">紧急</Badge>
    case "OVERDUE":
      return <Badge variant="outline" className="rounded-none border-red-200 bg-red-50 text-red-700">逾期</Badge>
    default:
      return null
  }
}
