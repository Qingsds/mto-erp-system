import { DetailPageToolbar } from "@/components/common/DetailPageToolbar"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
  title: string
  subtitle: string
  onBack: () => void
  onCancel: () => void
  onSubmit: () => void
  isSubmitting: boolean
  canSubmit: boolean
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  onCancel,
  onSubmit,
  isSubmitting,
  canSubmit,
}: PageHeaderProps) {
  return (
    <DetailPageToolbar
      title={title}
      subtitle={subtitle}
      backLabel=''
      onBack={onBack}
      actions={
        <div className='hidden sm:flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={onCancel}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            size='sm'
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <i className='ri-loader-4-line animate-spin mr-1.5' />
                提交中…
              </>
            ) : (
              <>
                <i className='ri-check-line mr-1.5' />
                创建对账单
              </>
            )}
          </Button>
        </div>
      }
    />
  )
}
