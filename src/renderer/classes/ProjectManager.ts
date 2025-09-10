import { Project, ProjectConfig, ProjectCapabilities, AggregatedCapabilities, Technology } from '../../types';

/**
 * Gestionnaire de projets pour l'interface utilisateur
 */
export class ProjectManager {
  private projects: Project[] = [];
  private projectConfigs: Record<string, ProjectConfig> = {};

  /**
   * Définit la liste des projets
   */
  public setProjects(projects: Project[]): void {
    this.projects = projects;
  }

  /**
   * Retourne la liste des projets
   */
  public getProjects(): Project[] {
    return [...this.projects];
  }

  /**
   * Définit la configuration d'un projet
   */
  public setProjectConfig(projectPath: string, config: ProjectConfig): void {
    this.projectConfigs[projectPath] = config;
  }

  /**
   * Retourne la configuration d'un projet
   */
  public getProjectConfig(projectPath: string): ProjectConfig {
    return this.projectConfigs[projectPath] || {
      include: true,
      branch: 'develop',
      gitStrategy: 'pull'
    };
  }

  /**
   * Calcule les capacités d'un projet basées sur ses technologies
   */
  public getProjectCapabilities(techs: Technology[]): ProjectCapabilities {
    const hasPhp = techs.includes('php');
    const hasNode = techs.some(t => t === 'node' || t === 'ts' || t === 'js');
    const hasGit = true; // On part du principe que Git est toujours disponible

    return { hasPhp, hasNode, hasGit };
  }

  /**
   * Calcule les capacités agrégées sur la sélection
   */
  public getAggregatedCapabilities(): AggregatedCapabilities {
    let anyIncluded = false;
    let anyGit = false;
    let anyPhp = false;
    let anyNode = false;

    for (const project of this.projects) {
      const config = this.getProjectConfig(project.path);
      if (!config.include) continue;

      anyIncluded = true;
      const capabilities = this.getProjectCapabilities(project.techs);
      
      anyGit = anyGit || capabilities.hasGit;
      anyPhp = anyPhp || capabilities.hasPhp;
      anyNode = anyNode || capabilities.hasNode;
    }

    return { anyIncluded, anyGit, anyPhp, anyNode };
  }

  /**
   * Retourne les projets inclus dans la sélection
   */
  public getIncludedProjects(): Project[] {
    return this.projects.filter(project => {
      const config = this.getProjectConfig(project.path);
      return config.include;
    });
  }

  /**
   * Inclut tous les projets
   */
  public includeAllProjects(): void {
    for (const project of this.projects) {
      const config = this.getProjectConfig(project.path);
      this.setProjectConfig(project.path, { ...config, include: true });
    }
  }

  /**
   * Exclut tous les projets
   */
  public excludeAllProjects(): void {
    for (const project of this.projects) {
      const config = this.getProjectConfig(project.path);
      this.setProjectConfig(project.path, { ...config, include: false });
    }
  }

  /**
   * Échappe un ID pour l'utiliser en CSS
   */
  public escapeCssId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}
