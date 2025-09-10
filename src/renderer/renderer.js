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
const toggleConsoleBtn = document.getElementById('toggleConsole');
const clearConsoleBtn = document.getElementById('clearConsole');
const scrollToBottomBtn = document.getElementById('scrollToBottom');
const stopProcessBtn = document.getElementById('stopProcess');

// Version display elements
const phpVersionEl = document.getElementById('php-version');
const nodeVersionEl = document.getElementById('node-version');

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
      </div>
      <div class="card-actions">
        <label class="inc"><input type="checkbox" class="include" ${projCfg.include ? 'checked' : ''}/> Include</label>
        <select class="branch" title="Branch"><option>${projCfg.branch || 'develop'}</option></select>
        <select class="git-strategy" title="Git Strategy">
          <option value="pull" ${projCfg.gitStrategy === 'rebase' ? '' : 'selected'}>Pull</option>
          <option value="rebase" ${projCfg.gitStrategy === 'rebase' ? 'selected' : ''}>Rebase</option>
        </select>
        <button data-action="git" title="Update Git repository (fetch, checkout, pull/rebase)">Git</button>
        <button data-action="php" ${proj.techs.includes('php') ? '' : 'disabled'} title="Install PHP dependencies with Composer">PHP</button>
        <button data-action="node" ${proj.techs.some(t => t === 'node' || t === 'ts') ? '' : 'disabled'} title="Install Node.js dependencies with npm/yarn">Node</button>
        <button data-action="sync" title="Execute Git → PHP → Node operations in sequence">Sync</button>
      </div>
    `;

    projectsEl.appendChild(card);

    // Actions: git / php / node / sync
    const buttons = card.querySelectorAll('.card-actions button[data-action]');
    buttons.forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const branch = (settings.projects[proj.path] && settings.projects[proj.path].branch) || 'develop';
          const gitStrategy = (settings.projects[proj.path] && settings.projects[proj.path].gitStrategy) || 'pull';
          // Exécute l'action demandée
          try {
            console.log('Executing action:', { projectPath: proj.path, action: btn.dataset.action, branch, gitStrategy });
            const result = await window.api.executeAction({ projectPath: proj.path, action: btn.dataset.action, branch, gitStrategy });
            console.log('Action result:', result);
            // Update versions after action that might change them
            updateVersionsAfterAction();
          } catch (error) {
            console.error(`Error executing ${btn.dataset.action} action:`, error);
          }
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
  console.log('Log received:', { projectPath, message });
  if (globalLogEl) {
    const prefix = projectPath ? `[${projectPath}] ` : '';
    
    // Create colored log entry
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    // Add timestamp
    const timestamp = new Date().toLocaleTimeString();
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-timestamp';
    timeSpan.textContent = `[${timestamp}] `;
    logEntry.appendChild(timeSpan);
    
    // Add project prefix if exists
    if (projectPath) {
      const projectSpan = document.createElement('span');
      projectSpan.className = 'log-project';
      projectSpan.textContent = `[${projectPath.split('/').pop()}] `;
      logEntry.appendChild(projectSpan);
    }
    
    // Add message with color coding
    const messageSpan = document.createElement('span');
    messageSpan.className = 'log-message';
    
    // Color code based on content
    if (message.includes('$ git') || message.includes('$ npm') || message.includes('$ composer')) {
      messageSpan.className += ' log-command';
    } else if (message.includes('error') || message.includes('Error') || message.includes('failed')) {
      messageSpan.className += ' log-error';
    } else if (message.includes('Warning') || message.includes('warning')) {
      messageSpan.className += ' log-warning';
    } else if (message.includes('DONE') || message.includes('success')) {
      messageSpan.className += ' log-success';
    } else if (message.includes('npm info') || message.includes('composer')) {
      messageSpan.className += ' log-info';
    }
    
    messageSpan.textContent = message;
    logEntry.appendChild(messageSpan);
    
    globalLogEl.appendChild(logEntry);
    
    // Force scroll to bottom with a small delay to ensure DOM update
    setTimeout(() => {
      globalLogEl.scrollTop = globalLogEl.scrollHeight;
    }, 10);
    
    console.log('Added to global log:', prefix + message);
  } else {
    console.log('Global log element not found');
  }
});

// --- SETTINGS PERSISTENCE ------------------------------------------------

async function loadSettings() {
  const cfg = await window.api.getConfig();
  settings = cfg || settings;

  // Thème
  const theme = settings.theme || 'system';
  applyTheme(theme);

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
	// Vérifier que les éléments existent
	if (!bulkGitEl || !bulkPhpEl || !bulkNodeEl || !stopProcessBtn) {
		console.error('Required elements not found');
		return;
	}
	
	const doGit = bulkGitEl.checked;
	const doPhp = bulkPhpEl.checked;
	const doNode = bulkNodeEl.checked;
	
	// Collecter les projets sélectionnés
	const selectedProjects = projectList.filter(proj => {
		const cfg = settings.projects[proj.path] || { include: true, branch: 'develop', gitStrategy: 'pull' };
		return cfg.include;
	});
	
	if (selectedProjects.length === 0) {
		alert('Please select at least one project');
		return;
	}
	
	console.log('Running bulk actions on', selectedProjects.length, 'projects');
	
	// Afficher le bouton stop et désactiver le bouton run
	runSelectedBtn.style.display = 'none';
	stopProcessBtn.style.display = 'inline-block';
	
	// Variable pour contrôler l'arrêt du processus
	let shouldStop = false;
	
	// Créer un listener unique pour ce processus
	const stopListener = () => {
		shouldStop = true;
		console.log('Process stop requested');
	};
	
	// Ajouter l'écouteur d'événement
	stopProcessBtn.addEventListener('click', stopListener);
	
	try {
		for (const proj of selectedProjects) {
			// Vérifier si l'arrêt a été demandé
			if (shouldStop) {
				console.log('Process stopped by user');
				break;
			}
			
			const cfg = settings.projects[proj.path] || { include: true, branch: 'develop', gitStrategy: 'pull' };
			
			// Exécuter les actions selon les checkboxes
			if (doGit) {
				if (shouldStop) break;
				await window.api.executeAction({ projectPath: proj.path, action: 'git', branch: cfg.branch, gitStrategy: cfg.gitStrategy });
			}
			if (doPhp && proj.techs.includes('php')) {
				if (shouldStop) break;
				await window.api.executeAction({ projectPath: proj.path, action: 'php', branch: cfg.branch, gitStrategy: cfg.gitStrategy });
			}
			if (doNode && proj.techs.some(t => t === 'node' || t === 'ts')) {
				if (shouldStop) break;
				await window.api.executeAction({ projectPath: proj.path, action: 'node', branch: cfg.branch, gitStrategy: cfg.gitStrategy });
			}
			
			// Désélectionner le projet après l'action (même si arrêté)
			settings.projects[proj.path] = settings.projects[proj.path] || {};
			settings.projects[proj.path].include = false;
			
			// Update versions after actions that might change them
			updateVersionsAfterAction();
		}
	} finally {
		// Restaurer l'interface
		runSelectedBtn.style.display = 'inline-block';
		stopProcessBtn.style.display = 'none';
		
		// Retirer l'écouteur d'événement
		stopProcessBtn.removeEventListener('click', stopListener);
		
		// Sauvegarder les paramètres et re-rendre
		saveSettings();
		renderProjects();
		
		if (shouldStop) {
			console.log('Process stopped - projects deselected');
		} else {
			console.log('All projects completed and deselected');
		}
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

// Console controls
if (toggleConsoleBtn) {
  toggleConsoleBtn.addEventListener('click', () => {
    const consoleEl = document.querySelector('.console');
    if (consoleEl) {
      consoleEl.classList.toggle('hidden');
      const isHidden = consoleEl.classList.contains('hidden');
      
      // Update main padding
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.className = mainEl.className.replace(/pb-\d+/g, '');
        if (!isHidden) {
          mainEl.className += ' pb-96';
        }
      }
      
      // Update icon in header
      const icon = toggleConsoleBtn.querySelector('svg');
      if (icon) {
        if (isHidden) {
          icon.innerHTML = '<path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>'; // Code icon
          toggleConsoleBtn.title = 'Show console';
        } else {
          icon.innerHTML = '<path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>'; // Code icon (same for now)
          toggleConsoleBtn.title = 'Hide console';
        }
      }
      
      console.log('Console toggled:', isHidden ? 'hidden' : 'visible');
    }
  });
}

if (clearConsoleBtn) {
  clearConsoleBtn.addEventListener('click', () => {
    if (globalLogEl) {
      globalLogEl.innerHTML = '';
      console.log('Console cleared');
    }
  });
}

if (scrollToBottomBtn) {
  scrollToBottomBtn.addEventListener('click', () => {
    if (globalLogEl) {
      globalLogEl.scrollTop = globalLogEl.scrollHeight;
      console.log('Scrolled to bottom');
    }
  });
}

// --- BOOT ----------------------------------------------------------------
loadSettings();



// Get current PHP version
async function getPhpVersion() {
	try {
		const response = await window.api.getPhpVersion();
		if (response.ok) {
			return response.version;
		}
		return '--';
	} catch (e) {
		return '--';
	}
}

// Get current Node version
async function getNodeVersion() {
	try {
		const response = await window.api.getNodeVersion();
		if (response.ok) {
			return response.version;
		}
		return '--';
	} catch (e) {
		return '--';
	}
}

// Update version displays
async function updateVersions() {
	const phpVer = await getPhpVersion();
	const nodeVer = await getNodeVersion();
	
	if (phpVersionEl) phpVersionEl.textContent = phpVer;
	if (nodeVersionEl) nodeVersionEl.textContent = nodeVer;
}

// Update versions after actions that might change versions
async function updateVersionsAfterAction() {
	// Wait a bit for version changes to take effect
	setTimeout(updateVersions, 1000);
}

// Initialize versions on load
updateVersions();
