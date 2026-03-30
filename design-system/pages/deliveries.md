# Deliveries 模块规则

适用页面：

- `apps/frontend/src/pages/deliveries/DeliveriesPage.tsx`
- `apps/frontend/src/pages/deliveries/list/DeliveriesDesktop.tsx`
- `apps/frontend/src/pages/deliveries/list/DeliveriesMobile.tsx`
- `apps/frontend/src/pages/deliveries/DeliveryDetailPage.tsx`

## 1. 列表页筛选层级

发货列表筛选较多，必须分层：

- 快速筛选：关键字、日期范围、状态
- 高级筛选：订单 ID、客户名、备注等

规则：

- 桌面端可直接展示完整筛选区，但视觉上要区分快速筛选与高级筛选
- 移动端高级筛选默认折叠
- 有激活筛选时必须能一键重置

## 2. 统计卡

- 统计卡优先服务筛选联动，例如总数、涉及订单数、有备注数
- 卡片文案要说明统计口径是“当前筛选结果”还是“全量数据”
- 卡片数量控制在 3 张内，避免抢占表格空间

## 3. 详情页

- 顶部固定显示发货单号和主状态
- 导出是主次级操作，不应抢占主状态层级
- 发货项表格优先展示数量、金额、关联订单项信息
- 备注内容应支持换行与完整查看，不要默认截断到不可读

## 4. 导出预览

- 导出预览弹窗优先保证内容稳定，不反复闪烁
- 预览配置变化时可以延迟重算，但不要阻断用户继续浏览
- 后续若加入导出历史，应置于导出区域次级层

## 5. 移动端

- 筛选入口与查询按钮放在首屏顶部
- 横向滚动表格必须提供滑动暗示
- 卡片列表每张卡片优先展示状态、单号、关联订单、日期、备注摘要
