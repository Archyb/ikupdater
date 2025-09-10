import { contextBridge, ipcRenderer } from 'electron';
import { ElectronAPI, LogData, ExecuteActionPayload, AppConfig, VersionResponse, ConfigResponse, BranchesResponse } from './types';

/**
 * API exposée au renderer via contextBridge
 */
const electronAPI: ElectronAPI = {
  // Sélection de dossier
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),

  // Scan des projets
  scanProjects: (baseDir: string) => ipcRenderer.invoke('scan-projects', baseDir),

  // Exécution d'actions
  executeAction: (payload: ExecuteActionPayload) => ipcRenderer.invoke('execute-action', payload),

  // Configuration
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('get-config'),
  saveConfig: (config: AppConfig): Promise<ConfigResponse> => ipcRenderer.invoke('save-config', config),

  // Versions
  getPhpVersion: (): Promise<VersionResponse> => ipcRenderer.invoke('get-php-version'),
  getNodeVersion: (): Promise<VersionResponse> => ipcRenderer.invoke('get-node-version'),

  // Test
  testLog: (): Promise<ConfigResponse> => ipcRenderer.invoke('test-log'),

  // Logging
  onLog: (callback: (data: LogData) => void): void => {
    ipcRenderer.on('log', (_event, data: LogData) => {
      console.log('Preload received log:', data);
      callback(data);
    });
  },

  // Branches Git
  getBranches: (projectPath: string): Promise<BranchesResponse> => ipcRenderer.invoke('get-branches', projectPath),
};

// Exposition de l'API au renderer
contextBridge.exposeInMainWorld('api', electronAPI);
