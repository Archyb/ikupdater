import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { ConfigService } from '../services/ConfigService';
import { ProjectScanService } from '../services/ProjectScanService';
import { ActionService } from '../services/ActionService';
import { GitService } from '../services/GitService';
import { 
  Project, 
  AppConfig, 
  ExecuteActionPayload, 
  ExecuteActionResponse,
  VersionResponse,
  ConfigResponse,
  BranchesResponse,
  LogData
} from '../types';

/**
 * Application principale Electron
 */
class MainApplication {
  private mainWindow: BrowserWindow | null = null;
  private configService: ConfigService;
  private projectScanService: ProjectScanService;
  private actionService: ActionService;
  private gitService: GitService;

  constructor() {
    this.configService = ConfigService.getInstance();
    this.projectScanService = ProjectScanService.getInstance();
    this.actionService = ActionService.getInstance();
    this.gitService = GitService.getInstance();
  }

  /**
   * Initialise l'application
   */
  public async initialize(): Promise<void> {
    // Configuration des événements de l'application
    app.whenReady().then(() => {
      this.createWindow();
      this.setupIpcHandlers();
      this.configService.loadConfig();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  /**
   * Crée la fenêtre principale
   */
  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1100,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false
      }
    });

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  /**
   * Configure les gestionnaires IPC
   */
  private setupIpcHandlers(): void {
    // Sélection de dossier
    ipcMain.handle('select-folder', async (): Promise<string | null> => {
      const result = await dialog.showOpenDialog(this.mainWindow as any, {
        properties: ['openDirectory']
      });
      
      if (result.canceled || !result.filePaths[0]) {
        return null;
      }
      
      return result.filePaths[0];
    });

    // Scan des projets
    ipcMain.handle('scan-projects', async (_event, baseDir: string): Promise<Project[]> => {
      return this.projectScanService.scanProjects(baseDir);
    });

    // Exécution d'actions
    ipcMain.handle('execute-action', async (
      _event, 
      payload: ExecuteActionPayload
    ): Promise<ExecuteActionResponse> => {
      return this.actionService.executeAction(payload, (data: LogData) => {
        this.sendLog(data);
      });
    });

    // Configuration
    ipcMain.handle('get-config', async (): Promise<AppConfig> => {
      return this.configService.getConfig();
    });

    ipcMain.handle('save-config', async (_event, config: AppConfig): Promise<ConfigResponse> => {
      this.configService.saveConfig(config);
      return { ok: true };
    });

    // Versions
    ipcMain.handle('get-php-version', async (): Promise<VersionResponse> => {
      try {
        const version = await this.actionService.getPhpVersion();
        return { ok: true, version };
      } catch (error) {
        return { 
          ok: false, 
          error: error instanceof Error ? error.message : 'PHP not available' 
        };
      }
    });

    ipcMain.handle('get-node-version', async (): Promise<VersionResponse> => {
      try {
        const version = await this.actionService.getNodeVersion();
        return { ok: true, version };
      } catch (error) {
        return { 
          ok: false, 
          error: error instanceof Error ? error.message : 'Node.js not available' 
        };
      }
    });

    // Branches Git
    ipcMain.handle('get-branches', async (_event, projectPath: string): Promise<BranchesResponse> => {
      return this.gitService.getBranches(projectPath);
    });

    // Test de log
    ipcMain.handle('test-log', async (): Promise<ConfigResponse> => {
      this.sendLog({ projectPath: '/test/path', message: 'TEST: This is a test log message from main process\n' });
      return { ok: true };
    });
  }

  /**
   * Envoie un message de log au renderer
   */
  private sendLog(data: LogData): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('log', data);
    } else {
      console.log('No mainWindow available');
    }
  }
}

// Initialisation de l'application
const mainApp = new MainApplication();
mainApp.initialize().catch(console.error);
