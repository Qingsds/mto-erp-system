/// <reference types="node" />

import { readdir, readFile } from "node:fs/promises"
import { existsSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type {
  ProjectSkill,
  ProjectSkillRegistry,
  SkillAgentConfig,
  SkillDependency,
  SkillRegistration,
  SkillReferenceDocument,
  SkillSourceFile,
} from "./types"

const REGISTERED_SKILLS: SkillRegistration[] = [
  {
    name: "mto-erp-change-guard",
    relativeDir: ".codex/skills/mto-erp-change-guard",
  },
  {
    name: "mto-erp-frontend-ux",
    relativeDir: ".codex/skills/mto-erp-frontend-ux",
  },
]

const PATH_REPLACEMENTS: Array<[string, string]> = [
  ["`src/pages/billing/CreateBillingPage.tsx`", "`apps/frontend/src/pages/billing/CreateBillingPage.tsx`"],
  [
    "`src/pages/billing/new/components/PageHeader.tsx`",
    "`apps/frontend/src/pages/billing/new/components/PageHeader.tsx`",
  ],
  [
    "`src/pages/billing/new/components/FormCard.tsx`",
    "`apps/frontend/src/pages/billing/new/components/FormCard.tsx`",
  ],
  [
    "`src/pages/billing/new/components/SubmitBar.tsx`",
    "`apps/frontend/src/pages/billing/new/components/SubmitBar.tsx`",
  ],
  [
    "apps/frontend/src/pages/billing/CreateBillingSheet.tsx",
    "apps/frontend/src/pages/billing/CreateBillingPage.tsx",
  ],
  [
    "apps/frontend/src/components/billing/ExecuteSealDialog.tsx",
    "apps/frontend/src/pages/billing/seal/BillingSealPage.tsx",
  ],
  [
    "apps/frontend/src/pages/parts/PartDetailPage.tsx",
    "apps/frontend/src/pages/parts/detail/PartDetailPage.tsx",
  ],
]

function normalizeSkillContent(content: string) {
  return PATH_REPLACEMENTS.reduce(
    (current, [from, to]) => current.replaceAll(from, to),
    content,
  )
}

function parseKeyValueBlock(content: string) {
  const result: Record<string, string> = {}

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) {
      continue
    }

    const separatorIndex = line.indexOf(":")
    if (separatorIndex < 0) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/u)
  const frontmatterBlock = match?.[1] ?? ""
  const body = match ? markdown.slice(match[0].length) : markdown

  return {
    data: parseKeyValueBlock(frontmatterBlock),
    body,
  }
}

function parseAgentConfig(content: string): SkillAgentConfig {
  const config: SkillAgentConfig = {
    allowImplicitInvocation: false,
  }

  let currentSection = ""

  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/\r/u, "")
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    if (/^[a-zA-Z_]+:\s*$/u.test(trimmed)) {
      currentSection = trimmed.slice(0, -1)
      continue
    }

    const separatorIndex = trimmed.indexOf(":")
    if (separatorIndex < 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (currentSection === "interface") {
      if (key === "display_name") {
        config.displayName = value
      }
      if (key === "short_description") {
        config.shortDescription = value
      }
      if (key === "default_prompt") {
        config.defaultPrompt = value
      }
    }

    if (currentSection === "policy" && key === "allow_implicit_invocation") {
      config.allowImplicitInvocation = value === "true"
    }
  }

  return config
}

function extractMarkdownSection(markdown: string, heading: string) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
  const pattern = new RegExp(
    `## ${escapedHeading}\\n\\n([\\s\\S]*?)(?=\\n## |$)`,
    "u",
  )

  return markdown.match(pattern)?.[1].trim()
}

function isLikelyProjectPath(value: string) {
  return (
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("apps/") ||
    value.startsWith("design-system/") ||
    value.startsWith(".codex/") ||
    value.startsWith("packages/") ||
    value.startsWith("scripts/") ||
    value.startsWith("src/")
  )
}

function normalizeDiscoveredPath(value: string, baseDir: string, repoRoot: string) {
  let normalizedValue = value.trim()
  let normalizedFrom: string | undefined

  for (const [from, to] of PATH_REPLACEMENTS) {
    const plainFrom = from.replaceAll("`", "")
    const plainTo = to.replaceAll("`", "")

    if (normalizedValue === plainFrom) {
      normalizedFrom = normalizedValue
      normalizedValue = plainTo
      break
    }
  }

  if (normalizedValue.startsWith("./") || normalizedValue.startsWith("../")) {
    const absolutePath = path.resolve(baseDir, normalizedValue)
    const relativePath = path.relative(repoRoot, absolutePath)
    return {
      value: relativePath.split(path.sep).join("/"),
      normalizedFrom,
    }
  }

  return {
    value: normalizedValue,
    normalizedFrom,
  }
}

function collectDependencies(
  sourceFiles: SkillSourceFile[],
  repoRoot: string,
): SkillDependency[] {
  const dependencyMap = new Map<string, SkillDependency>()

  const register = (
    kind: SkillDependency["kind"],
    value: string,
    source: string,
    normalizedFrom?: string,
  ) => {
    const key = `${kind}:${value}`
    if (dependencyMap.has(key)) {
      return
    }

    if (kind === "command") {
      dependencyMap.set(key, {
        kind,
        value,
        source,
        exists: true,
        normalizedFrom,
      })
      return
    }

    const absolutePath = path.join(repoRoot, value)
    const exists = existsSync(absolutePath)

    dependencyMap.set(key, {
      kind: exists && statSync(absolutePath).isDirectory() ? "directory" : kind,
      value,
      source,
      exists,
      normalizedFrom,
    })
  }

  for (const file of sourceFiles) {
    const baseDir = path.dirname(file.absolutePath)

    const commandMatches = file.content.match(/`git [^`]+`/gu) ?? []
    for (const command of commandMatches) {
      register("command", command.slice(1, -1), file.relativePath)
    }

    const markdownLinkMatches =
      [...file.content.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)].map(match => match[1]) ?? []
    for (const linkTarget of markdownLinkMatches) {
      if (!isLikelyProjectPath(linkTarget)) {
        continue
      }

      const normalized = normalizeDiscoveredPath(linkTarget, baseDir, repoRoot)
      register("file", normalized.value, file.relativePath, normalized.normalizedFrom)
    }

    const backtickMatches =
      [...file.content.matchAll(/`([^`\n]+)`/gu)].map(match => match[1]) ?? []

    for (const candidate of backtickMatches) {
      if (!isLikelyProjectPath(candidate)) {
        continue
      }

      const normalized = normalizeDiscoveredPath(candidate, baseDir, repoRoot)
      register("file", normalized.value, file.relativePath, normalized.normalizedFrom)
    }
  }

  return [...dependencyMap.values()].sort((left, right) =>
    left.value.localeCompare(right.value, "zh-CN"),
  )
}

async function readOptionalFile(filePath: string) {
  if (!existsSync(filePath)) {
    return undefined
  }

  const content = await readFile(filePath, "utf8")
  return normalizeSkillContent(content)
}

async function readReferenceDocuments(skillDir: string) {
  const referencesDir = path.join(skillDir, "references")
  if (!existsSync(referencesDir)) {
    return []
  }

  const documents: SkillReferenceDocument[] = []

  const walk = async (directoryPath: string) => {
    const entries = await readdir(directoryPath, { withFileTypes: true })

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))) {
      const absolutePath = path.join(directoryPath, entry.name)

      if (entry.isDirectory()) {
        await walk(absolutePath)
        continue
      }

      if (!entry.name.endsWith(".md")) {
        continue
      }

      const content = normalizeSkillContent(await readFile(absolutePath, "utf8"))
      const relativePath = path
        .relative(skillDir, absolutePath)
        .split(path.sep)
        .join("/")
      const title =
        content.match(/^#\s+(.+)$/mu)?.[1]?.trim() ??
        path.basename(entry.name, ".md")

      documents.push({
        slug: relativePath.replace(/^references\//u, "").replace(/\.md$/u, ""),
        title,
        relativePath,
        absolutePath,
        content,
      })
    }
  }

  await walk(referencesDir)

  return documents
}

function buildRegistry(skills: ProjectSkill[]): ProjectSkillRegistry {
  return {
    names: skills.map(skill => skill.name),
    skills,
    byName: Object.fromEntries(skills.map(skill => [skill.name, skill])),
  }
}

async function findRepoRoot() {
  let currentDir = path.dirname(fileURLToPath(import.meta.url))

  while (true) {
    const codexDir = path.join(currentDir, ".codex")
    const workspaceFile = path.join(currentDir, "pnpm-workspace.yaml")

    if (existsSync(codexDir) && existsSync(workspaceFile)) {
      return currentDir
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      throw new Error("无法从当前 skill 模块定位仓库根目录")
    }

    currentDir = parentDir
  }
}

async function loadSkill(repoRoot: string, registration: SkillRegistration): Promise<ProjectSkill> {
  const skillDir = path.join(repoRoot, registration.relativeDir)
  const skillMarkdownPath = path.join(skillDir, "SKILL.md")
  const agentConfigPath = path.join(skillDir, "agents", "openai.yaml")

  const skillMarkdown = normalizeSkillContent(
    await readFile(skillMarkdownPath, "utf8"),
  )
  const agentYaml = await readOptionalFile(agentConfigPath)
  const references = await readReferenceDocuments(skillDir)

  const sourceFiles: SkillSourceFile[] = [
    {
      kind: "definition",
      relativePath: path
        .relative(repoRoot, skillMarkdownPath)
        .split(path.sep)
        .join("/"),
      absolutePath: skillMarkdownPath,
      content: skillMarkdown,
    },
    ...(agentYaml
      ? [
          {
            kind: "agent" as const,
            relativePath: path
              .relative(repoRoot, agentConfigPath)
              .split(path.sep)
              .join("/"),
            absolutePath: agentConfigPath,
            content: agentYaml,
          },
        ]
      : []),
    ...references.map(reference => ({
      kind: "reference" as const,
      relativePath: path
        .relative(repoRoot, reference.absolutePath)
        .split(path.sep)
        .join("/"),
      absolutePath: reference.absolutePath,
      content: reference.content,
    })),
  ]

  const parsedFrontmatter = parseFrontmatter(skillMarkdown)
  const parsedAgentConfig = agentYaml
    ? parseAgentConfig(agentYaml)
    : { allowImplicitInvocation: false }

  return {
    name: parsedFrontmatter.data.name ?? registration.name,
    description: parsedFrontmatter.data.description ?? "",
    displayName: parsedAgentConfig.displayName,
    shortDescription: parsedAgentConfig.shortDescription,
    defaultPrompt: parsedAgentConfig.defaultPrompt,
    allowImplicitInvocation: parsedAgentConfig.allowImplicitInvocation,
    sourceDir: registration.relativeDir,
    sourceFiles,
    references,
    dependencies: collectDependencies(sourceFiles, repoRoot),
    metadata: {
      rawFrontmatter: parsedFrontmatter.data,
      rawAgentConfig: parsedAgentConfig,
      workflow: extractMarkdownSection(parsedFrontmatter.body, "Workflow"),
      outputRules: extractMarkdownSection(parsedFrontmatter.body, "Output Rules"),
      hardConstraints: extractMarkdownSection(parsedFrontmatter.body, "Hard Constraints"),
      commitRules: extractMarkdownSection(parsedFrontmatter.body, "Commit Rules"),
      subPackagesConfiguration: extractMarkdownSection(
        parsedFrontmatter.body,
        "SubPackages Configuration",
      ),
      componentInventory: extractMarkdownSection(
        parsedFrontmatter.body,
        "Component Inventory (Billing New)",
      ),
    },
  }
}

export function getRegisteredProjectSkills() {
  return [...REGISTERED_SKILLS]
}

export async function loadProjectSkillRegistry(): Promise<ProjectSkillRegistry> {
  const repoRoot = await findRepoRoot()
  const skills = await Promise.all(
    REGISTERED_SKILLS.map(registration => loadSkill(repoRoot, registration)),
  )

  return buildRegistry(skills)
}
