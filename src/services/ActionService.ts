import { CommandService } from './CommandService';
import { ProjectScanService } from './ProjectScanService';
import { ConfigService } from './ConfigService';
import { 
  ExecuteActionPayload, 
  ExecuteActionResponse, 
  CommandSequence, 
  LogData,
  Action,
  GitStrategy
} from '../types';

/**
 * Service d'exécution des actions sur les projets
 */
export class ActionService {
  private static instance: ActionService;
  private commandService: CommandService;
  private projectScanService: ProjectScanService;
  private configService: ConfigService;

  private constructor() {
    this.commandService = CommandService.getInstance();
    this.projectScanService = ProjectScanService.getInstance();
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): ActionService {
    if (!ActionService.instance) {
      ActionService.instance = new ActionService();
    }
    return ActionService.instance;
  }

  /**
   * Exécute une action sur un projet
   */
  public async executeAction(
    payload: ExecuteActionPayload,
    onLog: (data: LogData) => void
  ): Promise<ExecuteActionResponse> {
    const { projectPath, action, branch, gitStrategy } = payload;

    if (!projectPath || !action) {
      return { ok: false, error: 'invalid-args' };
    }

    try {
      const sequence = this.buildCommandSequence(projectPath, action, branch, gitStrategy);
      await this.commandService.runCommandSequence(projectPath, sequence, (chunk) => {
        onLog({ projectPath, message: chunk });
      });

      return { ok: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onLog({ projectPath, message: `\nError: ${errorMessage}\n` });
      return { ok: false, error: errorMessage };
    }
  }

  /**
   * Construit la séquence de commandes pour une action
   */
  private buildCommandSequence(
    projectPath: string,
    action: Action,
    branch?: string,
    gitStrategy?: GitStrategy
  ): CommandSequence[] {
    const sequence: CommandSequence[] = [];
    const projectConfig = this.configService.getProjectConfig(projectPath);
    
    const targetBranch = branch || projectConfig.branch || 'develop';
    const strategy = gitStrategy || projectConfig.gitStrategy || 'pull';

    // Commandes Git communes
    if (action === 'git' || action === 'sync') {
      sequence.push({ cmd: 'git', args: ['fetch', '--all', '--prune'] });
      sequence.push({ cmd: 'git', args: ['checkout', targetBranch] });
      
      if (strategy === 'rebase') {
        sequence.push({ cmd: 'git', args: ['rebase', `origin/${targetBranch}`] });
      } else {
        sequence.push({ cmd: 'git', args: ['pull', 'origin', targetBranch] });
      }
    }

    // Commandes Node.js
    if (action === 'node' || action === 'sync') {
      const nodeCommands = this.buildNodeCommands(projectPath);
      sequence.push(...nodeCommands);
    }

    // Commandes PHP
    if (action === 'php' || action === 'sync') {
      const phpCommands = this.buildPhpCommands(projectPath);
      sequence.push(...phpCommands);
    }

    return sequence;
  }

  /**
   * Construit les commandes Node.js pour un projet
   */
  private buildNodeCommands(projectPath: string): CommandSequence[] {
    const commands: CommandSequence[] = [];

    if (!this.projectScanService.hasPackageJson(projectPath)) {
      return commands;
    }

    const useYarn = this.projectScanService.usesYarn(projectPath);
    const hasNvmrc = this.projectScanService.hasNvmrc(projectPath);

    if (hasNvmrc) {
      const installCmd = useYarn ? 'yarn install --verbose' : 'npm install --loglevel info';
      commands.push({
        cmd: 'bash',
        args: ['-lc', `export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; nvm use || nvm use --silent || true; ${installCmd}`]
      });
    } else {
      if (useYarn) {
        commands.push({ cmd: 'yarn', args: ['install', '--verbose'] });
      } else {
        commands.push({ cmd: 'npm', args: ['install', '--loglevel', 'info'] });
      }
    }

    return commands;
  }

  /**
   * Construit les commandes PHP pour un projet
   */
  private buildPhpCommands(projectPath: string): CommandSequence[] {
    const commands: CommandSequence[] = [];

    if (!this.projectScanService.hasComposer(projectPath)) {
      return commands;
    }

    const hasPhpVersion = this.projectScanService.hasPhpVersionFile(projectPath);

    if (hasPhpVersion) {
      const phpVersionCmd = `export PATH="$HOME/.phpenv/bin:$PATH"; 
                            export PATH="$HOME/.asdf/shims:$PATH"; 
                            export PATH="$HOME/.phpbrew/bin:$PATH"; 
                            if command -v phpenv >/dev/null 2>&1; then
                              phpenv local && phpenv version-name
                            elif command -v asdf >/dev/null 2>&1; then
                              asdf local php && asdf current php
                            elif command -v phpbrew >/dev/null 2>&1; then
                              phpbrew use
                            else
                              echo "No PHP version manager found (phpenv, asdf, or phpbrew)"
                            fi`;
      
      commands.push({ cmd: 'bash', args: ['-lc', phpVersionCmd] });
    }

    // Vérification de la version PHP et installation Composer
    commands.push({
      cmd: 'bash',
      args: ['-lc', `
        php_version=$(php -r 'echo PHP_VERSION;' 2>/dev/null || echo '0.0.0');
        if [ "$(echo "$php_version 7.3.0" | awk '{print ($1 >= $2)}')" = "1" ]; then
          composer install --ignore-platform-reqs
        else
          echo "PHP $php_version < 7.3, skipping Composer. Please switch to PHP >= 7.3."
        fi
      `]
    });

    return commands;
  }

  /**
   * Obtient la version PHP actuelle
   */
  public async getPhpVersion(): Promise<string> {
    try {
      const version = (await this.commandService.spawnCapture(
        'php', 
        ['-r', 'echo PHP_VERSION;'], 
        process.cwd()
      )).trim();
      return version;
    } catch (error) {
      throw new Error('PHP not available');
    }
  }

  /**
   * Obtient la version Node.js actuelle
   */
  public async getNodeVersion(): Promise<string> {
    try {
      const version = (await this.commandService.spawnCapture(
        'node', 
        ['--version'], 
        process.cwd()
      )).trim();
      return version;
    } catch (error) {
      throw new Error('Node.js not available');
    }
  }
}
