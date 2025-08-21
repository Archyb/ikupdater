// Main process: crée la fenêtre, gère IPC, orchestre Git/Composer/NPM.
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
// Modularized helpers
const { spawnCapture, runCommandSequence } = require('./exec');
const { loadConfig, saveConfig, getConfig } = require('./config');
const { getBranches } = require('./git');

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1100,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, '../preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
			spellcheck: false
		}
	});

	mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(() => {
	loadConfig();
});

function sendLog(projectPath, message) {
	if (mainWindow) {
		mainWindow.webContents.send('log-update', { projectPath, message });
	}
}

ipcMain.handle('select-folder', async () => {
	const result = await dialog.showOpenDialog(mainWindow, {
		properties: ['openDirectory']
	});
	if (result.canceled || !result.filePaths[0]) return null;
	return result.filePaths[0];
});

ipcMain.handle('scan-projects', async (_event, baseDir) => {
	if (!baseDir) return [];
	let entries = [];
	try {
		entries = fs.readdirSync(baseDir, { withFileTypes: true });
	} catch (e) {
		return [];
	}
	const projects = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const projectPath = path.join(baseDir, entry.name);
		const hasComposer = fs.existsSync(path.join(projectPath, 'composer.json'));
		const hasPackage = fs.existsSync(path.join(projectPath, 'package.json'));
		if (!hasComposer && !hasPackage) continue;
		let techs = [];
		if (hasComposer) techs.push('php');
		if (hasPackage) {
			let isTs = false;
			try {
				const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
				isTs = Boolean(
					(pkg.devDependencies && pkg.devDependencies.typescript) ||
					(pkg.dependencies && pkg.dependencies.typescript) ||
					fs.existsSync(path.join(projectPath, 'tsconfig.json'))
				);
			} catch {}
			techs.push(isTs ? 'ts' : 'node');
		}
		projects.push({
			name: entry.name,
			path: projectPath,
			techs
		});
	}
	return projects;
});

// Branch listing endpoint (delegates to git module)
ipcMain.handle('get-branches', async (_event, projectPath) => {
	return getBranches(projectPath);
});

// Config endpoints
ipcMain.handle('get-config', async () => {
	return getConfig();
});

ipcMain.handle('save-config', async (_event, next) => {
	if (typeof next !== 'object' || !next) return { ok: false };
	saveConfig(next);
	return { ok: true };
});

ipcMain.handle('execute-action', async (_event, { projectPath, action, branch }) => {
	if (!projectPath || !action) return { ok: false, error: 'invalid-args' };
	const sequence = [];
	// Determine branch: explicit -> config -> default
	const cfg = getConfig();
	const projectCfg = (cfg.projects && cfg.projects[projectPath]) || {};
	const targetBranch = branch || projectCfg.branch || 'develop';
	// Always fetch, then checkout branch, then fast-forward only merge from origin
	sequence.push({ cmd: 'git', args: ['fetch', '--all', '--prune'] });
	sequence.push({ cmd: 'git', args: ['checkout', targetBranch] });
	sequence.push({ cmd: 'git', args: ['merge', '--ff-only', `origin/${targetBranch}`] });

	if (action === 'node' || action === 'sync') {
		const useYarn = fs.existsSync(path.join(projectPath, 'yarn.lock'));
		const hasPackage = fs.existsSync(path.join(projectPath, 'package.json'));
		if (hasPackage) {
			const hasNvmrc = fs.existsSync(path.join(projectPath, '.nvmrc'));
			if (hasNvmrc) {
				const installCmd = useYarn ? 'yarn install --verbose' : 'npm install --loglevel info';
				sequence.push({ cmd: 'bash', args: ['-lc', `export NVM_DIR=\"$HOME/.nvm\"; [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\"; nvm use || nvm use --silent || true; ${installCmd}`] });
			} else {
				if (useYarn) {
					sequence.push({ cmd: 'yarn', args: ['install', '--verbose'] });
				} else {
					sequence.push({ cmd: 'npm', args: ['install', '--loglevel', 'info'] });
				}
			}
		} else if (action === 'node') {
			sendLog(projectPath, 'package.json not found, skipping Node install');
		}
	}

	if (action === 'php' || action === 'sync') {
		const hasComposer = fs.existsSync(path.join(projectPath, 'composer.json'));
		if (hasComposer) {
			// Check PHP version >= 7.3 before running composer
			try {
				const phpVer = (await spawnCapture('php', ['-r', 'echo PHP_VERSION;'], projectPath)).trim();
				const ok = compareSemver(phpVer, '7.3.0') >= 0;
				if (!ok) {
					sendLog(projectPath, `PHP ${phpVer} < 7.3, skipping Composer. Please switch to PHP >= 7.3.`);
				} else {
					sequence.push({ cmd: 'composer', args: ['install', '--ignore-platform-reqs'] });
				}
			} catch (e) {
				sendLog(projectPath, `Unable to check PHP version (${e.message}). Trying Composer anyway...`);
				sequence.push({ cmd: 'composer', args: ['install', '--ignore-platform-reqs'] });
			}
		} else if (action === 'php') {
			sendLog(projectPath, 'composer.json not found, skipping PHP');
		}
	}

	if (action !== 'git' && action !== 'sync' && action !== 'php' && action !== 'node') {
		return { ok: false, error: 'unknown-action' };
	}

	try {
		await runCommandSequence(projectPath, sequence, (chunk) => sendLog(projectPath, chunk));
		return { ok: true };
	} catch (e) {
		sendLog(projectPath, `\nError: ${e.message}\n`);
		return { ok: false, error: e.message };
	}
});

function compareSemver(a, b) {
	const pa = a.split('.').map(n => parseInt(n, 10) || 0);
	const pb = b.split('.').map(n => parseInt(n, 10) || 0);
	for (let i = 0; i < 3; i++) {
		if (pa[i] > pb[i]) return 1;
		if (pa[i] < pb[i]) return -1;
	}
	return 0;
}


