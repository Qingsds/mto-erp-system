import { describe, expect, it } from "vitest"
import {
  getRegisteredProjectSkills,
  loadProjectSkillRegistry,
} from "./registry"

describe("project skill registry", () => {
  it("registers all project skills with normalized names", () => {
    expect(getRegisteredProjectSkills()).toEqual([
      {
        name: "mto-erp-change-guard",
        relativeDir: ".codex/skills/mto-erp-change-guard",
      },
      {
        name: "mto-erp-frontend-ux",
        relativeDir: ".codex/skills/mto-erp-frontend-ux",
      },
    ])
  })

  it("loads all registered skills with metadata and raw source content", async () => {
    const registry = await loadProjectSkillRegistry()

    expect(registry.names).toEqual([
      "mto-erp-change-guard",
      "mto-erp-frontend-ux",
    ])
    expect(registry.skills).toHaveLength(2)

    const changeGuard = registry.byName["mto-erp-change-guard"]
    expect(changeGuard.displayName).toBe("MTO ERP Change Guard")
    expect(changeGuard.metadata.workflow).toContain("git status --short")
    expect(changeGuard.metadata.commitRules).toContain("中文 emoji 风格")
    expect(changeGuard.sourceFiles.some(file => file.kind === "agent")).toBe(true)

    const frontendUx = registry.byName["mto-erp-frontend-ux"]
    expect(frontendUx.allowImplicitInvocation).toBe(true)
    expect(frontendUx.displayName).toBe("MTO ERP Frontend UX")
    expect(frontendUx.references.map(reference => reference.slug)).toContain(
      "repo-map",
    )
    expect(frontendUx.metadata.subPackagesConfiguration).toContain(
      "apps/frontend/src/pages/billing/CreateBillingPage.tsx",
    )
    expect(frontendUx.metadata.componentInventory).toContain(
      "apps/frontend/src/pages/billing/new/components/PageHeader.tsx",
    )
  })

  it("normalizes stale paths and marks project dependencies as available", async () => {
    const registry = await loadProjectSkillRegistry()
    const frontendUx = registry.byName["mto-erp-frontend-ux"]

    const partDetailDependency = frontendUx.dependencies.find(
      dependency =>
        dependency.value ===
        "apps/frontend/src/pages/parts/detail/PartDetailPage.tsx",
    )
    const billingCreateDependency = frontendUx.dependencies.find(
      dependency =>
        dependency.value ===
        "apps/frontend/src/pages/billing/CreateBillingPage.tsx",
    )
    const billingSealDependency = frontendUx.dependencies.find(
      dependency =>
        dependency.value ===
        "apps/frontend/src/pages/billing/seal/BillingSealPage.tsx",
    )

    expect(partDetailDependency).toMatchObject({
      kind: "file",
      exists: true,
    })
    expect(billingCreateDependency).toMatchObject({
      kind: "file",
      exists: true,
    })
    expect(billingSealDependency).toMatchObject({
      kind: "file",
      exists: true,
    })
  })
})
