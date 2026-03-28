import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ErpSheet } from "@/components/common/ErpSheet"
import { useCreateSeal } from "@/hooks/api/useSeals"

interface CreateSealSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSealSheet({ open, onOpenChange }: CreateSealSheetProps) {
  const [name, setName] = useState("")
  const [fileKey, setFileKey] = useState("")
  const createSeal = useCreateSeal()

  const canSubmit = name.trim().length > 0 && fileKey.trim().length > 0

  const handleSubmit = async () => {
    if (!canSubmit) return
    await createSeal.mutateAsync({ name: name.trim(), fileKey: fileKey.trim() })
    setName("")
    setFileKey("")
    onOpenChange(false)
  }

  return (
    <ErpSheet
      open={open}
      onOpenChange={onOpenChange}
      title="注册新印章"
      description="印章注册后即可用于对账单、发货单、订单的电子盖章"
      width={480}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">印章名称 *</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例：公司公章"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">文件 Key *</label>
          <Input
            value={fileKey}
            onChange={e => setFileKey(e.target.value)}
            placeholder="例：seals/company-seal.png"
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            印章图片在存储服务中的路径标识
          </p>
        </div>

        <div className="flex items-stretch gap-2 pt-2">
          <Button
            className="h-10 flex-1"
            onClick={handleSubmit}
            disabled={!canSubmit || createSeal.isPending}
          >
            {createSeal.isPending ? (
              <><i className="ri-loader-4-line animate-spin mr-1.5" />注册中…</>
            ) : (
              <><i className="ri-seal-line mr-1.5" />注册印章</>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
        </div>
      </div>
    </ErpSheet>
  )
}
