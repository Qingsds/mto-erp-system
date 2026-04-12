import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  useGetCustomers,
  type CustomerListItem,
} from "@/hooks/api/useCustomers"
import type { PartCustomerItem } from "@/hooks/api/useParts"

interface PartCustomerAssignmentFieldProps {
  value: number[]
  onChange: (value: number[]) => void
  selectedCustomers?: PartCustomerItem[]
}

function toggleCustomerId(current: number[], customerId: number) {
  if (current.includes(customerId)) {
    return current.filter(id => id !== customerId)
  }

  return [...current, customerId]
}

export function PartCustomerAssignmentField({
  value,
  onChange,
  selectedCustomers = [],
}: PartCustomerAssignmentFieldProps) {
  const [query, setQuery] = useState("")
  const { data, isLoading } = useGetCustomers({
    page: 1,
    pageSize: 500,
  })

  const customers = useMemo(() => {
    const map = new Map<number, CustomerListItem | PartCustomerItem>()

    for (const customer of data?.data ?? []) {
      map.set(customer.id, customer)
    }

    for (const customer of selectedCustomers) {
      if (!map.has(customer.id)) {
        map.set(customer.id, customer)
      }
    }

    return [...map.values()]
  }, [data?.data, selectedCustomers])

  const filteredCustomers = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) {
      return customers
    }

    return customers.filter(customer =>
      customer.name.toLowerCase().includes(keyword),
    )
  }, [customers, query])

  return (
    <div className='flex flex-col gap-2'>
      <Input
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder='搜索并勾选可用客户，留空表示暂不限制'
        className='h-9'
      />

      <div className='border border-border bg-background'>
        <div className='border-b border-border px-3 py-2 text-[11px] text-muted-foreground'>
          {isLoading
            ? "正在加载客户..."
            : value.length > 0
              ? `已关联 ${value.length} 个客户；未关联的旧零件仍可继续使用`
              : "未关联客户，旧数据与过渡期零件可继续正常使用"}
        </div>

        <div className='max-h-44 overflow-y-auto'>
          {filteredCustomers.length === 0 ? (
            <div className='px-3 py-6 text-center text-xs text-muted-foreground'>
              没有匹配的客户
            </div>
          ) : (
            filteredCustomers.map(customer => {
              const checked = value.includes(customer.id)

              return (
                <label
                  key={customer.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-b-0",
                    checked && "bg-primary/5",
                  )}
                >
                  <div className='min-w-0'>
                    <p className='truncate text-sm text-foreground'>
                      {customer.name}
                    </p>
                    {"isActive" in customer && customer.isActive === false && (
                      <p className='mt-0.5 text-[11px] text-amber-600'>
                        已停用，但保留历史关联
                      </p>
                    )}
                  </div>
                  <input
                    type='checkbox'
                    checked={checked}
                    onChange={() => onChange(toggleCustomerId(value, customer.id))}
                    className='h-4 w-4 shrink-0 accent-current'
                  />
                </label>
              )
            })
          )}
        </div>
      </div>

      {value.length > 0 && (
        <p className='text-xs text-muted-foreground'>
          新订单选中客户后，将优先展示这些已关联零件；未关联零件仍保留兼容入口。
        </p>
      )}
    </div>
  )
}
