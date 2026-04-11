import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TopLevelPageHeaderWrapper } from "@/components/common/TopLevelPageHeaderWrapper"
import { TopLevelPageTitle } from "@/components/common/TopLevelPageTitle"
import { cn } from "@/lib/utils"
import { CustomerFormSheet } from "../CustomerFormSheet.tsx"
import type { CustomersPageSearch } from "./search"
import { useCustomersPageController } from "./useCustomersPageController"

const PAGE_SIZE = 20

function StatusPill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 cursor-pointer border border-transparent bg-transparent px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-border bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </button>
  )
}

interface CustomersMobileProps {
  search: CustomersPageSearch
}

export function CustomersMobile({ search }: CustomersMobileProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const {
    keyword,
    statusFilter,
    page,
    customers,
    totalCount,
    totalPages,
    hasActiveFilters,
    isLoading,
    isFetching,
    setKeyword,
    setStatusFilter,
    setPage,
    resetFilters,
    openDetail,
  } = useCustomersPageController({
    search,
    pageSize: PAGE_SIZE,
  })

  return (
    <>
      <div className="flex h-full flex-col">
        <TopLevelPageHeaderWrapper
          inset="page"
          bodyClassName="items-end justify-between"
          padding="mobile"
        >
          <TopLevelPageTitle
            title="客户管理"
            subtitle={isFetching && !isLoading ? "加载中…" : `共 ${totalCount} 个客户`}
            titleClassName="text-base"
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={resetFilters}
            >
              重置
            </Button>
          )}
        </TopLevelPageHeaderWrapper>

        <div className="shrink-0 border-b border-border bg-background px-4 pb-3">
          <div className="mt-3 flex h-10 items-center gap-2 border border-input bg-muted px-3">
            <i className="ri-search-line shrink-0 text-sm text-muted-foreground" />
            <input
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder="搜索客户名称/联系人/电话…"
              className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {keyword && (
              <button
                onClick={() => setKeyword("")}
                className="cursor-pointer border-none bg-transparent p-0 text-muted-foreground"
              >
                <i className="ri-close-line text-xs" />
              </button>
            )}
          </div>

          <div className="mt-2 flex gap-1 overflow-x-auto">
            <StatusPill
              active={statusFilter === "all"}
              label="全部"
              onClick={() => setStatusFilter("all")}
            />
            <StatusPill
              active={statusFilter === "active"}
              label="启用"
              onClick={() => setStatusFilter("active")}
            />
            <StatusPill
              active={statusFilter === "inactive"}
              label="停用"
              onClick={() => setStatusFilter("inactive")}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex flex-col gap-3 pb-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border border-border bg-card px-3 py-3">
                  <div className="h-3.5 w-36 animate-pulse bg-muted" />
                  <div className="mt-2 h-3 w-24 animate-pulse bg-muted" />
                </div>
              ))
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center border border-dashed border-border px-5 py-14 text-center">
                <i className="ri-building-line mb-3 text-3xl text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">
                  {hasActiveFilters ? "没有匹配的客户" : "还没有客户数据"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasActiveFilters ? "可以调整关键词或状态后重试。" : "先从新增客户开始录入。"}
                </p>
                <div className="mt-4 flex w-full gap-2">
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      className="h-10 flex-1"
                      onClick={resetFilters}
                    >
                      清空筛选
                    </Button>
                  )}
                  <Button className="h-10 flex-1" onClick={() => setCreateOpen(true)}>
                    <i className="ri-add-line mr-1.5" />
                    新增客户
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {customers.map(customer => (
                  <button
                    key={customer.id}
                    type="button"
                    className="w-full border border-border bg-card px-3 py-3 text-left transition-colors active:bg-muted/30"
                    onClick={() => openDetail(customer.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {customer.name}
                        </p>
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          {customer.contactName ?? "—"}
                          {customer.contactPhone ? ` · ${customer.contactPhone}` : ""}
                        </p>
                      </div>
                      <span
                        className={
                          customer.isActive === false
                            ? "shrink-0 border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground"
                            : "shrink-0 border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700"
                        }
                      >
                        {customer.isActive === false ? "停用" : "启用"}
                      </span>
                    </div>
                    {customer.address && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {customer.address}
                      </p>
                    )}
                  </button>
                ))}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                    <span>
                      第 {page} / {totalPages} 页
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        上一页
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-background px-4 py-3">
          <Button className="h-11 w-full" onClick={() => setCreateOpen(true)}>
            <i className="ri-add-line mr-2" />
            新增客户
          </Button>
        </div>
      </div>

      <CustomerFormSheet
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmitted={customer => {
          setCreateOpen(false)
          openDetail(customer.id)
        }}
      />
    </>
  )
}
