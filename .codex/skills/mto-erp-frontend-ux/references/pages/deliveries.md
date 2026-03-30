# Deliveries 页面参考

对应设计规则：

- `design-system/pages/deliveries.md`

重点检查：

- 快速筛选与高级筛选是否分层明确
- 统计卡是否和筛选结果口径一致
- 导出预览是否稳定
- 移动端是否存在横向滚动但缺少提示的区域

主要实现文件：

- `apps/frontend/src/pages/deliveries/list/DeliveriesDesktop.tsx`
- `apps/frontend/src/pages/deliveries/list/DeliveriesMobile.tsx`
- `apps/frontend/src/pages/deliveries/DeliveryDetailPage.tsx`
