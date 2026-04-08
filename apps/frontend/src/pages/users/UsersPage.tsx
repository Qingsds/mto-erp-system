/**
 * 用户管理页。
 *
 * 当前只面向管理员开放，负责：
 * - 查看账号列表
 * - 新增用户
 * - 修改角色 / 状态 / 密码
 */

import { useMemo, useState } from "react"
import { TopLevelPageWrapper } from "@/components/common/TopLevelPageWrapper"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/ui.store"
import {
  useCreateUser,
  useGetUsers,
  useUpdateUser,
  type UserListItem,
} from "@/hooks/api/useUsers"
import { UserFormSheet } from "./UserFormSheet"

function RoleBadge({ role }: { role: UserListItem["role"] }) {
  const label = role === "ADMIN" ? "管理员" : "普通用户"
  const className =
    role === "ADMIN"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-border bg-muted/40 text-muted-foreground"

  return (
    <span className={`inline-flex border px-2 py-0.5 text-[11px] ${className}`}>
      {label}
    </span>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={
        isActive
          ? "inline-flex border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700"
          : "inline-flex border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
      }
    >
      {isActive ? "启用中" : "已停用"}
    </span>
  )
}

export function UsersPage() {
  const { isMobile } = useUIStore()
  const { data: users = [], isLoading, isFetching, isError, error } = useGetUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  const [editingUser, setEditingUser] = useState<UserListItem | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const summary = useMemo(() => {
    const activeCount = users.filter(user => user.isActive).length
    const adminCount = users.filter(user => user.role === "ADMIN").length

    return {
      total: users.length,
      active: activeCount,
      inactive: Math.max(0, users.length - activeCount),
      admin: adminCount,
    }
  }, [users])

  const openCreate = () => {
    setEditingUser(null)
    setSheetOpen(true)
  }

  const openEdit = (user: UserListItem) => {
    setEditingUser(user)
    setSheetOpen(true)
  }

  const handleToggleActive = async (user: UserListItem) => {
    await updateUser.mutateAsync({
      id: user.id,
      isActive: !user.isActive,
    })
  }

  return (
    <>
      <TopLevelPageWrapper>
        <section className='border border-border bg-card px-4 py-4 sm:px-5'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <h1 className='text-base font-semibold text-foreground'>用户管理</h1>
              <p className='mt-1 text-xs text-muted-foreground'>
                管理登录账号、角色权限和账号启停状态。
              </p>
            </div>

            <Button className='h-10 shrink-0' onClick={openCreate}>
              <i className='ri-user-add-line mr-1.5' />
              新增用户
            </Button>
          </div>

          <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <article className='border border-border bg-muted/20 px-3 py-3'>
              <p className='text-xs text-muted-foreground'>账号总数</p>
              <p className='mt-1 text-lg font-semibold text-foreground'>{summary.total}</p>
            </article>
            <article className='border border-border bg-muted/20 px-3 py-3'>
              <p className='text-xs text-muted-foreground'>启用中</p>
              <p className='mt-1 text-lg font-semibold text-foreground'>{summary.active}</p>
            </article>
            <article className='border border-border bg-muted/20 px-3 py-3'>
              <p className='text-xs text-muted-foreground'>已停用</p>
              <p className='mt-1 text-lg font-semibold text-foreground'>{summary.inactive}</p>
            </article>
            <article className='border border-border bg-muted/20 px-3 py-3'>
              <p className='text-xs text-muted-foreground'>管理员</p>
              <p className='mt-1 text-lg font-semibold text-foreground'>{summary.admin}</p>
            </article>
          </div>
        </section>

        {isError && (
          <div className='border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
            查询失败：{error instanceof Error ? error.message : "用户列表加载失败"}
          </div>
        )}

        <section className='border border-border bg-card'>
          <div className='border-b border-border px-4 py-3 sm:px-5'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <h2 className='text-sm font-semibold text-foreground'>账号列表</h2>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {isFetching && !isLoading ? "刷新中…" : `当前共 ${users.length} 个账号`}
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className='space-y-3 px-4 py-4 sm:px-5'>
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className='h-16 animate-pulse border border-border bg-muted/40' />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className='px-4 py-16 text-center sm:px-5'>
              <i className='ri-user-line text-3xl text-muted-foreground/40' />
              <p className='mt-3 text-sm font-medium text-foreground'>还没有其他账号</p>
              <p className='mt-1 text-xs text-muted-foreground'>先创建一个普通用户或管理员账号。</p>
              <Button className='mt-4 h-10' onClick={openCreate}>
                <i className='ri-user-add-line mr-1.5' />
                新增用户
              </Button>
            </div>
          ) : isMobile ? (
            <div className='flex flex-col gap-3 px-4 py-4 sm:px-5'>
              {users.map(user => (
                <article key={user.id} className='border border-border bg-background px-3 py-3'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='text-sm font-medium text-foreground'>{user.realName}</p>
                      <p className='mt-1 font-mono text-[11px] text-muted-foreground'>
                        {user.username} · ID {user.id}
                      </p>
                    </div>
                    <div className='flex flex-col items-end gap-1.5'>
                      <RoleBadge role={user.role} />
                      <StatusBadge isActive={user.isActive} />
                    </div>
                  </div>

                  <div className='mt-3 flex gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-9 flex-1'
                      onClick={() => openEdit(user)}
                    >
                      编辑
                    </Button>
                    <Button
                      type='button'
                      variant={user.isActive ? "secondary" : "default"}
                      className='h-9 flex-1'
                      onClick={() => void handleToggleActive(user)}
                      disabled={updateUser.isPending}
                    >
                      {user.isActive ? "停用" : "启用"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='min-w-full border-collapse text-sm'>
                <thead>
                  <tr className='border-b border-border text-left text-xs text-muted-foreground'>
                    <th className='px-5 py-3 font-medium'>姓名</th>
                    <th className='px-5 py-3 font-medium'>用户名</th>
                    <th className='px-5 py-3 font-medium'>角色</th>
                    <th className='px-5 py-3 font-medium'>状态</th>
                    <th className='px-5 py-3 font-medium'>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className='border-b border-border last:border-b-0'>
                      <td className='px-5 py-3'>
                        <div>
                          <p className='font-medium text-foreground'>{user.realName}</p>
                          <p className='mt-1 text-[11px] text-muted-foreground'>ID {user.id}</p>
                        </div>
                      </td>
                      <td className='px-5 py-3 font-mono text-xs text-muted-foreground'>
                        {user.username}
                      </td>
                      <td className='px-5 py-3'>
                        <RoleBadge role={user.role} />
                      </td>
                      <td className='px-5 py-3'>
                        <StatusBadge isActive={user.isActive} />
                      </td>
                      <td className='px-5 py-3'>
                        <div className='flex items-center gap-2'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-8 px-2.5 text-xs'
                            onClick={() => openEdit(user)}
                          >
                            编辑
                          </Button>
                          <Button
                            type='button'
                            variant={user.isActive ? "secondary" : "default"}
                            size='sm'
                            className='h-8 px-2.5 text-xs'
                            onClick={() => void handleToggleActive(user)}
                            disabled={updateUser.isPending}
                          >
                            {user.isActive ? "停用" : "启用"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </TopLevelPageWrapper>

      <UserFormSheet
        key={`${editingUser ? `edit-${editingUser.id}` : "create"}-${sheetOpen ? "open" : "closed"}`}
        open={sheetOpen}
        editingUser={editingUser}
        isSubmitting={createUser.isPending || updateUser.isPending}
        onOpenChange={setSheetOpen}
        onCreate={createUser.mutateAsync}
        onUpdate={(id, payload) => updateUser.mutateAsync({ id, ...payload })}
      />
    </>
  )
}
