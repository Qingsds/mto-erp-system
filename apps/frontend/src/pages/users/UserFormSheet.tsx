/**
 * 用户表单抽屉。
 *
 * 统一承载：
 * - 新建用户
 * - 编辑姓名 / 角色 / 状态
 * - 重置密码
 */

import { useMemo, useState } from "react"
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserRoleType,
} from "@erp/shared-types"
import { ErpSheet } from "@/components/common/ErpSheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { UserListItem } from "@/hooks/api/useUsers"
import { cn } from "@/lib/utils"

interface UserFormSheetProps {
  open: boolean
  editingUser: UserListItem | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (payload: CreateUserRequest) => Promise<void>
  onUpdate: (id: number, payload: UpdateUserRequest) => Promise<void>
}

function roleOptions(): Array<{ value: UserRoleType; label: string; description: string }> {
  return [
    {
      value: "USER",
      label: "普通用户",
      description: "不可见金额、不可访问对账和印章功能",
    },
    {
      value: "ADMIN",
      label: "管理员",
      description: "可访问全部业务页面与管理能力",
    },
  ]
}

export function UserFormSheet({
  open,
  editingUser,
  isSubmitting,
  onOpenChange,
  onCreate,
  onUpdate,
}: UserFormSheetProps) {
  const isEditMode = !!editingUser
  const [username, setUsername] = useState(editingUser?.username ?? "")
  const [realName, setRealName] = useState(editingUser?.realName ?? "")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRoleType>(editingUser?.role ?? "USER")
  const [isActive, setIsActive] = useState(editingUser?.isActive ?? true)
  const [formError, setFormError] = useState<string | null>(null)

  const sheetTitle = isEditMode ? "编辑用户" : "新增用户"
  const canSubmit = useMemo(() => {
    if (!realName.trim()) return false
    if (!isEditMode && (!username.trim() || password.trim().length < 8)) {
      return false
    }
    if (isEditMode && password.trim().length > 0 && password.trim().length < 8) {
      return false
    }
    return !isSubmitting
  }, [isEditMode, isSubmitting, password, realName, username])

  const handleSubmit = async () => {
    const trimmedRealName = realName.trim()
    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()

    if (!trimmedRealName) {
      setFormError("请输入用户姓名")
      return
    }
    if (!isEditMode && !trimmedUsername) {
      setFormError("请输入登录用户名")
      return
    }
    if (!isEditMode && trimmedPassword.length < 8) {
      setFormError("初始密码不能少于 8 位")
      return
    }
    if (isEditMode && trimmedPassword.length > 0 && trimmedPassword.length < 8) {
      setFormError("重置密码不能少于 8 位")
      return
    }

    setFormError(null)

    if (isEditMode && editingUser) {
      await onUpdate(editingUser.id, {
        realName: trimmedRealName,
        role,
        isActive,
        password: trimmedPassword || undefined,
      })
      onOpenChange(false)
      return
    }

    await onCreate({
      username: trimmedUsername,
      realName: trimmedRealName,
      role,
      password: trimmedPassword,
    })
    onOpenChange(false)
  }

  return (
    <ErpSheet
      open={open}
      onOpenChange={onOpenChange}
      title={sheetTitle}
      description={isEditMode ? "修改账号角色、状态和密码重置项" : "创建一个新的系统登录账号"}
      width={560}
    >
      <div className='flex flex-col gap-4'>
        {formError && (
          <div className='border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
            {formError}
          </div>
        )}

        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='flex flex-col gap-1.5'>
            <label className='text-xs text-muted-foreground'>登录用户名 *</label>
            <Input
              value={username}
              onChange={event => setUsername(event.target.value)}
              placeholder='例：admin'
              className='h-10'
              disabled={isEditMode}
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <label className='text-xs text-muted-foreground'>姓名 *</label>
            <Input
              value={realName}
              onChange={event => setRealName(event.target.value)}
              placeholder='请输入姓名'
              className='h-10'
            />
          </div>
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-xs text-muted-foreground'>账号角色 *</label>
          <div className='grid gap-2 sm:grid-cols-2'>
            {roleOptions().map(option => (
              <button
                key={option.value}
                type='button'
                onClick={() => setRole(option.value)}
                className={cn(
                  "border px-3 py-3 text-left transition-colors",
                  role === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-muted/30",
                )}
              >
                <p className='text-sm font-medium text-foreground'>{option.label}</p>
                <p className='mt-1 text-xs text-muted-foreground'>{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='flex flex-col gap-1.5'>
            <label className='text-xs text-muted-foreground'>
              {isEditMode ? "重置密码" : "初始密码 *"}
            </label>
            <Input
              type='password'
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder={isEditMode ? "留空则不修改" : "至少 8 位"}
              className='h-10'
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <label className='text-xs text-muted-foreground'>账号状态</label>
            <div className='flex h-10 items-center gap-2'>
              <Button
                type='button'
                variant={isActive ? "default" : "outline"}
                className='h-10 flex-1'
                onClick={() => setIsActive(true)}
              >
                启用
              </Button>
              <Button
                type='button'
                variant={!isActive ? "secondary" : "outline"}
                className='h-10 flex-1'
                onClick={() => setIsActive(false)}
              >
                停用
              </Button>
            </div>
          </div>
        </div>

        <div className='flex gap-2 pt-2'>
          <Button
            type='button'
            className='h-10 flex-1'
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <i className='ri-loader-4-line mr-1.5 animate-spin' />
                提交中…
              </>
            ) : (
              <>
                <i className='ri-check-line mr-1.5' />
                {isEditMode ? "保存修改" : "创建用户"}
              </>
            )}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-10'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
        </div>
      </div>
    </ErpSheet>
  )
}
