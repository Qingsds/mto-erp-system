// apps/frontend/src/components/layout/MainLayout.tsx
import React, { useEffect, useState } from "react"
import {
  Layout,
  Menu,
  Button,
  theme,
  Switch,
  Flex,
  Typography,
} from "antd"
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  ShoppingCartOutlined,
  CarOutlined,
  AccountBookOutlined,
  FileProtectOutlined,
  BulbOutlined,
  MoonOutlined,
} from "@ant-design/icons"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useLayoutStore } from "../../store/layoutStore"

const { Header, Sider, Content } = Layout
const { Text } = Typography

// PC 端全量菜单
const pcMenuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "工作台" },
  { key: "/parts", icon: <AppstoreOutlined />, label: "零件字典" },
  {
    key: "/orders",
    icon: <ShoppingCartOutlined />,
    label: "订单管理",
  },
  { key: "/deliveries", icon: <CarOutlined />, label: "发货管理" },
  {
    key: "/billing",
    icon: <AccountBookOutlined />,
    label: "财务对账",
  },
  {
    key: "/documents",
    icon: <FileProtectOutlined />,
    label: "签章归档",
  },
]

// 移动端精简菜单 (剔除发货、财务、签章)
const mobileMenuItems = [
  { key: "/", icon: <DashboardOutlined />, label: "工作台" },
  { key: "/parts", icon: <AppstoreOutlined />, label: "零件" },
  { key: "/orders", icon: <ShoppingCartOutlined />, label: "订单" },
]

export const MainLayout = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { collapsed, isDarkMode, toggleCollapse, toggleDarkMode } =
    useLayoutStore()
  const navigate = useNavigate()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const { token } = theme.useToken()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background: token.colorBgContainer,
      }}
    >
      {/* PC端侧边栏 */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme={isDarkMode ? "dark" : "light"}
          style={{
            background: token.colorBgContainer,
            borderRight: `1px solid ${token.colorSplit}`,
            zIndex: 2,
          }}
        >
          <div
            style={{
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "16px",
              color: isDarkMode ? "#fff" : "#000",
              borderBottom: `1px solid ${token.colorSplit}`,
            }}
          >
            {collapsed ? "ERP" : "MTO-ERP"}
          </div>
          <div style={{ padding: "8px 0" }}>
            <Menu
              theme={isDarkMode ? "dark" : "light"}
              mode='inline'
              selectedKeys={[currentPath]}
              items={pcMenuItems}
              onClick={({ key }) => navigate({ to: key as any })}
              style={{ borderRight: 0, background: "transparent" }}
            />
          </div>
        </Sider>
      )}

      <Layout style={{ background: token.colorBgContainer }}>
        <Header
          style={{
            padding: "0 16px",
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorSplit}`,
            boxShadow: token.boxShadowTertiary,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Flex align='center'>
            {/* 移动端不再需要汉堡菜单按钮，直接展示系统名称 */}
            {!isMobile ? (
              <Button
                type='text'
                icon={
                  collapsed ? (
                    <MenuUnfoldOutlined />
                  ) : (
                    <MenuFoldOutlined />
                  )
                }
                onClick={toggleCollapse}
                style={{
                  fontSize: "16px",
                  width: 48,
                  height: 48,
                  marginLeft: -16,
                }}
              />
            ) : (
              <Text
                strong
                style={{ fontSize: 16 }}
              >
                MTO-ERP
              </Text>
            )}
          </Flex>

          <Switch
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<BulbOutlined />}
            checked={isDarkMode}
            onChange={toggleDarkMode}
          />
        </Header>

        {/* 核心内容区：移动端需要给底部导航栏留出 paddingBottom */}
        <Content
          style={{
            padding: 24,
            paddingBottom: isMobile ? 84 : 24, // 避免被底部栏遮挡
            background: token.colorBgContainer,
            minHeight: 280,
            overflowX: "hidden",
          }}
        >
          {children}
        </Content>
      </Layout>

      {/* 移动端底部原生风格标签栏 */}
      {isMobile && (
        <Flex
          justify='space-around'
          align='center'
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 60, // 基础高度
            paddingBottom: "env(safe-area-inset-bottom)", // 适配 iPhone 底部黑条
            background: token.colorBgContainer,
            borderTop: `1px solid ${token.colorSplit}`,
            zIndex: 100,
            boxShadow: "0 -2px 8px rgba(0,0,0,0.06)", // 顶部微阴影
          }}
        >
          {mobileMenuItems.map(item => {
            const isActive = currentPath === item.key
            return (
              <Flex
                key={item.key}
                vertical
                align='center'
                justify='center'
                onClick={() => navigate({ to: item.key as any })}
                style={{
                  flex: 1,
                  height: "100%",
                  cursor: "pointer",
                  color: isActive
                    ? token.colorPrimary
                    : token.colorTextSecondary,
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 2 }}>
                  {item.icon}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {item.label}
                </div>
              </Flex>
            )
          })}
        </Flex>
      )}
    </Layout>
  )
}
