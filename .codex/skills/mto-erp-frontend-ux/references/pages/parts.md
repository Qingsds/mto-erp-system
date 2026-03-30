# Parts 页面参考

对应设计规则：

- `design-system/pages/parts.md`

重点检查：

- 图纸区是否始终是一等信息
- 上传限制、错误提示、历史版本是否在当前上下文闭环
- 价格展示是否优先“标准价”
- 列表与详情是否保持高信息密度而不过度堆叠

主要实现文件：

- `apps/frontend/src/pages/parts/PartsPage.tsx`
- `apps/frontend/src/pages/parts/PartDetailPage.tsx`
- `apps/frontend/src/hooks/api/useParts.ts`
