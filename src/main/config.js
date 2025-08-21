const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Simple JSON-backed configuration storage.
 * Stores base directory and per-project settings (include, branch).
 */
let inMemoryConfig = { baseDir: '', projects: {}, theme: 'dark' };

/**
 * Returns absolute path for the config file inside Electron userData folder.
 */
function getConfigPath() {
	const dir = app.getPath('userData');
	return path.join(dir, 'config.json');
}

/**
 * Loads configuration from disk into memory.
 */
function loadConfig() {
	try {
		const raw = fs.readFileSync(getConfigPath(), 'utf-8');
		inMemoryConfig = JSON.parse(raw);
	} catch {}
}

/**
 * Persists given configuration to disk and memory.
 * @param {object} next
 */
function saveConfig(next) {
	inMemoryConfig = next || inMemoryConfig;
	try {
		fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true });
		fs.writeFileSync(getConfigPath(), JSON.stringify(inMemoryConfig, null, 2), 'utf-8');
	} catch {}
}

/**
 * Returns current configuration object from memory.
 */
function getConfig() {
	return inMemoryConfig;
}

module.exports = {
	getConfigPath,
	loadConfig,
	saveConfig,
	getConfig,
};


