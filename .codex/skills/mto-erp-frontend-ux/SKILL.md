---
name: mto-erp-frontend-ux
description: 在 MTO ERP 项目中处理 React、Vite、Tailwind v4、shadcn/ui 的 ERP 页面重构、界面统一、移动端优化、空状态/错误状态/loading/筛选体验优化时使用。适用于列表、详情、表单、统计卡、底部操作栏等内部业务页面，且必须遵循仓库 design-system 文档、保持零圆角、信息密度优先、复用现有 token 与布局壳，不把 ERP 页面改成通用 SaaS landing 风格。
---

# MTO ERP Frontend UX

## Workflow

1. 先读 [../../../design-system/MASTER.md](../../../design-system/MASTER.md)。
2. 根据任务模块读取对应页面覆盖文档：
   - Dashboard: [../../../design-system/pages/dashboard.md](../../../design-system/pages/dashboard.md)
   - Parts: [../../../design-system/pages/parts.md](../../../design-system/pages/parts.md)
   - Orders: [../../../design-system/pages/orders.md](../../../design-system/pages/orders.md)
   - Deliveries: [../../../design-system/pages/deliveries.md](../../../design-system/pages/deliveries.md)
   - Billing: [../../../design-system/pages/billing.md](../../../design-system/pages/billing.md)
   - Seals: [../../../design-system/pages/seals.md](../../../design-system/pages/seals.md)
3. 再读 [references/repo-map.md](references/repo-map.md) 和相关 [references/pages/](references/pages/) 文件，定位真实页面文件。
4. 最后检查真实代码实现，确认当前布局壳、token、组件复用点和移动端约束。

## Output Rules

- 先给问题，再给改法。
- 优先保留现有信息架构、业务路径和模块结构。
- 所有建议都要映射到真实仓库文件，不输出脱离项目的 demo 方案。
- 改代码时优先复用现有 `shadcn/ui`、项目布局壳、已有 token 和交互模式。

## Hard Constraints

- 不新增与现有设计系统冲突的字体、色板、圆角体系。
- 不把 ERP 页面改成营销页、品牌官网或通用 SaaS landing 风格。
- 不做大面积主题重置，不靠重动效或装饰图形建立层级。
- 优先优化效率、可扫描性、状态反馈、移动端可达性。
