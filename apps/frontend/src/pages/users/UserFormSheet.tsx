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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
          <Alert variant='destructive'>
            <i className='ri-error-warning-line' />
            <AlertTitle>提交失败</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <FieldGroup className='gap-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field>
              <FieldLabel>登录用户名 *</FieldLabel>
              <FieldContent>
                <Input
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  placeholder='例：admin'
                  className='h-10'
                  disabled={isEditMode}
                />
                <FieldDescription>
                  {isEditMode ? "编辑状态下不允许修改登录用户名。" : "用于系统登录和操作追溯。"}
                </FieldDescription>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>姓名 *</FieldLabel>
              <FieldContent>
                <Input
                  value={realName}
                  onChange={event => setRealName(event.target.value)}
                  placeholder='请输入姓名'
                  className='h-10'
                />
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel>账号角色 *</FieldLabel>
            <FieldContent>
              <FieldDescription>
                角色决定金额可见性，以及是否可访问对账、印章和用户管理页面。
              </FieldDescription>
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
            </FieldContent>
          </Field>

          <div className='grid gap-4 sm:grid-cols-2'>
            <Field>
              <FieldLabel>
                {isEditMode ? "重置密码" : "初始密码 *"}
              </FieldLabel>
              <FieldContent>
                <Input
                  type='password'
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder={isEditMode ? "留空则不修改" : "至少 8 位"}
                  className='h-10'
                />
                <FieldDescription>
                  {isEditMode ? "仅在需要重置密码时填写。" : "初始密码长度不能少于 8 位。"}
                </FieldDescription>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>账号状态</FieldLabel>
              <FieldContent>
                <ToggleGroup
                  type='single'
                  value={isActive ? "active" : "inactive"}
                  onValueChange={nextValue => {
                    if (nextValue === "active") setIsActive(true)
                    if (nextValue === "inactive") setIsActive(false)
                  }}
                  variant='outline'
                  size='default'
                  className='w-full'
                >
                  <ToggleGroupItem
                    value='active'
                    className='flex-1'
                  >
                    启用
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value='inactive'
                    className='flex-1'
                  >
                    停用
                  </ToggleGroupItem>
                </ToggleGroup>
                <FieldDescription>
                  停用后该账号将无法继续登录系统。
                </FieldDescription>
              </FieldContent>
            </Field>
          </div>
        </FieldGroup>

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
