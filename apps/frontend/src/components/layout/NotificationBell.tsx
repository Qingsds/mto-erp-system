import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type SystemNotificationItem,
} from '@/hooks/api/useNotifications';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const { mutate: markAsRead } = useMarkNotificationRead();
  const { mutate: markAllAsRead } = useMarkAllNotificationsRead();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (notification: SystemNotificationItem) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.relatedType === 'TASK' && notification.relatedId) {
      void navigate({
        to: "/production-tasks",
        search: {
          taskId: notification.relatedId,
        },
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <i className="ri-notification-3-line text-base" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 w-4 flex items-center justify-center rounded-full p-0 text-[10px] bg-destructive text-white border-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-none border-border">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="text-sm font-medium">系统通知</span>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => markAllAsRead()}>
              全部标为已读
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">暂无通知</div>
          ) : (
            notifications.map(n => (
              <DropdownMenuItem
                key={n.id}
                className={`flex flex-col items-start gap-1 p-3 cursor-pointer border-b last:border-0 rounded-none ${n.isRead ? 'opacity-60' : 'bg-primary/5'}`}
                onClick={() => handleNotificationClick(n)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium leading-none">{n.title}</span>
                  <span className="text-[10px] text-muted-foreground">{dayjs(n.createdAt).fromNow()}</span>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2">{n.content}</span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
