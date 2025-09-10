import { spawn } from 'child_process';
import { CommandSequence } from '../types';

/**
 * Service d'exécution de commandes système
 */
export class CommandService {
  private static instance: CommandService;

  private constructor() {}

  public static getInstance(): CommandService {
    if (!CommandService.instance) {
      CommandService.instance = new CommandService();
    }
    return CommandService.instance;
  }

  /**
   * Retourne l'environnement avec les chemins de développement communs
   */
  private getSpawnEnv(): NodeJS.ProcessEnv {
    const currentPath = process.env['PATH'] || '';
    const commonPaths = [
      '/Users/arthurnoguera/Library/Application Support/Herd/bin', // Laravel Herd
      '/opt/homebrew/bin', // Homebrew on Apple Silicon
      '/usr/local/bin', // Homebrew on Intel
      '/Users/arthurnoguera/.phpenv/bin', // phpenv
      '/Users/arthurnoguera/.asdf/shims', // asdf
      '/Users/arthurnoguera/.phpbrew/bin' // phpbrew
    ];
    
    let finalPath = currentPath;
    for (const path of commonPaths) {
      if (!finalPath.includes(path)) {
        finalPath = `${path}:${finalPath}`;
      }
    }
    
    return {
      ...process.env,
      PATH: finalPath,
      GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes',
      GIT_TERMINAL_PROMPT: '0'
    };
  }

  /**
   * Exécute une commande et retourne la sortie capturée
   */
  public async spawnCapture(cmd: string, args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { 
        cwd, 
        env: this.getSpawnEnv(), 
        shell: false 
      });
      
      let out = '';
      let err = '';
      
      child.stdout.on('data', (data: any) => {
        out += data.toString();
      });
      
      child.stderr.on('data', (data: any) => {
        err += data.toString();
      });
      
      child.on('error', (error: any) => {
        reject(new Error(`${cmd} not found or failed to start: ${error.message}`));
      });
      
      child.on('close', (code: any) => {
        if (code === 0) {
          resolve(out);
        } else {
          reject(new Error(err || `${cmd} exited with ${code}`));
        }
      });
    });
  }

  /**
   * Exécute une séquence de commandes avec streaming de la sortie
   */
  public async runCommandSequence(
    cwd: string, 
    sequence: CommandSequence[], 
    onData: (chunk: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let index = 0;
      
      const runNext = (): void => {
        if (index >= sequence.length) {
          resolve();
          return;
        }
        
        const command = sequence[index++];
        if (!command) {
          resolve();
          return;
        }
        
        const { cmd, args } = command;
        onData(`\n$ ${cmd} ${args.join(' ')}\n`);
        
        const child = spawn(cmd, args, { 
          cwd, 
          env: this.getSpawnEnv(), 
          shell: false 
        });
        
        child.stdout.on('data', (data: any) => {
          onData(data.toString());
        });
        
        child.stderr.on('data', (data: any) => {
          onData(data.toString());
        });
        
        child.on('error', (error: any) => {
          reject(new Error(`${cmd} not found or failed to start: ${error.message}`));
        });
        
        child.on('close', (code: any) => {
          if (code === 0) {
            runNext();
          } else {
            reject(new Error(`${cmd} exited with code ${code}`));
          }
        });
      };
      
      runNext();
    });
  }

  /**
   * Compare deux versions semver
   */
  public compareSemver(a: string, b: string): number {
    const pa = a.split('.').map(n => parseInt(n, 10) || 0);
    const pb = b.split('.').map(n => parseInt(n, 10) || 0);
    
    for (let i = 0; i < 3; i++) {
      const paVal = pa[i] ?? 0;
      const pbVal = pb[i] ?? 0;
      if (paVal > pbVal) return 1;
      if (paVal < pbVal) return -1;
    }
    
    return 0;
  }
}
