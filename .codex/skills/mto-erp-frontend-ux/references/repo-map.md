# 仓库页面映射

调用该 skill 时，先按模块定位真实文件，再读对应 `design-system/pages/*.md`。

## 全局壳层与 token

- `apps/frontend/src/index.css`
- `apps/frontend/src/components/layout/AppLayout.tsx`
- `apps/frontend/src/components/layout/BottomNav.tsx`
- `apps/frontend/src/components/common`
- `apps/frontend/src/components/ui`

## Dashboard

- `apps/frontend/src/pages/dashboard/DashboardPage.tsx`

## Parts

- `apps/frontend/src/pages/parts/PartsPage.tsx`
- `apps/frontend/src/pages/parts/PartDetailPage.tsx`
- `apps/frontend/src/hooks/api/useParts.ts`

## Orders

- `apps/frontend/src/pages/orders/OrdersPage.tsx`
- `apps/frontend/src/pages/orders/OrderDetailPage.tsx`
- `apps/frontend/src/pages/orders/detail`

## Deliveries

- `apps/frontend/src/pages/deliveries/DeliveriesPage.tsx`
- `apps/frontend/src/pages/deliveries/list/DeliveriesDesktop.tsx`
- `apps/frontend/src/pages/deliveries/list/DeliveriesMobile.tsx`
- `apps/frontend/src/pages/deliveries/DeliveryDetailPage.tsx`

## Billing

- `apps/frontend/src/pages/billing/BillingPage.tsx`
- `apps/frontend/src/pages/billing/CreateBillingSheet.tsx`
- `apps/frontend/src/components/billing/ExecuteSealDialog.tsx`

## Seals

- `apps/frontend/src/pages/seals/SealsPage.tsx`
- `apps/frontend/src/pages/seals/CreateSealSheet.tsx`

## 使用规则

- 先读总则，再读模块覆盖文档，再看真实代码。
- 如果建议涉及移动端底部栏，必须检查 `AppLayout` 与 `BottomNav` 的实际滚动关系。
- 如果建议涉及组件替换，优先从现有 `components/common` 与 `components/ui` 中找可复用件。
