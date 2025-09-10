// Types de base pour l'application

export interface Project {
  name: string;
  path: string;
  techs: Technology[];
}

export type Technology = 'php' | 'node' | 'ts' | 'js';

export interface ProjectConfig {
  include: boolean;
  branch: string;
  gitStrategy: GitStrategy;
}

export type GitStrategy = 'pull' | 'rebase';

export interface AppConfig {
  baseDir: string;
  projects: Record<string, ProjectConfig>;
  theme: Theme;
}

export type Theme = 'light' | 'dark' | 'system';

export interface ProjectCapabilities {
  hasPhp: boolean;
  hasNode: boolean;
  hasGit: boolean;
}

export interface AggregatedCapabilities {
  anyIncluded: boolean;
  anyGit: boolean;
  anyPhp: boolean;
  anyNode: boolean;
}

export type Action = 'git' | 'php' | 'node' | 'sync';

export interface ExecuteActionPayload {
  projectPath: string;
  action: Action;
  branch?: string;
  gitStrategy?: GitStrategy;
}

export interface CommandSequence {
  cmd: string;
  args: string[];
}

export interface LogData {
  projectPath?: string;
  message: string;
}

export interface VersionResponse {
  ok: boolean;
  version?: string;
  error?: string;
}

export interface ConfigResponse {
  ok: boolean;
}

export interface BranchesResponse {
  branches: string[];
  current: string;
}

export interface ExecuteActionResponse {
  ok: boolean;
  error?: string;
}

// API exposée au renderer
export interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  scanProjects: (baseDir: string) => Promise<Project[]>;
  executeAction: (payload: ExecuteActionPayload) => Promise<ExecuteActionResponse>;
  getConfig: () => Promise<AppConfig>;
  saveConfig: (config: AppConfig) => Promise<ConfigResponse>;
  getPhpVersion: () => Promise<VersionResponse>;
  getNodeVersion: () => Promise<VersionResponse>;
  testLog: () => Promise<ConfigResponse>;
  onLog: (callback: (data: LogData) => void) => void;
  getBranches: (projectPath: string) => Promise<BranchesResponse>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
