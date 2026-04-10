export type LayoutRoutePath = string

export interface LayoutNavItem {
  to: LayoutRoutePath
  label: string
  shortLabel?: string
  description: string
  icon: string
  iconActive: string
  aliases?: string[]
  adminOnly?: boolean
  showInSidebar?: boolean
  showInBottomNav?: boolean
  searchable?: boolean
}

export interface LayoutNavSection {
  id: string
  label: string
  items: LayoutNavItem[]
}

export interface LayoutQuickAction {
  id: string
  label: string
  description: string
  icon: string
  to: LayoutRoutePath
  aliases?: string[]
  adminOnly?: boolean
  searchable?: boolean
}

export interface LayoutCommandItem {
  id: string
  label: string
  description: string
  icon: string
  kind: "page" | "action"
  to?: LayoutRoutePath
  aliases: string[]
}

export interface LayoutLocation {
  pageLabel: string
  mobileLabel: string
  breadcrumbs: Array<{ label: string; to?: LayoutRoutePath }>
}

export const LAYOUT_NAV_SECTIONS: LayoutNavSection[] = [
  {
    id: "overview",
    label: "概览",
    items: [
      {
        to: "/",
        label: "仪表盘",
        shortLabel: "首页",
        description: "查看今日业务概览、待办和交付进度。",
        icon: "ri-dashboard-line",
        iconActive: "ri-dashboard-fill",
        aliases: ["首页", "dashboard", "概览"],
        showInSidebar: true,
        showInBottomNav: true,
        searchable: true,
      },
    ],
  },
  {
    id: "operations",
    label: "业务管理",
    items: [
      {
        to: "/parts",
        label: "零件库",
        shortLabel: "零件",
        description: "管理零件资料、图纸和价格快照。",
        icon: "ri-settings-3-line",
        iconActive: "ri-settings-3-fill",
        aliases: ["零件", "part", "图纸"],
        showInSidebar: true,
        showInBottomNav: true,
        searchable: true,
      },
      {
        to: "/orders",
        label: "订单管理",
        shortLabel: "订单",
        description: "查看订单状态、进度与交付安排。",
        icon: "ri-file-list-3-line",
        iconActive: "ri-file-list-3-fill",
        aliases: ["订单", "工单", "order"],
        showInSidebar: true,
        showInBottomNav: true,
        searchable: true,
      },
      {
        to: "/deliveries",
        label: "发货管理",
        shortLabel: "发货",
        description: "跟踪发货单、交付状态和历史记录。",
        icon: "ri-truck-line",
        iconActive: "ri-truck-fill",
        aliases: ["发货", "delivery", "物流"],
        showInSidebar: true,
        showInBottomNav: true,
        searchable: true,
      },
      {
        to: "/billing",
        label: "财务对账",
        shortLabel: "对账",
        description: "管理对账单、归档文件和盖章流转。",
        icon: "ri-bank-card-line",
        iconActive: "ri-bank-card-fill",
        aliases: ["对账", "billing", "财务"],
        adminOnly: true,
        showInSidebar: true,
        searchable: true,
      },
    ],
  },
  {
    id: "archive",
    label: "系统管理",
    items: [
      {
        to: "/seals",
        label: "印章管理",
        description: "管理印章、盖章日志和归档流。",
        icon: "ri-award-line",
        iconActive: "ri-award-fill",
        aliases: ["印章", "盖章", "seals"],
        adminOnly: true,
        showInSidebar: true,
        searchable: true,
      },
      {
        to: "/users",
        label: "用户管理",
        description: "维护用户账号、权限与可见范围。",
        icon: "ri-user-settings-line",
        iconActive: "ri-user-settings-fill",
        aliases: ["用户", "权限", "users"],
        adminOnly: true,
        showInSidebar: true,
        searchable: true,
      },
    ],
  },
]

export const LAYOUT_QUICK_ACTIONS: LayoutQuickAction[] = [
  {
    id: "part-new",
    label: "新增零件",
    description: "录入零件资料并进入管理流程。",
    icon: "ri-settings-3-line",
    to: "/parts?action=new",
    aliases: ["新建零件", "录入零件", "part new"],
    searchable: true,
  },
  {
    id: "part-import",
    label: "导入零件",
    description: "批量导入零件资料并检查异常项。",
    icon: "ri-upload-2-line",
    to: "/parts?action=import",
    aliases: ["批量导入", "导入物料", "part import"],
    searchable: true,
  },
  {
    id: "order-new",
    label: "新建订单",
    description: "选择客户和零件，快速创建生产订单。",
    icon: "ri-file-add-line",
    to: "/orders/new",
    aliases: ["新增订单", "创建订单", "order new"],
    searchable: true,
  },
  {
    id: "billing-new",
    label: "新建对账单",
    description: "从发货单中生成对账单并进入归档流。",
    icon: "ri-bank-card-line",
    to: "/billing/new",
    aliases: ["新增对账", "创建对账单", "billing new"],
    adminOnly: true,
    searchable: true,
  },
]

export function filterLayoutNavSections(isAdmin: boolean) {
  return LAYOUT_NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => !item.adminOnly || isAdmin),
  })).filter(section => section.items.length > 0)
}

export function getBottomNavItems(isAdmin: boolean) {
  return filterLayoutNavSections(isAdmin)
    .flatMap(section => section.items)
    .filter(item => item.showInBottomNav)
}

export function getQuickActions(isAdmin: boolean) {
  return LAYOUT_QUICK_ACTIONS.filter(action => !action.adminOnly || isAdmin)
}

export function getCommandItems(isAdmin: boolean): LayoutCommandItem[] {
  const pages = filterLayoutNavSections(isAdmin)
    .flatMap(section => section.items)
    .filter(item => item.searchable)
    .map(item => ({
      id: `page:${item.to}`,
      label: item.label,
      description: item.description,
      icon: item.icon,
      kind: "page" as const,
      to: item.to,
      aliases: item.aliases ?? [],
    }))

  const actions = getQuickActions(isAdmin)
    .filter(action => action.searchable)
    .map(action => ({
      id: `action:${action.id}`,
      label: action.label,
      description: action.description,
      icon: action.icon,
      kind: "action" as const,
      to: action.to,
      aliases: action.aliases ?? [],
    }))

  return [...pages, ...actions]
}

export function getLayoutLocation(pathname: string): LayoutLocation {
  if (pathname === "/") {
    return {
      pageLabel: "仪表盘",
      mobileLabel: "仪表盘",
      breadcrumbs: [{ label: "仪表盘", to: "/" }],
    }
  }

  if (pathname === "/parts") {
    return {
      pageLabel: "零件库",
      mobileLabel: "零件库",
      breadcrumbs: [{ label: "零件库", to: "/parts" }],
    }
  }

  if (pathname.startsWith("/parts/")) {
    return {
      pageLabel: "零件详情",
      mobileLabel: "零件详情",
      breadcrumbs: [
        { label: "零件库", to: "/parts" },
        { label: "零件详情" },
      ],
    }
  }

  if (pathname === "/orders") {
    return {
      pageLabel: "订单管理",
      mobileLabel: "订单管理",
      breadcrumbs: [{ label: "订单管理", to: "/orders" }],
    }
  }

  if (pathname === "/orders/new") {
    return {
      pageLabel: "新建订单",
      mobileLabel: "新建订单",
      breadcrumbs: [
        { label: "订单管理", to: "/orders" },
        { label: "新建订单" },
      ],
    }
  }

  if (pathname.startsWith("/orders/")) {
    return {
      pageLabel: "订单详情",
      mobileLabel: "订单详情",
      breadcrumbs: [
        { label: "订单管理", to: "/orders" },
        { label: "订单详情" },
      ],
    }
  }

  if (pathname === "/deliveries") {
    return {
      pageLabel: "发货管理",
      mobileLabel: "发货管理",
      breadcrumbs: [{ label: "发货管理", to: "/deliveries" }],
    }
  }

  if (pathname.startsWith("/deliveries/")) {
    return {
      pageLabel: "发货详情",
      mobileLabel: "发货详情",
      breadcrumbs: [
        { label: "发货管理", to: "/deliveries" },
        { label: "发货详情" },
      ],
    }
  }

  if (pathname === "/billing") {
    return {
      pageLabel: "财务对账",
      mobileLabel: "财务对账",
      breadcrumbs: [{ label: "财务对账", to: "/billing" }],
    }
  }

  if (pathname === "/billing/new") {
    return {
      pageLabel: "新建对账单",
      mobileLabel: "新建对账",
      breadcrumbs: [
        { label: "财务对账", to: "/billing" },
        { label: "新建对账单" },
      ],
    }
  }

  if (/^\/billing\/[^/]+\/seal$/.test(pathname)) {
    return {
      pageLabel: "盖章工作台",
      mobileLabel: "盖章工作台",
      breadcrumbs: [
        { label: "财务对账", to: "/billing" },
        { label: "对账详情" },
        { label: "盖章工作台" },
      ],
    }
  }

  if (pathname.startsWith("/billing/")) {
    return {
      pageLabel: "对账详情",
      mobileLabel: "对账详情",
      breadcrumbs: [
        { label: "财务对账", to: "/billing" },
        { label: "对账详情" },
      ],
    }
  }

  if (pathname === "/seals") {
    return {
      pageLabel: "印章管理",
      mobileLabel: "印章管理",
      breadcrumbs: [{ label: "印章管理", to: "/seals" }],
    }
  }

  if (/^\/seals\/[^/]+\/logs$/.test(pathname)) {
    return {
      pageLabel: "盖章日志",
      mobileLabel: "盖章日志",
      breadcrumbs: [
        { label: "印章管理", to: "/seals" },
        { label: "盖章日志" },
      ],
    }
  }

  if (pathname === "/users") {
    return {
      pageLabel: "用户管理",
      mobileLabel: "用户管理",
      breadcrumbs: [{ label: "用户管理", to: "/users" }],
    }
  }

  return {
    pageLabel: "工作台",
    mobileLabel: "工作台",
    breadcrumbs: [{ label: "工作台" }],
  }
}
