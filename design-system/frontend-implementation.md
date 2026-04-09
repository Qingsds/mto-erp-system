# MTO ERP 前端实现约束

本文件用于约束 React + Tailwind + shadcn/ui 在本仓库内的落地方式。

## 1. 组件分层

- `apps/frontend/src/components/ui/` 是唯一基础组件来源。
- `apps/frontend/src/components/common/` 只承载 ERP 通用壳层，必须建立在 `components/ui/` 之上。
- `apps/frontend/src/pages/**` 只放页面专属组件，不新增平行基础组件库。

新增 UI 时默认顺序固定为：

1. 先检查 `components/ui/` 是否已有基础组件。
2. 再检查 `components/common/` 是否已有 ERP 壳层。
3. 两层都不满足时，才允许在页面内新增临时组件。

## 2. 何时优先用 shadcn

以下场景默认优先使用 `shadcn/ui`：

- `Dialog`、`Sheet`、`DropdownMenu`、`Table`、`Card`、`Alert`
- 表单字段布局与错误态
- 互斥切换、少量状态筛选、单选/多选按钮组
- Tooltip、Badge、Skeleton、Separator 等基础反馈组件

缺少基础组件时，默认流程固定为：

1. 先读取 `apps/frontend/components.json`
2. 再检查 `apps/frontend/src/components/ui/`
3. 缺失时通过 `pnpm dlx shadcn@latest add <component>` 增补
4. 增补后必须回到 ERP 设计系统做二次收口

## 3. 何时允许自定义 ERP 壳层

以下场景允许在 `components/common/` 新增 ERP 通用壳：

- 需要同时兼顾桌面端与移动端的统一容器
- 需要绑定项目内统一宽度、边距、底部安全区
- 需要封装同一业务模式，如详情页 toolbar、底部操作栏、列表页空状态

禁止：

- 在 `components/common/` 重新发明 `Dialog`、`Sheet`、`Table`、`DropdownMenu` 的基础能力
- 页面里直接复制粘贴一套新的弹层、抽屉、筛选条实现

## 4. 表单实现规则

- `react-hook-form` 场景优先使用 `Form`
- 字段布局优先使用 `Field`、`FieldGroup`、`FieldContent`
- 标签、说明、错误必须在同一字段结构内收拢
- 不再默认使用裸 `label + div + p` 反复手写同一套字段结构

## 5. 弹层与筛选规则

- 页面内优先复用 `ErpSheet`、`DocumentDialogShell` 等现有 ERP 壳
- 新弹层默认先从 `components/ui/dialog.tsx`、`components/ui/sheet.tsx` 组合
- 少量互斥状态切换优先使用 `ToggleGroup` 或 `Tabs`
- 列表页筛选条不再默认手写 `button` 阵列，除非现有组件不适配

## 6. 视觉约束

- 零圆角优先级高于 shadcn 默认圆角
- 优先使用现有 token，不引入平行色板
- 业务状态、可扫描性、操作效率优先于装饰感
- 所有新增基座组件都必须回到 ERP 视觉规则下调整，不能直接照搬官方 demo
