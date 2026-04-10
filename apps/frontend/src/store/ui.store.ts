import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Density = "compact" | "default" | "comfortable"
export type FontSize = 12 | 14 | 16 | 18
export type LineHeight = 1.4 | 1.6 | 1.8
export type AppearancePreset =
  | "compact-input"
  | "default-browse"
  | "comfortable-read"
  | "custom"

export interface AppearanceState {
  isDark: boolean
  fontSize: FontSize
  lineHeight: LineHeight
  density: Density
}

export type AppearancePresetConfig = Omit<AppearanceState, "isDark">

export const DEFAULT_APPEARANCE: AppearanceState = {
  isDark: false,
  fontSize: 14,
  lineHeight: 1.6,
  density: "default",
}

export const APPEARANCE_PRESETS: Record<
  Exclude<AppearancePreset, "custom">,
  AppearancePresetConfig
> = {
  "compact-input": {
    fontSize: 12,
    lineHeight: 1.4,
    density: "compact",
  },
  "default-browse": {
    fontSize: 14,
    lineHeight: 1.6,
    density: "default",
  },
  "comfortable-read": {
    fontSize: 16,
    lineHeight: 1.8,
    density: "comfortable",
  },
}

export function resolveAppearancePreset(
  appearance: Pick<AppearanceState, "fontSize" | "lineHeight" | "density">,
): AppearancePreset {
  for (const [preset, values] of Object.entries(APPEARANCE_PRESETS)) {
    if (
      values.fontSize === appearance.fontSize &&
      values.lineHeight === appearance.lineHeight &&
      values.density === appearance.density
    ) {
      return preset as Exclude<AppearancePreset, "custom">
    }
  }

  return "custom"
}

interface UIState extends AppearanceState {
  collapsed: boolean
  isMobile: boolean
  showSettings: boolean
  showCommandPalette: boolean
  setDark: (v: boolean) => void
  setFontSize: (v: FontSize) => void
  setLineHeight: (v: LineHeight) => void
  setDensity: (v: Density) => void
  applyPreset: (preset: Exclude<AppearancePreset, "custom">) => void
  resetAppearance: () => void
  toggleCollapsed: () => void
  setIsMobile: (v: boolean) => void
  openSettings: () => void
  closeSettings: () => void
  setSettingsOpen: (open: boolean) => void
  openCommandPalette: () => void
  closeCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
}

const R = () => document.documentElement

function applyTheme(isDark: boolean) {
  R().classList.toggle("dark", isDark)
}

function applyFont(fs: FontSize, lh: LineHeight) {
  R().style.setProperty("--erp-fs", `${fs}px`)
  R().style.setProperty("--erp-lh", `${lh}`)
  R().style.fontSize = `${fs}px`
  R().style.lineHeight = `${lh}`
}

function applyDensity(d: Density) {
  const map: Record<Density, Record<string, string>> = {
    compact: {
      cell: "6px 12px",
      card: "10px 14px",
      page: "16px 16px",
      pageY: "16px",
      pageX: "16px",
      gap: "8px",
    },
    default: {
      cell: "10px 16px",
      card: "14px 18px",
      page: "24px 20px",
      pageY: "24px",
      pageX: "20px",
      gap: "12px",
    },
    comfortable: {
      cell: "14px 20px",
      card: "18px 24px",
      page: "32px 28px",
      pageY: "32px",
      pageX: "28px",
      gap: "16px",
    },
  }

  R().setAttribute("data-density", d)
  R().style.setProperty("--erp-cell-pad", map[d].cell)
  R().style.setProperty("--erp-card-pad", map[d].card)
  R().style.setProperty("--erp-page-pad", map[d].page)
  R().style.setProperty("--erp-page-py", map[d].pageY)
  R().style.setProperty("--erp-page-px", map[d].pageX)
  R().style.setProperty("--erp-gap", map[d].gap)
}

function applyAll(s: AppearanceState) {
  applyTheme(s.isDark)
  applyFont(s.fontSize, s.lineHeight)
  applyDensity(s.density)
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_APPEARANCE,
      collapsed: false,
      isMobile: false,
      showSettings: false,
      showCommandPalette: false,

      setDark: v => {
        set({ isDark: v })
        applyTheme(v)
      },
      setFontSize: v => {
        set({ fontSize: v })
        applyFont(v, get().lineHeight)
      },
      setLineHeight: v => {
        set({ lineHeight: v })
        applyFont(get().fontSize, v)
      },
      setDensity: v => {
        set({ density: v })
        applyDensity(v)
      },
      applyPreset: preset => {
        const next = APPEARANCE_PRESETS[preset]
        set(next)
        applyFont(next.fontSize, next.lineHeight)
        applyDensity(next.density)
      },
      resetAppearance: () => {
        set(DEFAULT_APPEARANCE)
        applyAll(DEFAULT_APPEARANCE)
      },

      toggleCollapsed: () => set(s => ({ collapsed: !s.collapsed })),
      setIsMobile: v => set({ isMobile: v }),
      openSettings: () => set({ showSettings: true }),
      closeSettings: () => set({ showSettings: false }),
      setSettingsOpen: open => set({ showSettings: open }),
      openCommandPalette: () => set({ showCommandPalette: true }),
      closeCommandPalette: () => set({ showCommandPalette: false }),
      setCommandPaletteOpen: open => set({ showCommandPalette: open }),
    }),
    {
      name: "erp-ui",
      partialize: s => ({
        isDark: s.isDark,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        density: s.density,
      }),
      onRehydrateStorage: () => state => {
        if (state) applyAll(state)
      },
    },
  ),
)

export function useUIInit() {
  applyAll(useUIStore.getState())
}
