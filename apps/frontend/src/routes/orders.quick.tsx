import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const QuickOrderPage = lazy(() => import('@/pages/orders/quick/QuickOrderPage'))

export const Route = createFileRoute('/orders/quick')({
  component: () => (
    <Suspense fallback={<div className="p-4 text-center text-muted-foreground">加载中...</div>}>
      <QuickOrderPage />
    </Suspense>
  ),
})
