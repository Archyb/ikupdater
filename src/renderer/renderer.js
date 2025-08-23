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
let settings = { baseDir: '', projects: {}, theme: 'system' };

// --- THEME ---------------------------------------------------------------

let systemDarkQuery;
function initSystemMatcher() {
  if (!systemDarkQuery) {
    systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemDarkQuery.addEventListener?.('change', () => {
      if ((settings.theme || 'system') === 'system') applyTheme('system');
    });
  }
}

function isSystemDark() {
  initSystemMatcher();
  return !!systemDarkQuery.matches;
}

function applyTheme(theme) {
  const root = document.documentElement;
  const mode = theme === 'system' ? (isSystemDark() ? 'dark' : 'light') : theme;

  // On pose uniquement la classe "dark" (Tailwind dark mode = 'class')
  if (mode === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');

  // On garde en mémoire
  settings.theme = theme;
}

if (themePicker) {
  themePicker.addEventListener('change', () => {
    applyTheme(themePicker.value);
    saveSettings();
  });
}

// --- UTILS ---------------------------------------------------------------

function cssEscape(id) {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Initialise des valeurs par défaut pour chaque projet
function ensureProjectSettings() {
	for (const proj of projectList) {
		if (!settings.projects[proj.path]) {
			settings.projects[proj.path] = { include: true, branch: 'develop', gitStrategy: 'pull' };
		}
	}
}

function capabilityFromTechs(techs = []) {
  const hasPhp  = techs.includes('php');
  const hasNode = techs.some(t => t === 'node' || t === 'ts' || t === 'js');
  // on part du principe que Git est toujours dispo (repo), sinon ajuste ici
  const hasGit  = true;
  return { hasPhp, hasNode, hasGit };
}

// Calcule les capacités sur la sélection (pour bulk)
function aggregatedCapabilities() {
  let anyIncluded = false;
  let anyGit = false, anyPhp = false, anyNode = false;
  for (const proj of projectList) {
    const cfg = settings.projects[proj.path] || {};
    if (!cfg.include) continue;
    anyIncluded = true;
    const caps = capabilityFromTechs(proj.techs);
    anyGit  = anyGit  || caps.hasGit;
    anyPhp  = anyPhp  || caps.hasPhp;
    anyNode = anyNode || caps.hasNode;
  }
  return { anyIncluded, anyGit, anyPhp, anyNode };
}

// --- RENDER --------------------------------------------------------------

function renderProjects() {
  projectsEl.innerHTML = '';
  for (const proj of projectList) {
    const card = document.createElement('div');
    card.className = 'card';

    const projCfg = settings.projects[proj.path] || { include: true, branch: 'develop' };
    const caps = capabilityFromTechs(proj.techs);

    const idSafe = cssEscape(proj.path);

    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="title">${proj.name}</div>
          <div class="subtitle">${proj.techs.join(', ')}</div>
          <div class="path">${proj.path}</div>
        </div>
        <div class="actions">
          <label class="inc"><input type="checkbox" class="include" ${projCfg.include ? 'checked' : ''}/> Include</label>
          <select class="branch" title="Branch"><option>${projCfg.branch || 'develop'}</option></select>
          <select class="git-strategy" title="Git Strategy">
            <option value="pull" ${projCfg.gitStrategy === 'rebase' ? '' : 'selected'}>Pull</option>
            <option value="rebase" ${projCfg.gitStrategy === 'rebase' ? 'selected' : ''}>Rebase</option>
          </select>
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
          const gitStrategy = (settings.projects[proj.path] && settings.projects[proj.path].gitStrategy) || 'pull';
          await window.api.executeAction({ projectPath: proj.path, action: btn.dataset.action, branch, gitStrategy });
        } finally {
          btn.disabled = false;
        }
      });
    });

    // Include
    const includeEl = card.querySelector('.include');
    includeEl.addEventListener('change', () => {
      settings.projects[proj.path] = settings.projects[proj.path] || {};
      settings.projects[proj.path].include = includeEl.checked;
      saveSettings();
      updateBulkUI();
    });

    // Branch select
    const branchEl = card.querySelector('.branch');
    populateBranches(proj.path, branchEl);
    branchEl.addEventListener('change', () => {
      settings.projects[proj.path] = settings.projects[proj.path] || {};
      settings.projects[proj.path].branch = branchEl.value || 'develop';
      saveSettings();
    });

    const gitStrategyEl = card.querySelector('.git-strategy');
    gitStrategyEl.addEventListener('change', () => {
      settings.projects[proj.path] = settings.projects[proj.path] || {};
      settings.projects[proj.path].gitStrategy = gitStrategyEl.value;
      saveSettings();
    });
  }

  // Met à jour l’état des contrôles globaux après rendu
  updateBulkUI();
}

// --- BULK UI -------------------------------------------------------------

function updateBulkUI() {
  const { anyIncluded, anyGit, anyPhp, anyNode } = aggregatedCapabilities();

  // Cases à cocher bulk: disabled si aucune cible possible
  bulkGitEl.disabled  = !anyIncluded || !anyGit;
  bulkPhpEl.disabled  = !anyIncluded || !anyPhp;
  bulkNodeEl.disabled = !anyIncluded || !anyNode;

  // Si une case cochée est devenue impossible -> décoche
  if (bulkGitEl.checked && bulkGitEl.disabled)   bulkGitEl.checked = false;
  if (bulkPhpEl.checked && bulkPhpEl.disabled)   bulkPhpEl.checked = false;
  if (bulkNodeEl.checked && bulkNodeEl.disabled) bulkNodeEl.checked = false;

  updateRunSelectedState();
}

function updateRunSelectedState() {
  const { anyIncluded, anyGit, anyPhp, anyNode } = aggregatedCapabilities();

  // Le bouton "Run on selected" n’a de sens que s’il y a au moins une action
  // cochée et qu’au moins un projet inclus peut la supporter.
  const willDoSomething =
    anyIncluded && (
      (bulkGitEl.checked  && anyGit) ||
      (bulkPhpEl.checked  && anyPhp) ||
      (bulkNodeEl.checked && anyNode)
    );

  runSelectedBtn.disabled = !willDoSomething;
}

// --- API EVENTS ----------------------------------------------------------

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

// --- SETTINGS PERSISTENCE ------------------------------------------------

async function loadSettings() {
  const cfg = await window.api.getConfig();
  settings = cfg || settings;

  // Thème
  const theme = settings.theme || 'system';
  applyTheme(theme);
  if (themePicker) themePicker.value = theme;

  // Base dir + projets
  if (settings.baseDir) {
    baseDirEl.textContent = settings.baseDir;
    projectList = await window.api.scanProjects(settings.baseDir);
    ensureProjectSettings();
    renderProjects();
  } else {
    updateBulkUI();
  }
}

function saveSettings() {
  window.api.saveConfig(settings);
}

// --- BRANCHES ------------------------------------------------------------

async function populateBranches(projectPath, selectEl) {
  selectEl.disabled = true;
  try {
    const { branches = [], current } = await window.api.getBranches(projectPath);
    const existing = new Set();
    selectEl.innerHTML = '';
    const opt = (name) => {
      if (!name || existing.has(name)) return;
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
    // fallback: on garde la valeur existante
  } finally {
    selectEl.disabled = false;
  }
}

// --- BULK ACTIONS --------------------------------------------------------

// Exécute les actions groupées sur les projets inclus
runSelectedBtn.addEventListener('click', async () => {
	const doGit = bulkGitEl.checked;
	const doPhp = bulkPhpEl.checked;
	const doNode = bulkNodeEl.checked;
	for (const proj of projectList) {
		const cfg = settings.projects[proj.path] || { include: true, branch: 'develop', gitStrategy: 'pull' };
		if (!cfg.include) continue;
		if (doGit) await window.api.executeAction({ projectPath: proj.path, action: 'git', branch: cfg.branch, gitStrategy: cfg.gitStrategy });
		if (doPhp && proj.techs.includes('php')) await window.api.executeAction({ projectPath: proj.path, action: 'php', branch: cfg.branch, gitStrategy: cfg.gitStrategy });
		if (doNode && proj.techs.some(t => t === 'node' || t === 'ts')) await window.api.executeAction({ projectPath: proj.path, action: 'node', branch: cfg.branch, gitStrategy: cfg.gitStrategy });
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

// --- BOOT ----------------------------------------------------------------
loadSettings();
