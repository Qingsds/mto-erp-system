// apps/frontend/src/routes/__root.tsx
import { useEffect } from "react"
import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { ConfigProvider, theme } from "antd"
import zhCN from "antd/locale/zh_CN"
import { MainLayout } from "../components/layout/MainLayout"
import { useLayoutStore } from "../store/layoutStore"

const RootComponent = () => {
  const { isDarkMode } = useLayoutStore()

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDarkMode])

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        // 仅保留官方算法切换，完全去除自定义 Token
        algorithm: isDarkMode
          ? theme.darkAlgorithm
          : theme.defaultAlgorithm,
        components: {
          Button: {
            // 现代按钮风格配置
            fontWeight: 500, // 增加字重
            defaultShadow: "none", // 移除默认按钮的投影
            primaryShadow: "0 2px 4px rgba(0,0,0,0.1)", // 优化主按钮投影
            controlHeight: 36, // 稍微增加基础按钮高度，增加呼吸感
            controlHeightLG: 40,
            controlHeightSM: 28,
            borderRadius: 6, // 统一按钮圆角
          },
        },
      }}
    >
      <MainLayout>
        <Outlet />
        {import.meta.env.DEV && (
          <TanStackRouterDevtools position='bottom-right' />
        )}
      </MainLayout>
    </ConfigProvider>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
