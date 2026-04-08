import { Button } from "@/components/ui/button"

/**
 * 文档导出入口按钮。
 *
 * 统一详情页顶栏中的导出动作视觉与移动端压缩规则，
 * 业务层只传文案和点击事件，不再各写一套按钮结构。
 */
interface DocumentExportActionButtonProps {
  label: string
  onClick: () => void
  compactOnMobile?: boolean
}

export function DocumentExportActionButton({
  label,
  onClick,
  compactOnMobile = true,
}: DocumentExportActionButtonProps) {
  return (
    <Button
      size='sm'
      variant='outline'
      className={
        compactOnMobile
          ? "h-8 w-8 px-0 text-xs sm:w-auto sm:px-2.5"
          : "h-8 px-2.5 text-xs"
      }
      onClick={onClick}
    >
      <i className='ri-download-2-line sm:mr-1.5' />
      <span className={compactOnMobile ? "hidden sm:inline" : ""}>
        {label}
      </span>
    </Button>
  )
}
