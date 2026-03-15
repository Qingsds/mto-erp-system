// apps/frontend/src/store/layoutStore.ts
import { create } from "zustand"

interface LayoutState {
  collapsed: boolean
  isDarkMode: boolean
  toggleCollapse: () => void
  toggleDarkMode: () => void
}

const getInitialDarkMode = () => {
  const saved = localStorage.getItem("erp-theme-dark")
  return saved ? JSON.parse(saved) : false
}

export const useLayoutStore = create<LayoutState>(set => ({
  collapsed: false,
  isDarkMode: getInitialDarkMode(),
  toggleCollapse: () =>
    set(state => ({ collapsed: !state.collapsed })),
  toggleDarkMode: () =>
    set(state => {
      const nextMode = !state.isDarkMode
      localStorage.setItem("erp-theme-dark", JSON.stringify(nextMode))
      return { isDarkMode: nextMode }
    }),
}))
