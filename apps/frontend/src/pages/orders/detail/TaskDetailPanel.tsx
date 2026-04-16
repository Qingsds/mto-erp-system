import { useState } from 'react';
import { useProductionTaskDetail, useUpdateTaskStatus, useCreateTaskMessage } from '@/hooks/api/useProductionTasks';
import { TaskStatusBadge, TaskUrgencyBadge } from '../shared/TaskBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskStatusType, TaskUrgencyType } from '@erp/shared-types';
import dayjs from 'dayjs';

export function TaskDetailPanel({ taskId }: { taskId: number }) {
  const { data: task, isLoading } = useProductionTaskDetail(taskId);
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateTaskStatus();
  const { mutate: sendMessage, isPending: isSending } = useCreateTaskMessage();
  const [content, setContent] = useState('');

  if (isLoading) return <div className="p-4 space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /></div>;
  if (!task) return <div className="p-4 text-center text-muted-foreground">任务不存在</div>;

  const handleSend = () => {
    if (!content.trim()) return;
    sendMessage({ taskId, content }, {
      onSuccess: () => setContent('')
    });
  };

  const statuses: TaskStatusType[] = ["PENDING", "IN_PRODUCTION", "QUALITY_CHECK", "COMPLETED"];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">当前状态</span>
          <div className="flex items-center gap-2">
            <TaskStatusBadge status={task.status} />
            <TaskUrgencyBadge urgency={task.urgency as TaskUrgencyType} />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>交货日期: {dayjs(task.targetDate).format('YYYY-MM-DD')}</span>
          <span>关联零件: {task.orderItem.part.name} ({task.orderItem.part.partNumber})</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>订单负责人: {task.orderItem.order?.responsibleUser?.realName ?? '--'}</span>
          <span className="text-right">
            最近操作人: {task.lastStatusUpdatedBy?.realName ?? '--'}
            {task.lastStatusUpdatedAt
              ? ` · ${dayjs(task.lastStatusUpdatedAt).format('MM-DD HH:mm')}`
              : ''}
          </span>
        </div>

        <div className="flex gap-2 pt-2 overflow-x-auto">
          {statuses.map(s => (
            <Button
              key={s}
              variant={task.status === s ? 'default' : 'outline'}
              size="sm"
              disabled={isUpdating}
              className="text-xs h-7 shrink-0 rounded-none"
              onClick={() => updateStatus({ id: taskId, status: s })}
            >
              设为 {s === 'PENDING' ? '待排产' : s === 'IN_PRODUCTION' ? '生产中' : s === 'QUALITY_CHECK' ? '质检中' : '已入库'}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {task.messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-10">暂无留言记录</div>
        ) : (
          task.messages.map((msg: any) => (
            <div key={msg.id} className="bg-muted/50 p-3 border-l-2 border-primary/30">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-xs text-foreground">{msg.user.realName}</span>
                <span className="text-[10px] text-muted-foreground">{dayjs(msg.createdAt).format('MM-DD HH:mm')}</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t bg-card shrink-0">
        <div className="flex gap-2">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="输入留言沟通..."
            className="text-sm h-9 rounded-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={isSending || !content.trim()} className="h-9 rounded-none px-6">
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}
