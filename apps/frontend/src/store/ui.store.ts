import { create } from "zustand"
import { persist } from "zustand/middleware"

// ─── Types ────────────────────────────────────────────────
export type Density = "compact" | "default" | "comfortable"
export type FontSize = 12 | 14 | 16 | 18
export type LineHeight = 1.4 | 1.6 | 1.8

interface UIState {
  // appearance
  isDark: boolean
  fontSize: FontSize
  lineHeight: LineHeight
  density: Density
  // layout
  collapsed: boolean
  isMobile: boolean
  showSettings: boolean
  // actions
  setDark: (v: boolean) => void
  toggleDark: () => void
  setFontSize: (v: FontSize) => void
  setLineHeight: (v: LineHeight) => void
  setDensity: (v: Density) => void
  toggleCollapsed: () => void
  setIsMobile: (v: boolean) => void
  toggleSettings: () => void
}

// ─── CSS helpers ──────────────────────────────────────────
const R = () => document.documentElement

function applyTheme(isDark: boolean) {
  R().classList.toggle("dark", isDark)
}

function applyFont(fs: FontSize, lh: LineHeight) {
  R().style.setProperty("--erp-fs", `${fs}px`)
  R().style.setProperty("--erp-lh", `${lh}`)

  // Make text-size/line-height controls affect all rem-based utilities.
  R().style.fontSize = `${fs}px`
  R().style.lineHeight = `${lh}`
}

function applyDensity(d: Density) {
  const map = {
    compact: {
      cell: "6px 12px",
      card: "10px 14px",
      page: "16px 14px",
      pageY: "16px",
      pageX: "14px",
      gap: "8px",
    },
    default: {
      cell: "10px 16px",
      card: "14px 18px",
      page: "24px 18px",
      pageY: "24px",
      pageX: "18px",
      gap: "12px",
    },
    comfortable: {
      cell: "14px 20px",
      card: "18px 24px",
      page: "32px 24px",
      pageY: "32px",
      pageX: "24px",
      gap: "16px",
    },
  }[d]

  R().setAttribute("data-density", d)
  R().style.setProperty("--erp-cell-pad", map.cell)
  R().style.setProperty("--erp-card-pad", map.card)
  R().style.setProperty("--erp-page-pad", map.page)
  R().style.setProperty("--erp-page-py", map.pageY)
  R().style.setProperty("--erp-page-px", map.pageX)
  R().style.setProperty("--erp-gap", map.gap)
}

function applyAll(s: Pick<UIState, "isDark" | "fontSize" | "lineHeight" | "density">) {
  applyTheme(s.isDark)
  applyFont(s.fontSize, s.lineHeight)
  applyDensity(s.density)
}

// ─── Store ────────────────────────────────────────────────
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      isDark: false,
      fontSize: 14,
      lineHeight: 1.6,
      density: "default",
      collapsed: false,
      isMobile: false,
      showSettings: false,

      setDark: (v) => {
        set({ isDark: v })
        applyTheme(v)
      },
      toggleDark: () => {
        const v = !get().isDark
        set({ isDark: v })
        applyTheme(v)
      },

      setFontSize: (v) => {
        set({ fontSize: v })
        applyFont(v, get().lineHeight)
      },
      setLineHeight: (v) => {
        set({ lineHeight: v })
        applyFont(get().fontSize, v)
      },
      setDensity: (v) => {
        set({ density: v })
        applyDensity(v)
      },

      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setIsMobile: (v) => set({ isMobile: v }),
      toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
    }),
    {
      name: "erp-ui",
      partialize: (s) => ({
        isDark: s.isDark,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        density: s.density,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) applyAll(state)
      },
    },
  ),
)

// ─── Init — call once at app mount ────────────────────────
export function useUIInit() {
  applyAll(useUIStore.getState())
}
