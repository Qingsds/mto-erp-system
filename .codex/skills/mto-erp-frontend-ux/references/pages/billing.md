# Billing 页面参考

对应设计规则：

- `design-system/pages/billing.md`

重点检查：

- 页面是否是“可操作的状态流转页”，而非只读卡片墙
- 卡片信息是否足够支撑决策
- 写操作是否集中在标题区和卡片操作区
- 卡片级 loading 和错误反馈是否到位

主要实现文件：

- `apps/frontend/src/pages/billing/BillingPage.tsx`
- `apps/frontend/src/pages/billing/CreateBillingSheet.tsx`
- `apps/frontend/src/components/billing/ExecuteSealDialog.tsx`
