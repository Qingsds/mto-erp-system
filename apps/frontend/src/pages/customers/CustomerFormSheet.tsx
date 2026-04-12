import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ErpSheet } from "@/components/common/ErpSheet"
import {
  useCreateCustomer,
  useUpdateCustomer,
  type CustomerListItem,
  type CustomerSubmitted,
} from "@/hooks/api/useCustomers"

type CustomerFormMode = "create" | "edit"

interface CustomerFormSheetProps {
  mode: CustomerFormMode
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: CustomerListItem | null
  onSubmitted?: (customer: CustomerSubmitted) => void
}

export function CustomerFormSheet({
  mode,
  open,
  onOpenChange,
  customer = null,
  onSubmitted,
}: CustomerFormSheetProps) {
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()

  const title = mode === "edit" ? "编辑客户" : "新增客户"
  const description = useMemo(
    () =>
      mode === "edit"
        ? "更新客户资料。客户名称建议保持唯一，便于订单选择。"
        : "录入客户基础资料。地址、联系人、电话、开票信息均可后补。",
    [mode],
  )

  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [invoiceInfo, setInvoiceInfo] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setError(null)
    setName(customer?.name ?? "")
    setAddress(customer?.address ?? "")
    setContactName(customer?.contactName ?? "")
    setContactPhone(customer?.contactPhone ?? "")
    setInvoiceInfo(customer?.invoiceInfo ?? "")
  }, [customer, open])

  const isSubmitting = createCustomer.isPending || updateCustomer.isPending
  const canSubmit = name.trim().length > 0 && !isSubmitting

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("客户名称不能为空")
      return
    }

    try {
      setError(null)
      if (mode === "create") {
        const res = await createCustomer.mutateAsync({
          name: trimmedName,
          address: address.trim() || null,
          contactName: contactName.trim() || null,
          contactPhone: contactPhone.trim() || null,
          invoiceInfo: invoiceInfo.trim() || null,
        })
        const nextCustomer = res.data!
        onSubmitted?.(nextCustomer)
        onOpenChange(false)
        return
      }

      if (!customer?.id) {
        setError("客户信息不完整，请刷新后重试")
        return
      }

      const res = await updateCustomer.mutateAsync({
        id: customer.id,
        name: trimmedName,
        address: address.trim() || null,
        contactName: contactName.trim() || null,
        contactPhone: contactPhone.trim() || null,
        invoiceInfo: invoiceInfo.trim() || null,
      })
      const nextCustomer = res.data!
      onSubmitted?.(nextCustomer)
      onOpenChange(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : "提交失败")
    }
  }

  return (
    <ErpSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      width={560}
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customer-name">
            客户名称 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="customer-name"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="例：某某机械有限公司"
            className="h-10"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customer-address">地址</Label>
          <Input
            id="customer-address"
            value={address}
            onChange={event => setAddress(event.target.value)}
            placeholder="选填"
            className="h-10"
            autoComplete="off"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-contact-name">联系人</Label>
            <Input
              id="customer-contact-name"
              value={contactName}
              onChange={event => setContactName(event.target.value)}
              placeholder="选填"
              className="h-10"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customer-contact-phone">联系电话</Label>
            <Input
              id="customer-contact-phone"
              value={contactPhone}
              onChange={event => setContactPhone(event.target.value)}
              placeholder="选填"
              className="h-10"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customer-invoice-info">开票信息</Label>
          <textarea
            id="customer-invoice-info"
            rows={4}
            value={invoiceInfo}
            onChange={event => setInvoiceInfo(event.target.value)}
            placeholder="选填：纳税人识别号、开户行、账号、地址电话等"
            className="w-full resize-none border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
        </div>

        <div className="flex items-stretch gap-2 pt-2">
          <Button
            className="h-10 flex-1"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <i className="ri-loader-4-line mr-1.5 animate-spin" />
                提交中…
              </>
            ) : (
              <>
                <i className="ri-check-line mr-1.5" />
                确认保存
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
        </div>
      </div>
    </ErpSheet>
  )
}
