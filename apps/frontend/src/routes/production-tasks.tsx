import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import {
  validateProductionTasksPageSearch,
  type ProductionTasksPageSearch,
} from '@/pages/production-tasks/search';

const ProductionTasksPage = lazy(() => import('@/pages/production-tasks/ProductionTasksPage'));

export const Route = createFileRoute('/production-tasks')({
  validateSearch: (
    search: Record<string, unknown>,
  ): ProductionTasksPageSearch => validateProductionTasksPageSearch(search),
  component: () => (
    <Suspense fallback={<div className="p-4 text-center text-muted-foreground">加载中...</div>}>
      <ProductionTasksPage search={Route.useSearch()} />
    </Suspense>
  ),
});
