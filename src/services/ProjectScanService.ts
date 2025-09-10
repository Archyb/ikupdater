import * as fs from 'fs';
import * as path from 'path';
import { Project, Technology } from '../types';

/**
 * Service de scan et détection des projets
 */
export class ProjectScanService {
  private static instance: ProjectScanService;

  private constructor() {}

  public static getInstance(): ProjectScanService {
    if (!ProjectScanService.instance) {
      ProjectScanService.instance = new ProjectScanService();
    }
    return ProjectScanService.instance;
  }

  /**
   * Scanne un répertoire pour détecter les projets
   */
  public async scanProjects(baseDir: string): Promise<Project[]> {
    if (!baseDir) return [];

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(baseDir, { withFileTypes: true });
    } catch (error) {
      console.error('Error reading directory:', error);
      return [];
    }

    const projects: Project[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const projectPath = path.join(baseDir, entry.name);
      const techs = this.detectTechnologies(projectPath);

      if (techs.length > 0) {
        projects.push({
          name: entry.name,
          path: projectPath,
          techs
        });
      }
    }

    return projects;
  }

  /**
   * Détecte les technologies utilisées dans un projet
   */
  private detectTechnologies(projectPath: string): Technology[] {
    const techs: Technology[] = [];

    // Détection PHP/Composer
    if (fs.existsSync(path.join(projectPath, 'composer.json'))) {
      techs.push('php');
    }

    // Détection Node.js/npm/yarn
    if (fs.existsSync(path.join(projectPath, 'package.json'))) {
      const isTypeScript = this.isTypeScriptProject(projectPath);
      techs.push(isTypeScript ? 'ts' : 'node');
    }

    return techs;
  }

  /**
   * Vérifie si un projet utilise TypeScript
   */
  private isTypeScriptProject(projectPath: string): boolean {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      const hasTypeScript = Boolean(
        (pkg.devDependencies && pkg.devDependencies.typescript) ||
        (pkg.dependencies && pkg.dependencies.typescript) ||
        fs.existsSync(path.join(projectPath, 'tsconfig.json'))
      );

      return hasTypeScript;
    } catch (error) {
      console.warn('Error reading package.json:', error);
      return false;
    }
  }

  /**
   * Vérifie si un projet a un fichier composer.json
   */
  public hasComposer(projectPath: string): boolean {
    return fs.existsSync(path.join(projectPath, 'composer.json'));
  }

  /**
   * Vérifie si un projet a un fichier package.json
   */
  public hasPackageJson(projectPath: string): boolean {
    return fs.existsSync(path.join(projectPath, 'package.json'));
  }

  /**
   * Vérifie si un projet utilise Yarn
   */
  public usesYarn(projectPath: string): boolean {
    return fs.existsSync(path.join(projectPath, 'yarn.lock'));
  }

  /**
   * Vérifie si un projet a un fichier .nvmrc
   */
  public hasNvmrc(projectPath: string): boolean {
    return fs.existsSync(path.join(projectPath, '.nvmrc'));
  }

  /**
   * Vérifie si un projet a un fichier de version PHP
   */
  public hasPhpVersionFile(projectPath: string): boolean {
    return fs.existsSync(path.join(projectPath, '.php-version')) ||
           fs.existsSync(path.join(projectPath, '.tool-versions')) ||
           fs.existsSync(path.join(projectPath, 'php-version'));
  }
}
