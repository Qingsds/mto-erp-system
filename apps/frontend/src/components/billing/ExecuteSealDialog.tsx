import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useGetSeals } from "@/hooks/api/useSeals"
import { useExecuteSeal } from "@/hooks/api/useSeals"
import { cn } from "@/lib/utils"

interface ExecuteSealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  billingId: number
  billingNo: string
}

export function ExecuteSealDialog({
  open,
  onOpenChange,
  billingId,
  billingNo,
}: ExecuteSealDialogProps) {
  const [selectedSealId, setSelectedSealId] = useState<number | null>(null)
  const { data: seals = [] } = useGetSeals()
  const executeSeal = useExecuteSeal()

  const handleConfirm = async () => {
    if (!selectedSealId) return
    await executeSeal.mutateAsync({
      targetType: "BILLING",
      targetId: billingId,
      sealId: selectedSealId,
      userId: 1,
    })
    setSelectedSealId(null)
    onOpenChange(false)
  }

  const handleOpenChange = (o: boolean) => {
    if (!o) setSelectedSealId(null)
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>为 {billingNo} 盖章</DialogTitle>
          <DialogDescription>
            盖章后对账单状态将自动流转为「已盖章」，操作不可撤销
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          <p className="text-xs text-muted-foreground mb-1">选择印章</p>
          {seals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              暂无可用印章，请先在印章管理中注册
            </p>
          ) : (
            seals.map(seal => (
              <button
                key={seal.id}
                onClick={() => setSelectedSealId(seal.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer",
                  selectedSealId === seal.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent",
                )}
              >
                <div className={cn(
                  "h-4 w-4 rounded-full border-2 shrink-0 transition-colors",
                  selectedSealId === seal.id
                    ? "border-primary bg-primary"
                    : "border-muted-foreground",
                )} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{seal.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">
                    {seal.fileKey}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={executeSeal.isPending}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedSealId || executeSeal.isPending}
          >
            {executeSeal.isPending ? (
              <><i className="ri-loader-4-line animate-spin mr-1.5" />盖章中…</>
            ) : (
              <><i className="ri-seal-line mr-1.5" />确认盖章</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
