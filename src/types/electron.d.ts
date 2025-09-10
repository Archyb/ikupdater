// Types pour Electron
declare module 'electron' {
  export interface BrowserWindow {
    webContents: {
      send: (channel: string, ...args: any[]) => void;
    };
  }
}
