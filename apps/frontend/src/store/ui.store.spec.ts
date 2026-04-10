import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type StorageRecord = Record<string, string>

function createStorage(seed: StorageRecord = {}) {
  const store = new Map(Object.entries(seed))

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
    clear: vi.fn(() => {
      store.clear()
    }),
  }
}

function createDocumentElement() {
  const attributes = new Map<string, string>()
  const classes = new Set<string>()
  const styleValues = new Map<string, string>()

  return {
    classList: {
      toggle: vi.fn((name: string, force?: boolean) => {
        if (force ?? !classes.has(name)) {
          classes.add(name)
          return true
        }

        classes.delete(name)
        return false
      }),
      contains: (name: string) => classes.has(name),
    },
    style: {
      setProperty: vi.fn((key: string, value: string) => {
        styleValues.set(key, value)
      }),
      getPropertyValue: vi.fn((key: string) => styleValues.get(key) ?? ""),
      fontSize: "",
      lineHeight: "",
    },
    setAttribute: vi.fn((key: string, value: string) => {
      attributes.set(key, value)
    }),
    getAttribute: vi.fn((key: string) => attributes.get(key) ?? null),
  }
}

async function loadStore(seed: StorageRecord = {}) {
  vi.resetModules()

  const localStorage = createStorage(seed)
  const documentElement = createDocumentElement()

  vi.stubGlobal("localStorage", localStorage)
  vi.stubGlobal("document", { documentElement })

  const module = await import("./ui.store")

  return { ...module, localStorage, documentElement }
}

describe("ui.store appearance", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("resolves non-preset combinations to custom", async () => {
    const { resolveAppearancePreset } = await loadStore()

    expect(
      resolveAppearancePreset({
        fontSize: 18,
        lineHeight: 1.6,
        density: "default",
      }),
    ).toBe("custom")
  })

  it("applies preset values and updates DOM variables", async () => {
    const { useUIStore, documentElement } = await loadStore()

    useUIStore.getState().applyPreset("compact-input")

    expect(useUIStore.getState().fontSize).toBe(12)
    expect(useUIStore.getState().lineHeight).toBe(1.4)
    expect(useUIStore.getState().density).toBe("compact")
    expect(documentElement.style.getPropertyValue("--erp-page-px")).toBe("16px")
    expect(documentElement.getAttribute("data-density")).toBe("compact")
  })

  it("resets appearance to default values", async () => {
    const { DEFAULT_APPEARANCE, useUIStore, documentElement } = await loadStore()

    useUIStore.getState().setDark(true)
    useUIStore.getState().setFontSize(18)
    useUIStore.getState().setLineHeight(1.8)
    useUIStore.getState().setDensity("comfortable")

    useUIStore.getState().resetAppearance()

    expect(useUIStore.getState().isDark).toBe(DEFAULT_APPEARANCE.isDark)
    expect(useUIStore.getState().fontSize).toBe(DEFAULT_APPEARANCE.fontSize)
    expect(useUIStore.getState().lineHeight).toBe(DEFAULT_APPEARANCE.lineHeight)
    expect(useUIStore.getState().density).toBe(DEFAULT_APPEARANCE.density)
    expect(documentElement.classList.contains("dark")).toBe(false)
    expect(documentElement.style.fontSize).toBe("14px")
    expect(documentElement.style.lineHeight).toBe("1.6")
  })

  it("rehydrates persisted appearance and applies it to the document", async () => {
    const seed = {
      "erp-ui": JSON.stringify({
        state: {
          isDark: true,
          fontSize: 16,
          lineHeight: 1.8,
          density: "comfortable",
        },
        version: 0,
      }),
    }
    const { useUIStore, documentElement } = await loadStore(seed)

    await useUIStore.persist.rehydrate()

    expect(useUIStore.getState().isDark).toBe(true)
    expect(useUIStore.getState().fontSize).toBe(16)
    expect(useUIStore.getState().lineHeight).toBe(1.8)
    expect(useUIStore.getState().density).toBe("comfortable")
    expect(documentElement.classList.contains("dark")).toBe(true)
    expect(documentElement.style.getPropertyValue("--erp-page-px")).toBe("28px")
  })

  it("controls settings panel open state explicitly", async () => {
    const { useUIStore } = await loadStore()

    useUIStore.getState().openSettings()
    expect(useUIStore.getState().showSettings).toBe(true)

    useUIStore.getState().closeSettings()
    expect(useUIStore.getState().showSettings).toBe(false)

    useUIStore.getState().setSettingsOpen(true)
    expect(useUIStore.getState().showSettings).toBe(true)
  })

  it("controls command palette open state explicitly", async () => {
    const { useUIStore } = await loadStore()

    useUIStore.getState().openCommandPalette()
    expect(useUIStore.getState().showCommandPalette).toBe(true)

    useUIStore.getState().closeCommandPalette()
    expect(useUIStore.getState().showCommandPalette).toBe(false)

    useUIStore.getState().setCommandPaletteOpen(true)
    expect(useUIStore.getState().showCommandPalette).toBe(true)
  })
})
