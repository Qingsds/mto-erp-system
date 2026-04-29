export type SkillDependencyKind = "file" | "directory" | "command"

export interface SkillAgentConfig {
  displayName?: string
  shortDescription?: string
  defaultPrompt?: string
  allowImplicitInvocation: boolean
}

export interface SkillSourceFile {
  kind: "definition" | "agent" | "reference"
  relativePath: string
  absolutePath: string
  content: string
}

export interface SkillReferenceDocument {
  slug: string
  title: string
  relativePath: string
  absolutePath: string
  content: string
}

export interface SkillDependency {
  kind: SkillDependencyKind
  value: string
  source: string
  exists: boolean
  normalizedFrom?: string
}

export interface ProjectSkill {
  name: string
  description: string
  displayName?: string
  shortDescription?: string
  defaultPrompt?: string
  allowImplicitInvocation: boolean
  sourceDir: string
  sourceFiles: SkillSourceFile[]
  references: SkillReferenceDocument[]
  dependencies: SkillDependency[]
  metadata: {
    rawFrontmatter: Record<string, string>
    rawAgentConfig: SkillAgentConfig
    workflow?: string
    outputRules?: string
    hardConstraints?: string
    commitRules?: string
    subPackagesConfiguration?: string
    componentInventory?: string
  }
}

export interface SkillRegistration {
  name: string
  relativeDir: string
}

export interface ProjectSkillRegistry {
  names: string[]
  skills: ProjectSkill[]
  byName: Record<string, ProjectSkill>
}
