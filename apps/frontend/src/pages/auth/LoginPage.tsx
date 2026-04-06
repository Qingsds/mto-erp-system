/**
 * 登录页。
 *
 * 负责：
 * - 提交用户名和密码
 * - 展示默认管理员提示
 * - 登录成功后回到 ERP 首页
 */

import { useState, type FormEvent } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLogin } from "@/hooks/api/useAuth"

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextUsername = username.trim()
    if (!nextUsername) {
      setFormError("请输入用户名")
      return
    }
    if (!password.trim()) {
      setFormError("请输入密码")
      return
    }

    try {
      setFormError(null)
      await login.mutateAsync({
        username: nextUsername,
        password,
      })
      navigate({ to: "/" })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "登录失败")
    }
  }

  return (
    <div className='flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-8'>
      <div className='w-full max-w-md border border-border bg-card'>
        <div className='border-b border-border px-5 py-4'>
          <p className='text-xs text-muted-foreground'>MTO ERP</p>
          <h1 className='mt-1 text-lg font-semibold text-foreground'>账号登录</h1>
          <p className='mt-1 text-xs text-muted-foreground'>
            登录后才能访问订单、发货、对账和印章管理。
          </p>
        </div>

        <form className='flex flex-col gap-4 px-5 py-5' onSubmit={handleSubmit}>
          {formError && (
            <div className='border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
              {formError}
            </div>
          )}

          <div className='flex flex-col gap-1.5'>
            <label className='text-xs text-muted-foreground'>用户名</label>
            <Input
              className='h-10'
              autoComplete='username'
              value={username}
              onChange={event => setUsername(event.target.value)}
              placeholder='请输入系统账号'
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <label className='text-xs text-muted-foreground'>密码</label>
            <Input
              className='h-10'
              type='password'
              autoComplete='current-password'
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder='请输入登录密码'
            />
          </div>

          <div className='border border-dashed border-border bg-muted/20 px-3 py-3 text-xs text-muted-foreground'>
            <p className='font-medium text-foreground'>首次启动默认账号</p>
            <p className='mt-1'>用户名：admin</p>
            <p className='mt-1'>密码：admin123456</p>
          </div>

          <Button type='submit' className='h-10' disabled={login.isPending}>
            {login.isPending ? (
              <>
                <i className='ri-loader-4-line mr-1.5 animate-spin' />
                登录中…
              </>
            ) : (
              <>
                <i className='ri-lock-password-line mr-1.5' />
                登录进入系统
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
