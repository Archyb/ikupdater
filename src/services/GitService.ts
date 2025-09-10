import * as fs from 'fs';
import * as path from 'path';
import { CommandService } from './CommandService';
import { BranchesResponse } from '../types';

/**
 * Service de gestion Git
 */
export class GitService {
  private static instance: GitService;
  private commandService: CommandService;

  private constructor() {
    this.commandService = CommandService.getInstance();
  }

  public static getInstance(): GitService {
    if (!GitService.instance) {
      GitService.instance = new GitService();
    }
    return GitService.instance;
  }

  /**
   * Retourne la liste des branches locales et la branche courante
   */
  public async getBranches(projectPath: string): Promise<BranchesResponse> {
    if (!fs.existsSync(path.join(projectPath, '.git'))) {
      return { branches: [], current: '' };
    }

    try {
      // Récupère la branche courante
      const currentRaw = (await this.commandService.spawnCapture(
        'git', 
        ['rev-parse', '--abbrev-ref', 'HEAD'], 
        projectPath
      )).trim();
      
      const current = currentRaw === 'HEAD' ? '' : currentRaw; // '' si detached HEAD

      // Liste strictement locale
      const raw = await this.commandService.spawnCapture(
        'git', 
        ['for-each-ref', '--format=%(refname:short)', 'refs/heads/'], 
        projectPath
      );

      const set = new Set<string>();
      raw.split(/\r?\n/)
        .map(s => s.trim())
        .forEach(name => {
          if (!name) return;
          set.add(name);
        });

      const unique = Array.from(set);

      // Tri avec priorités
      const priority = ['develop', 'main', 'master'];
      unique.sort((a, b) => {
        const ia = priority.indexOf(a);
        const ib = priority.indexOf(b);
        if (ia !== -1 || ib !== -1) {
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        }
        return a.localeCompare(b);
      });

      return { branches: unique, current };
    } catch (error) {
      console.error('Error getting branches:', error);
      return { branches: [], current: '' };
    }
  }

  /**
   * Vérifie si un répertoire est un dépôt Git valide
   */
  public isGitRepository(projectPath: string): boolean {
    return fs.existsSync(path.join(projectPath, '.git'));
  }
}
