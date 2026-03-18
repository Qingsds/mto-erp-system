// apps/frontend/src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { routeTree } from "./routeTree.gen"
import "./index.css"
import "remixicon/fonts/remixicon.css"

// 1. 实例化 React Query 客户端，并配置全局默认行为
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // 失去焦点后返回不自动刷新（ERP 场景下频繁刷新会导致表单状态意外丢失或后台压力过大）
      retry: 1, // 失败后默认重试 1 次
      staleTime: 5 * 60 * 1000, // 数据 5 分钟内认为是新鲜的，不重复发起请求
    },
  },
})

// 2. 实例化路由
const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// 3. 渲染根节点，将 QueryClientProvider 包裹在最外层
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* 仅在开发环境开启 React Query 调试面板 */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position='bottom'
        />
      )}
    </QueryClientProvider>
  </React.StrictMode>,
)
