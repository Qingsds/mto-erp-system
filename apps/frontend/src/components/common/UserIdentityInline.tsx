import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserIdentityInlineProps {
  user?: {
    realName?: string | null
  } | null
  placeholder?: string
  className?: string
  textClassName?: string
}

function resolveFallback(realName?: string | null) {
  const normalized = realName?.trim()
  return normalized ? normalized.slice(0, 1).toUpperCase() : ""
}

export function UserIdentityInline({
  user,
  placeholder = "--",
  className,
  textClassName,
}: UserIdentityInlineProps) {
  const realName = user?.realName?.trim()

  if (!realName) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {placeholder}
      </span>
    )
  }

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <Avatar
        size='sm'
        className='border border-border bg-muted text-muted-foreground after:hidden'
      >
        <AvatarFallback className='bg-transparent text-[10px] font-medium text-foreground'>
          {resolveFallback(realName)}
        </AvatarFallback>
      </Avatar>
      <span className={cn("truncate text-sm text-foreground", textClassName)}>
        {realName}
      </span>
    </span>
  )
}
