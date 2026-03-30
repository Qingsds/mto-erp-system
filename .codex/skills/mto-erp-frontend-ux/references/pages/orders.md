# Orders 页面参考

对应设计规则：

- `design-system/pages/orders.md`

重点检查：

- 状态分段是否承担主筛选职责
- 搜索维度和占位文案是否一致
- 详情页是否先展示进度与状态，再展示明细
- 移动端底部操作栏是否可达且不悬空

主要实现文件：

- `apps/frontend/src/pages/orders/OrdersPage.tsx`
- `apps/frontend/src/pages/orders/OrderDetailPage.tsx`
- `apps/frontend/src/pages/orders/detail`
