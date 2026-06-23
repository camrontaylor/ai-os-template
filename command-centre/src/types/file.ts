export interface FileNode {
  name: string;
  path: string;           // relative to agenticOsDir
  type: 'file' | 'directory';
  lastModified: string;   // ISO timestamp
  size: number;           // bytes
  children?: FileNode[];  // only for directories
}

export interface FileContent {
  path: string;
  content: string;
  lastModified: string;   // ISO timestamp for optimistic concurrency
}

export interface SkillDependency {
  skill: string;          // skill folder name (e.g., "tool-youtube")
  required: boolean;      // true = required, false = optional
  description: string;    // what it provides
  fallback: string;       // what happens without it
}

export interface InstalledSkill {
  name: string;           // from frontmatter 'name' field
  category: string;       // extracted from folder prefix (mkt, str, viz, etc.)
  description: string;    // from frontmatter 'description' field
  triggers: string[];     // from frontmatter 'triggers' array
  folderName: string;     // directory name
  dependencies: SkillDependency[];  // parsed from ## Dependencies section in SKILL.md body (per SKILL-01)
}
