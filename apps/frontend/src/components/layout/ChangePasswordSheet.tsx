/**
 * 修改密码抽屉。
 *
 * 负责：
 * - 提交当前密码和新密码
 * - 在当前上下文展示校验错误
 * - 修改成功后清理登录态并引导重新登录
 */

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ErpSheet } from "@/components/common/ErpSheet"
import { useChangePassword, useLogout } from "@/hooks/api/useAuth"

interface ChangePasswordSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordSheet({
  open,
  onOpenChange,
}: ChangePasswordSheetProps) {
  const changePassword = useChangePassword()
  const logout = useLogout()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setFormError(null)
    changePassword.reset()
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentPassword.trim()) {
      setFormError("请输入当前密码")
      return
    }
    if (newPassword.length < 8) {
      setFormError("新密码长度不能少于 8 位")
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError("两次输入的新密码不一致")
      return
    }

    try {
      setFormError(null)
      await changePassword.mutateAsync({
        currentPassword,
        newPassword,
      })
      handleOpenChange(false)
      logout({ silent: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "密码修改失败")
    }
  }

  return (
    <ErpSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="修改登录密码"
      description="修改成功后会自动退出当前账号，请使用新密码重新登录。"
      width={460}
    >
      <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
        {formError && (
          <div className='border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
            {formError}
          </div>
        )}

        <div className='flex flex-col gap-1.5'>
          <label className='text-xs text-muted-foreground'>当前密码</label>
          <Input
            className='h-10'
            type='password'
            autoComplete='current-password'
            value={currentPassword}
            onChange={event => setCurrentPassword(event.target.value)}
            placeholder='请输入当前密码'
          />
        </div>

        <div className='flex flex-col gap-1.5'>
          <label className='text-xs text-muted-foreground'>新密码</label>
          <Input
            className='h-10'
            type='password'
            autoComplete='new-password'
            value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            placeholder='至少 8 位'
          />
        </div>

        <div className='flex flex-col gap-1.5'>
          <label className='text-xs text-muted-foreground'>确认新密码</label>
          <Input
            className='h-10'
            type='password'
            autoComplete='new-password'
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            placeholder='请再次输入新密码'
          />
        </div>

        <div className='border border-dashed border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground'>
          修改完成后，当前设备上的登录态会立即失效，需要重新登录。
        </div>

        <div className='flex items-center gap-2 pt-2'>
          <Button type='submit' className='h-10 flex-1' disabled={changePassword.isPending}>
            {changePassword.isPending ? (
              <>
                <i className='ri-loader-4-line mr-1.5 animate-spin' />
                提交中…
              </>
            ) : (
              <>
                <i className='ri-lock-password-line mr-1.5' />
                更新密码
              </>
            )}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-10 shrink-0'
            disabled={changePassword.isPending}
            onClick={() => handleOpenChange(false)}
          >
            取消
          </Button>
        </div>
      </form>
    </ErpSheet>
  )
}
