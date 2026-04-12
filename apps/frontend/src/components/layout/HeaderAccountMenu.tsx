import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLogout } from "@/hooks/api/useAuth"
import { useAuthStore } from "@/store/auth.store"
import { cn } from "@/lib/utils"
import { ChangePasswordSheet } from "./ChangePasswordSheet"

interface HeaderAccountMenuProps {
  compact?: boolean
  placement?: "header" | "sidebar"
}

function getRoleLabel(role: string) {
  return role === "ADMIN" ? "管理员" : "普通用户"
}

export function HeaderAccountMenu({
  compact = false,
  placement = "header",
}: HeaderAccountMenuProps) {
  const user = useAuthStore(state => state.user)
  const logout = useLogout()
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  if (!user) {
    return null
  }

  const isSidebar = placement === "sidebar"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "border border-transparent transition-colors hover:border-border hover:bg-muted/40",
              isSidebar
                ? "h-auto w-full justify-start gap-2.5 px-2.5 py-2.5"
                : "h-9 gap-2 px-2",
            )}
          >
            {!compact && (
              <div
                className={cn(
                  "min-w-0 leading-tight",
                  isSidebar ? "flex-1 text-left" : "text-right",
                )}
              >
                <p className="truncate text-xs font-medium text-foreground">
                  {user.realName}
                </p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {getRoleLabel(user.role)}
                </p>
              </div>
            )}

            <Avatar
              size={isSidebar ? "default" : "sm"}
              className="border border-primary/20 bg-primary/10 text-primary after:hidden"
            >
              <AvatarFallback className="bg-transparent text-xs font-medium text-primary">
                {user.realName.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={isSidebar ? "start" : "end"}
          side={isSidebar ? "right" : "bottom"}
          className="w-56 rounded-none border border-border bg-background p-0 shadow-none"
        >
          <div className="border-b border-border px-3 py-3">
            <p className="text-sm font-medium text-foreground">{user.realName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{user.username}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              当前角色：{getRoleLabel(user.role)}
            </p>
          </div>

          <div className="p-1">
            <DropdownMenuItem
              className="rounded-none"
              onSelect={event => {
                event.preventDefault()
                setChangePasswordOpen(true)
              }}
            >
              <i className="ri-lock-password-line text-base" />
              修改密码
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="rounded-none"
              onSelect={event => {
                event.preventDefault()
                logout()
              }}
            >
              <i className="ri-logout-box-r-line text-base" />
              退出登录
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordSheet
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </>
  )
}
