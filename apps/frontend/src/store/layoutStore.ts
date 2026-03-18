// apps/frontend/src/store/layoutStore.ts
import { create } from "zustand"

type ThemeColor = "zinc" | "blue" | "rose"
type FontSize = "text-sm" | "text-md" | "text-lg"

interface LayoutState {
  collapsed: boolean
  isDarkMode: boolean
  themeColor: ThemeColor
  fontSize: FontSize
  toggleCollapse: () => void
  toggleDarkMode: () => void
  setThemeColor: (color: ThemeColor) => void
  setFontSize: (size: FontSize) => void
}

const getInitialDarkMode = () => {
  const saved = localStorage.getItem("erp-theme-dark")
  return saved ? JSON.parse(saved) : false
}

export const useLayoutStore = create<LayoutState>(set => ({
  collapsed: false,
  isDarkMode: getInitialDarkMode(),
  themeColor: "zinc",
  fontSize: "text-md",
  toggleCollapse: () =>
    set(state => ({ collapsed: !state.collapsed })),
  toggleDarkMode: () =>
    set(state => {
      const nextMode = !state.isDarkMode
      localStorage.setItem("erp-theme-dark", JSON.stringify(nextMode))
      return { isDarkMode: nextMode }
    }),
  setThemeColor: color => set({ themeColor: color }),
  setFontSize: size => set({ fontSize: size }),
}))
