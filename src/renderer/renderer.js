// Renderer: logique UI. Gère sélection de dossier, liste des projets,
// exécution d'actions et affichage des logs.
const chooseBtn = document.getElementById('chooseFolder');
const baseDirEl = document.getElementById('baseDir');
const projectsEl = document.getElementById('projects');
const globalLogEl = document.getElementById('globalLog');
const bulkGitEl = document.getElementById('bulkGit');
const bulkPhpEl = document.getElementById('bulkPhp');
const bulkNodeEl = document.getElementById('bulkNode');
const runSelectedBtn = document.getElementById('runSelected');
const selectAllBtn = document.getElementById('selectAll');
const clearSelectionBtn = document.getElementById('clearSelection');
const themePicker = document.getElementById('themePicker');

// Etat local UI
let projectList = [];
let settings = { baseDir: '', projects: {} };

// Rendu des cartes projet avec actions, include et branche
function renderProjects() {
	projectsEl.innerHTML = '';
	for (const proj of projectList) {
		const card = document.createElement('div');
		card.className = 'card';
		const projCfg = settings.projects[proj.path] || { include: true, branch: 'develop' };
		card.innerHTML = `
			<div class="card-header">
				<div>
					<div class="title">${proj.name}</div>
					<div class="subtitle">${proj.techs.join(', ')}</div>
					<div class="path">${proj.path}</div>
				</div>
				<div class="actions">
					<label class="inc"><input type="checkbox" class="include" ${projCfg.include ? 'checked' : ''}/> Include</label>
					<select class="branch" title="Branche"><option>${projCfg.branch || 'develop'}</option></select>
					<button data-action="git">Git</button>
					<button data-action="php" ${proj.techs.includes('php') ? '' : 'disabled'}>PHP</button>
					<button data-action="node" ${proj.techs.some(t => t === 'node' || t === 'ts') ? '' : 'disabled'}>Node</button>
					<button data-action="sync">Sync</button>
				</div>
			</div>
			<pre class="log" id="log-${cssEscape(proj.path)}"></pre>
		`;
		projectsEl.appendChild(card);
		// Actions: git / php / node / sync
		const buttons = card.querySelectorAll('button[data-action]');
		buttons.forEach(btn => {
			btn.addEventListener('click', async () => {
				btn.disabled = true;
				try {
					const branch = (settings.projects[proj.path] && settings.projects[proj.path].branch) || 'develop';
					await window.api.executeAction({ projectPath: proj.path, action: btn.dataset.action, branch });
				} finally {
					btn.disabled = false;
				}
			});
		});
		const includeEl = card.querySelector('.include');
		includeEl.addEventListener('change', () => {
			settings.projects[proj.path] = settings.projects[proj.path] || {};
			settings.projects[proj.path].include = includeEl.checked;
			saveSettings();
		});
		const branchEl = card.querySelector('.branch');
		populateBranches(proj.path, branchEl);
		branchEl.addEventListener('change', () => {
			settings.projects[proj.path] = settings.projects[proj.path] || {};
			settings.projects[proj.path].branch = branchEl.value || 'develop';
			saveSettings();
		});
	}
}

// Utilitaire pour créer un id CSS safe
function cssEscape(id) {
	return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Choix du dossier parent -> scan et rendu
chooseBtn.addEventListener('click', async () => {
	const dir = await window.api.selectFolder();
	if (!dir) return;
	baseDirEl.textContent = dir;
	settings.baseDir = dir;
	saveSettings();
	projectList = await window.api.scanProjects(dir);
	ensureProjectSettings();
	renderProjects();
});

// Flux de logs depuis le main: par projet + console globale
window.api.onLog(({ projectPath, message }) => {
	const el = document.getElementById(`log-${cssEscape(projectPath)}`);
	if (!el) return;
	el.textContent += message;
	el.scrollTop = el.scrollHeight;
	if (globalLogEl) {
		const prefix = projectPath ? `[${projectPath}] ` : '';
		globalLogEl.textContent += prefix + message;
		globalLogEl.scrollTop = globalLogEl.scrollHeight;
	}
});

// Initialise des valeurs par défaut pour chaque projet
function ensureProjectSettings() {
	for (const proj of projectList) {
		if (!settings.projects[proj.path]) {
			settings.projects[proj.path] = { include: true, branch: 'develop' };
		}
	}
}

// Charge la configuration persistée au démarrage
async function loadSettings() {
	const cfg = await window.api.getConfig();
	settings = cfg || settings;
	applyTheme(settings.theme || 'dark');
	if (themePicker) themePicker.value = settings.theme || 'dark';
	if (settings.baseDir) {
		baseDirEl.textContent = settings.baseDir;
		projectList = await window.api.scanProjects(settings.baseDir);
		ensureProjectSettings();
		renderProjects();
	}
}

// Sauvegarde la configuration persistée
function saveSettings() {
	window.api.saveConfig(settings);
}

function applyTheme(theme) {
	const root = document.documentElement;
	if (theme === 'light') root.classList.add('light');
	else root.classList.remove('light');
}

if (themePicker) {
	themePicker.addEventListener('change', () => {
		settings.theme = themePicker.value;
		applyTheme(settings.theme);
		saveSettings();
	});
}

async function populateBranches(projectPath, selectEl) {
	selectEl.disabled = true;
	try {
		const { branches, current } = await window.api.getBranches(projectPath);
		const existing = new Set();
		selectEl.innerHTML = '';
		const opt = (name) => {
			if (existing.has(name)) return;
			existing.add(name);
			const o = document.createElement('option');
			o.value = name;
			o.textContent = name;
			selectEl.appendChild(o);
		};
		const cfg = settings.projects[projectPath] || { branch: 'develop' };
		if (current) opt(current);
		for (const b of branches) opt(b);
		if (cfg.branch) opt(cfg.branch);
		selectEl.value = cfg.branch || current || 'develop';
	} catch {
		// fallback keeps existing value
	} finally {
		selectEl.disabled = false;
	}
}

// Exécute les actions groupées sur les projets inclus
runSelectedBtn.addEventListener('click', async () => {
	const doGit = bulkGitEl.checked;
	const doPhp = bulkPhpEl.checked;
	const doNode = bulkNodeEl.checked;
	for (const proj of projectList) {
		const cfg = settings.projects[proj.path] || { include: true, branch: 'develop' };
		if (!cfg.include) continue;
		if (doGit) await window.api.executeAction({ projectPath: proj.path, action: 'git', branch: cfg.branch });
		if (doPhp && proj.techs.includes('php')) await window.api.executeAction({ projectPath: proj.path, action: 'php', branch: cfg.branch });
		if (doNode && proj.techs.some(t => t === 'node' || t === 'ts')) await window.api.executeAction({ projectPath: proj.path, action: 'node', branch: cfg.branch });
	}
});

// Inclure tous les projets
selectAllBtn.addEventListener('click', () => {
	for (const proj of projectList) {
		settings.projects[proj.path] = settings.projects[proj.path] || {};
		settings.projects[proj.path].include = true;
	}
	saveSettings();
	renderProjects();
});

// Exclure tous les projets
clearSelectionBtn.addEventListener('click', () => {
	for (const proj of projectList) {
		settings.projects[proj.path] = settings.projects[proj.path] || {};
		settings.projects[proj.path].include = false;
	}
	saveSettings();
	renderProjects();
});

loadSettings();


