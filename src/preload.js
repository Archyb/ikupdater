// Preload: expose une API minimale et sécurisée au renderer via contextBridge.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
	// Ouvre un sélecteur pour choisir le dossier parent des projets
	selectFolder: () => ipcRenderer.invoke('select-folder'),
	// Scanne le dossier pour détecter les projets et leurs technos
	scanProjects: (baseDir) => ipcRenderer.invoke('scan-projects', baseDir),
	// Exécute une action: 'git' | 'php' | 'node' | 'sync' (avec branche optionnelle)
	executeAction: (payload) => ipcRenderer.invoke('execute-action', payload),
	// Config
	getConfig: () => ipcRenderer.invoke('get-config'),
	saveConfig: (config) => ipcRenderer.invoke('save-config', config),
	
	// Versions
	getPhpVersion: () => ipcRenderer.invoke('get-php-version'),
	getNodeVersion: () => ipcRenderer.invoke('get-node-version'),
	
	// Test
	testLog: () => ipcRenderer.invoke('test-log'),
	
	// Logging
	onLog: (callback) => {
		ipcRenderer.on('log', (_event, data) => {
			console.log('Preload received log:', data);
			callback(data);
		});
	},
	// Liste les branches Git disponibles pour un projet
	getBranches: (projectPath) => ipcRenderer.invoke('get-branches', projectPath),
});


