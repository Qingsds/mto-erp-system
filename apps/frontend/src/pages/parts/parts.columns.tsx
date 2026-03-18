import { createColumnHelper } from "@tanstack/react-table"
import { Badge }              from "@/components/ui/badge"
import { Button }             from "@/components/ui/button"
import type { Part }          from "./parts.schema"

const col = createColumnHelper<Part>()

export function getPartsColumns(onEdit: (p: Part) => void, onDelete: (p: Part) => void) {
  return [
    col.accessor("partNumber", {
      header: "零件编号",
      size:   110,
      cell:   (i) => (
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {i.getValue()}
        </span>
      ),
    }),

    col.accessor("name", {
      header: "零件名称",
      size:   180,
      cell:   (i) => (
        <span className="font-medium text-foreground text-sm">{i.getValue()}</span>
      ),
    }),

    col.accessor("material", {
      header: "材质",
      size:   110,
      cell:   (i) => (
        <Badge variant="secondary" className="font-normal">{i.getValue()}</Badge>
      ),
    }),

    col.accessor("spec", {
      header: "规格",
      size:   130,
      cell:   (i) => (
        <span className="text-xs text-muted-foreground">{i.getValue() ?? "—"}</span>
      ),
    }),

    col.accessor("prices", {
      header:        "价格字典",
      size:          220,
      enableSorting: false,
      cell:          (i) => (
        <div className="flex flex-wrap gap-1.5">
          {i.getValue().map((p) => (
            <span
              key={p.label}
              className="inline-flex items-center gap-1 text-xs bg-muted rounded px-1.5 py-0.5 whitespace-nowrap"
            >
              <span className="text-muted-foreground">{p.label}</span>
              <span className="font-mono font-medium text-foreground">¥{p.value}</span>
            </span>
          ))}
        </div>
      ),
    }),

    col.accessor("remark", {
      header: "备注",
      size:   140,
      cell:   (i) => (
        <span className="text-xs text-muted-foreground line-clamp-1">
          {i.getValue() || "—"}
        </span>
      ),
    }),

    col.accessor("createdAt", {
      header: "创建日期",
      size:   100,
      cell:   (i) => (
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {i.getValue().slice(0, 10)}
        </span>
      ),
    }),

    col.display({
      id:   "actions",
      size: 100,
      cell: (i) => (
        <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onEdit(i.row.original)}
          >
            <i className="ri-edit-line mr-1" />
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={() => onDelete(i.row.original)}
          >
            <i className="ri-delete-bin-line" />
          </Button>
        </div>
      ),
    }),
  ]
}
