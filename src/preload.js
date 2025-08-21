// Preload: expose une API minimale et sécurisée au renderer via contextBridge.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
	// Ouvre un sélecteur pour choisir le dossier parent des projets
	selectFolder: () => ipcRenderer.invoke('select-folder'),
	// Scanne le dossier pour détecter les projets et leurs technos
	scanProjects: (baseDir) => ipcRenderer.invoke('scan-projects', baseDir),
	// Exécute une action: 'git' | 'php' | 'node' | 'sync' (avec branche optionnelle)
	executeAction: (payload) => ipcRenderer.invoke('execute-action', payload),
	// Récupère la configuration persistée
	getConfig: () => ipcRenderer.invoke('get-config'),
	// Sauvegarde la configuration persistée
	saveConfig: (next) => ipcRenderer.invoke('save-config', next),
	// Liste les branches Git disponibles pour un projet
	getBranches: (projectPath) => ipcRenderer.invoke('get-branches', projectPath),
	// Ecoute le flux de logs (stdout/stderr) émis par le main
	onLog: (callback) => {
		ipcRenderer.on('log-update', (_event, data) => callback(data));
	}
});


