import { cn } from "@/lib/utils"

interface FormCardProps {
  title: string
  subtitle?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}

export function FormCard({
  title,
  subtitle,
  required,
  className,
  children,
}: FormCardProps) {
  return (
    <section className={cn("border border-border bg-card p-4 md:p-5 flex flex-col gap-4", className)}>
      <header>
        <h2 className='text-base font-semibold'>
          {title}
          {required && <span className='text-destructive ml-0.5'>*</span>}
        </h2>
        {subtitle && <p className='text-xs text-muted-foreground mt-0.5'>{subtitle}</p>}
      </header>
      <div className='flex flex-col gap-4'>
        {children}
      </div>
    </section>
  )
}
