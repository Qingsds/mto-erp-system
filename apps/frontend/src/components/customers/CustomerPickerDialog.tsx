import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useGetCustomers, type CustomerListItem } from "@/hooks/api/useCustomers"

const PAGE_SIZE = 20

interface CustomerPickerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (customer: Pick<CustomerListItem, "id" | "name">) => void
  allowCreate?: boolean
  onCreate?: () => void
}

export function CustomerPickerDialog({
  isOpen,
  onClose,
  onSelect,
  allowCreate,
  onCreate,
}: CustomerPickerDialogProps) {
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const debouncedKeyword = useDebouncedValue(keyword.trim(), 250)

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword])

  useEffect(() => {
    if (!isOpen) {
      setKeyword("")
      setPage(1)
    }
  }, [isOpen])

  const { data, isLoading, isFetching } = useGetCustomers(
    {
      page,
      pageSize: PAGE_SIZE,
      keyword: debouncedKeyword || undefined,
      isActive: "true",
    },
    { enabled: isOpen },
  )

  const customers = data?.data ?? []
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return customers

    return customers.filter(c => c.name.toLowerCase().includes(q))
  }, [customers, keyword])

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>选择客户</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="搜索客户名称"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="h-10"
            />
            {allowCreate && (
              <Button type="button" className="h-10 shrink-0" onClick={onCreate}>
                <i className="ri-add-line mr-1.5" />
                新增客户
              </Button>
            )}
          </div>

          <div className="border border-border">
            <div className="max-h-[360px] overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  加载中...
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  未找到客户
                </div>
              ) : (
                filtered.map(customer => (
                  <button
                    key={customer.id}
                    type="button"
                    className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 text-left hover:bg-muted/40 last:border-b-0"
                    onClick={() => {
                      onSelect({ id: customer.id, name: customer.name })
                      onClose()
                    }}
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-foreground">
                      {customer.name}
                    </span>
                    <i className="ri-arrow-right-s-line shrink-0 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {isFetching && !isLoading
                ? "正在刷新..."
                : `共 ${total} 个客户，当前第 ${page} / ${totalPages} 页`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                上一页
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>

          {!allowCreate && (
            <div className="text-xs text-muted-foreground">
              未找到客户时，请联系管理员新增客户后再继续操作。
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
