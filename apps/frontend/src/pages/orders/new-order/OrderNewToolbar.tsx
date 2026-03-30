/**
 * 新建订单页顶栏。
 *
 * 复用通用详情页顶栏壳，统一返回、标题和提交动作的呈现方式。
 */

import { DetailPageToolbar } from "@/components/common/DetailPageToolbar"
import { Button } from "@/components/ui/button"

interface OrderNewToolbarProps {
  itemCount: number
  isSubmitting: boolean
  onCancel: () => void
  onSubmit: () => void
  showQuickActions?: boolean
}

export function OrderNewToolbar({
  itemCount,
  isSubmitting,
  onCancel,
  onSubmit,
  showQuickActions = true,
}: OrderNewToolbarProps) {
  return (
    <DetailPageToolbar
      title='新建订单'
      subtitle={`当前已添加 ${itemCount} 项零件，按录入顺序逐项填写。`}
      backLabel='返回订单列表'
      onBack={onCancel}
      actions={showQuickActions ? (
        <>
          <Button
            variant='outline'
            size='sm'
            className='h-8 w-8 px-0 sm:w-auto sm:px-2.5'
            onClick={onCancel}
          >
            <i className='ri-close-line sm:mr-1.5' />
            <span className='hidden sm:inline'>取消</span>
          </Button>
          <Button
            size='sm'
            className='h-8 px-2.5 text-xs'
            disabled={isSubmitting}
            onClick={onSubmit}
          >
            {isSubmitting ? (
              <>
                <i className='ri-loader-4-line animate-spin sm:mr-1.5' />
                <span className='hidden sm:inline'>提交中…</span>
              </>
            ) : (
              <>
                <i className='ri-check-line sm:mr-1.5' />
                <span>创建</span>
                <span className='hidden sm:inline'>订单</span>
              </>
            )}
          </Button>
        </>
      ) : undefined}
    />
  )
}
