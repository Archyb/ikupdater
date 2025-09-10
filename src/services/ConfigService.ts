import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, ProjectConfig } from '../types';

/**
 * Service de gestion de la configuration de l'application
 */
export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig = {
    baseDir: '',
    projects: {},
    theme: 'system'
  };

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Retourne le chemin absolu du fichier de configuration
   */
  private getConfigPath(): string {
    const dir = app.getPath('userData');
    return path.join(dir, 'config.json');
  }

  /**
   * Charge la configuration depuis le disque
   */
  public loadConfig(): void {
    try {
      const raw = fs.readFileSync(this.getConfigPath(), 'utf-8');
      this.config = JSON.parse(raw);
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
    }
  }

  /**
   * Sauvegarde la configuration sur le disque
   */
  public saveConfig(config: AppConfig): void {
    this.config = config;
    try {
      fs.mkdirSync(path.dirname(this.getConfigPath()), { recursive: true });
      fs.writeFileSync(this.getConfigPath(), JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  /**
   * Retourne la configuration actuelle
   */
  public getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Met à jour la configuration d'un projet spécifique
   */
  public updateProjectConfig(projectPath: string, config: Partial<ProjectConfig>): void {
    this.config.projects[projectPath] = {
      ...this.config.projects[projectPath],
      include: true,
      branch: 'develop',
      gitStrategy: 'pull',
      ...config
    };
  }

  /**
   * Retourne la configuration d'un projet spécifique
   */
  public getProjectConfig(projectPath: string): ProjectConfig {
    return this.config.projects[projectPath] || {
      include: true,
      branch: 'develop',
      gitStrategy: 'pull'
    };
  }

  /**
   * Supprime la configuration d'un projet
   */
  public removeProjectConfig(projectPath: string): void {
    delete this.config.projects[projectPath];
  }
}
