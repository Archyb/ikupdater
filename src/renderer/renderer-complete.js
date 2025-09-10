// Version complète du renderer pour le navigateur
// Toute la logique de l'interface utilisateur

// Vérification que l'API est disponible
if (typeof window.api === 'undefined') {
  console.error('Electron API not available');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Electron API not available. Please run this app in Electron.</div>';
} else {
  console.log('Electron API available, initializing app...');
  
  // État de l'application
  let projectList = [];
  let settings = { baseDir: '', projects: {}, theme: 'system' };
  
  // Éléments DOM
  let chooseBtn, baseDirEl, projectsEl, bulkGitEl, bulkPhpEl, bulkNodeEl;
  let runSelectedBtn, selectAllBtn, clearSelectionBtn, themePicker;
  let toggleConsoleBtn, clearConsoleBtn, scrollToBottomBtn, stopProcessBtn;
  let phpVersionEl, nodeVersionEl, globalLogEl;
  
  // Initialisation
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting app initialization...');
    
    initializeElements();
    setupEventListeners();
    loadSettings();
  });
  
  function initializeElements() {
    chooseBtn = document.getElementById('chooseFolder');
    baseDirEl = document.getElementById('baseDir');
    projectsEl = document.getElementById('projects');
    bulkGitEl = document.getElementById('bulkGit');
    bulkPhpEl = document.getElementById('bulkPhp');
    bulkNodeEl = document.getElementById('bulkNode');
    runSelectedBtn = document.getElementById('runSelected');
    selectAllBtn = document.getElementById('selectAll');
    clearSelectionBtn = document.getElementById('clearSelection');
    themePicker = document.getElementById('themePicker');
    toggleConsoleBtn = document.getElementById('toggleConsole');
    clearConsoleBtn = document.getElementById('clearConsole');
    scrollToBottomBtn = document.getElementById('scrollToBottom');
    stopProcessBtn = document.getElementById('stopProcess');
    phpVersionEl = document.getElementById('php-version');
    nodeVersionEl = document.getElementById('node-version');
    globalLogEl = document.getElementById('globalLog');
    
    console.log('Elements initialized:', {
      chooseBtn: !!chooseBtn,
      baseDirEl: !!baseDirEl,
      projectsEl: !!projectsEl
    });
  }
  
  function setupEventListeners() {
    // Sélection de dossier
    if (chooseBtn) {
      chooseBtn.addEventListener('click', handleChooseFolder);
      console.log('Choose folder event listener set');
    }
    
    // Thème
    if (themePicker) {
      themePicker.addEventListener('change', () => {
        const theme = themePicker.value;
        applyTheme(theme);
        settings.theme = theme;
        saveSettings();
      });
    }
    
    // Actions en lot
    if (runSelectedBtn) runSelectedBtn.addEventListener('click', handleRunSelected);
    if (selectAllBtn) selectAllBtn.addEventListener('click', handleSelectAll);
    if (clearSelectionBtn) clearSelectionBtn.addEventListener('click', handleClearSelection);
    
    // Contrôles de la console
    if (toggleConsoleBtn) toggleConsoleBtn.addEventListener('click', handleToggleConsole);
    if (clearConsoleBtn) clearConsoleBtn.addEventListener('click', handleClearConsole);
    if (scrollToBottomBtn) scrollToBottomBtn.addEventListener('click', handleScrollToBottom);
    
    // Checkboxes en lot
    if (bulkGitEl) bulkGitEl.addEventListener('change', updateRunSelectedState);
    if (bulkPhpEl) bulkPhpEl.addEventListener('change', updateRunSelectedState);
    if (bulkNodeEl) bulkNodeEl.addEventListener('change', updateRunSelectedState);
    
    // Logs
    window.api.onLog((data) => {
      addLog(data);
    });
    
    console.log('Event listeners set up');
  }
  
  async function handleChooseFolder() {
    console.log('Choose folder button clicked');
    try {
      const dir = await window.api.selectFolder();
      console.log('Selected directory:', dir);
      if (dir) {
        baseDirEl.textContent = dir;
        settings.baseDir = dir;
        saveSettings();
        
        const projects = await window.api.scanProjects(dir);
        console.log('Scanned projects:', projects);
        projectList = projects;
        ensureProjectSettings();
        renderProjects();
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
    }
  }
  
  function ensureProjectSettings() {
    for (const proj of projectList) {
      if (!settings.projects[proj.path]) {
        settings.projects[proj.path] = { 
          include: true, 
          branch: 'develop', 
          gitStrategy: 'pull' 
        };
      }
    }
  }
  
  function renderProjects() {
    if (!projectsEl) return;
    
    projectsEl.innerHTML = '';
    for (const proj of projectList) {
      const card = createProjectCard(proj);
      projectsEl.appendChild(card);
    }
    
    updateBulkUI();
  }
  
  function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'card';
    
    const config = settings.projects[project.path] || { 
      include: true, 
      branch: 'develop', 
      gitStrategy: 'pull' 
    };
    
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="title">${project.name}</div>
          <div class="subtitle">${project.techs.join(', ')}</div>
          <div class="path">${project.path}</div>
        </div>
      </div>
      <div class="card-actions">
        <label class="inc"><input type="checkbox" class="include" ${config.include ? 'checked' : ''}/> Include</label>
        <select class="branch" title="Branch"><option>${config.branch || 'develop'}</option></select>
        <select class="git-strategy" title="Git Strategy">
          <option value="pull" ${config.gitStrategy === 'rebase' ? '' : 'selected'}>Pull</option>
          <option value="rebase" ${config.gitStrategy === 'rebase' ? 'selected' : ''}>Rebase</option>
        </select>
        <button data-action="git" title="Update Git repository (fetch, checkout, pull/rebase)">Git</button>
        <button data-action="php" ${project.techs.includes('php') ? '' : 'disabled'} title="Install PHP dependencies with Composer">PHP</button>
        <button data-action="node" ${project.techs.some(t => t === 'node' || t === 'ts') ? '' : 'disabled'} title="Install Node.js dependencies with npm/yarn">Node</button>
        <button data-action="sync" title="Execute Git → PHP → Node operations in sequence">Sync</button>
      </div>
    `;
    
    setupProjectCardEvents(card, project, config);
    return card;
  }
  
  function setupProjectCardEvents(card, project, config) {
    // Actions: git / php / node / sync
    const buttons = card.querySelectorAll('.card-actions button[data-action]');
    buttons.forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const branch = config.branch || 'develop';
          const gitStrategy = config.gitStrategy || 'pull';
          await executeAction(project.path, btn.dataset.action, branch, gitStrategy);
        } finally {
          btn.disabled = false;
        }
      });
    });
    
    // Include
    const includeEl = card.querySelector('.include');
    includeEl.addEventListener('change', () => {
      settings.projects[project.path] = settings.projects[project.path] || {};
      settings.projects[project.path].include = includeEl.checked;
      saveSettings();
      updateBulkUI();
    });
    
    // Branch select
    const branchEl = card.querySelector('.branch');
    populateBranches(project.path, branchEl);
    branchEl.addEventListener('change', () => {
      settings.projects[project.path] = settings.projects[project.path] || {};
      settings.projects[project.path].branch = branchEl.value || 'develop';
      saveSettings();
    });
    
    // Git strategy
    const gitStrategyEl = card.querySelector('.git-strategy');
    gitStrategyEl.addEventListener('change', () => {
      settings.projects[project.path] = settings.projects[project.path] || {};
      settings.projects[project.path].gitStrategy = gitStrategyEl.value;
      saveSettings();
    });
  }
  
  async function populateBranches(projectPath, selectEl) {
    selectEl.disabled = true;
    try {
      const response = await window.api.getBranches(projectPath);
      const { branches = [], current } = response;
      const existing = new Set();
      selectEl.innerHTML = '';
      
      const addOption = (name) => {
        if (!name || existing.has(name)) return;
        existing.add(name);
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        selectEl.appendChild(option);
      };
      
      const config = settings.projects[projectPath] || { branch: 'develop' };
      if (current) addOption(current);
      for (const branch of branches) addOption(branch);
      if (config.branch) addOption(config.branch);
      
      selectEl.value = config.branch || current || 'develop';
    } catch (error) {
      console.error('Error populating branches:', error);
    } finally {
      selectEl.disabled = false;
    }
  }
  
  async function executeAction(projectPath, action, branch, gitStrategy) {
    try {
      console.log('Executing action:', { projectPath, action, branch, gitStrategy });
      const result = await window.api.executeAction({ 
        projectPath, 
        action, 
        branch, 
        gitStrategy 
      });
      console.log('Action result:', result);
      updateVersionsAfterAction();
    } catch (error) {
      console.error(`Error executing ${action} action:`, error);
    }
  }
  
  function updateBulkUI() {
    const capabilities = getAggregatedCapabilities();
    
    // Cases à cocher bulk: disabled si aucune cible possible
    if (bulkGitEl) bulkGitEl.disabled = !capabilities.anyIncluded || !capabilities.anyGit;
    if (bulkPhpEl) bulkPhpEl.disabled = !capabilities.anyIncluded || !capabilities.anyPhp;
    if (bulkNodeEl) bulkNodeEl.disabled = !capabilities.anyIncluded || !capabilities.anyNode;
    
    // Si une case cochée est devenue impossible -> décoche
    if (bulkGitEl?.checked && bulkGitEl.disabled) bulkGitEl.checked = false;
    if (bulkPhpEl?.checked && bulkPhpEl.disabled) bulkPhpEl.checked = false;
    if (bulkNodeEl?.checked && bulkNodeEl.disabled) bulkNodeEl.checked = false;
    
    updateRunSelectedState();
  }
  
  function getAggregatedCapabilities() {
    let anyIncluded = false;
    let anyGit = false, anyPhp = false, anyNode = false;
    
    for (const proj of projectList) {
      const cfg = settings.projects[proj.path] || {};
      if (!cfg.include) continue;
      anyIncluded = true;
      
      const hasPhp = proj.techs.includes('php');
      const hasNode = proj.techs.some(t => t === 'node' || t === 'ts' || t === 'js');
      const hasGit = true;
      
      anyGit = anyGit || hasGit;
      anyPhp = anyPhp || hasPhp;
      anyNode = anyNode || hasNode;
    }
    
    return { anyIncluded, anyGit, anyPhp, anyNode };
  }
  
  function updateRunSelectedState() {
    const capabilities = getAggregatedCapabilities();
    
    const willDoSomething = capabilities.anyIncluded && (
      (bulkGitEl?.checked && capabilities.anyGit) ||
      (bulkPhpEl?.checked && capabilities.anyPhp) ||
      (bulkNodeEl?.checked && capabilities.anyNode)
    );
    
    if (runSelectedBtn) {
      runSelectedBtn.disabled = !willDoSomething;
    }
  }
  
  async function handleRunSelected() {
    if (!bulkGitEl || !bulkPhpEl || !bulkNodeEl || !stopProcessBtn) {
      console.error('Required elements not found');
      return;
    }
    
    const doGit = bulkGitEl.checked;
    const doPhp = bulkPhpEl.checked;
    const doNode = bulkNodeEl.checked;
    
    const selectedProjects = projectList.filter(proj => {
      const cfg = settings.projects[proj.path] || { include: true, branch: 'develop', gitStrategy: 'pull' };
      return cfg.include;
    });
    
    if (selectedProjects.length === 0) {
      alert('Please select at least one project');
      return;
    }
    
    console.log('Running bulk actions on', selectedProjects.length, 'projects');
    
    // Affiche le bouton stop et désactive le bouton run
    runSelectedBtn.style.display = 'none';
    stopProcessBtn.style.display = 'inline-block';
    
    // Variable pour contrôler l'arrêt du processus
    let shouldStop = false;
    
    // Crée un listener unique pour ce processus
    const stopListener = () => {
      shouldStop = true;
      console.log('Process stop requested');
    };
    
    // Ajoute l'écouteur d'événement
    stopProcessBtn.addEventListener('click', stopListener);
    
    try {
      for (const proj of selectedProjects) {
        // Vérifie si l'arrêt a été demandé
        if (shouldStop) {
          console.log('Process stopped by user');
          break;
        }
        
        const cfg = settings.projects[proj.path] || { include: true, branch: 'develop', gitStrategy: 'pull' };
        
        // Exécute les actions selon les checkboxes
        if (doGit) {
          if (shouldStop) break;
          await executeAction(proj.path, 'git', cfg.branch, cfg.gitStrategy);
        }
        if (doPhp && proj.techs.includes('php')) {
          if (shouldStop) break;
          await executeAction(proj.path, 'php', cfg.branch, cfg.gitStrategy);
        }
        if (doNode && proj.techs.some(t => t === 'node' || t === 'ts')) {
          if (shouldStop) break;
          await executeAction(proj.path, 'node', cfg.branch, cfg.gitStrategy);
        }
        
        // Désélectionne le projet après l'action
        settings.projects[proj.path] = settings.projects[proj.path] || {};
        settings.projects[proj.path].include = false;
        
        // Met à jour les versions après les actions
        updateVersionsAfterAction();
      }
    } finally {
      // Restaure l'interface
      runSelectedBtn.style.display = 'inline-block';
      stopProcessBtn.style.display = 'none';
      
      // Retire l'écouteur d'événement
      stopProcessBtn.removeEventListener('click', stopListener);
      
      // Sauvegarde les paramètres et re-rend
      saveSettings();
      renderProjects();
      
      if (shouldStop) {
        console.log('Process stopped - projects deselected');
      } else {
        console.log('All projects completed and deselected');
      }
    }
  }
  
  function handleSelectAll() {
    for (const proj of projectList) {
      settings.projects[proj.path] = settings.projects[proj.path] || {};
      settings.projects[proj.path].include = true;
    }
    saveSettings();
    renderProjects();
  }
  
  function handleClearSelection() {
    for (const proj of projectList) {
      settings.projects[proj.path] = settings.projects[proj.path] || {};
      settings.projects[proj.path].include = false;
    }
    saveSettings();
    renderProjects();
  }
  
  function handleToggleConsole() {
    const consoleEl = document.querySelector('.console');
    if (consoleEl) {
      consoleEl.classList.toggle('hidden');
      const isHidden = consoleEl.classList.contains('hidden');
      
      // Met à jour le padding principal
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.className = mainEl.className.replace(/pb-\d+/g, '');
        if (!isHidden) {
          mainEl.className += ' pb-96';
        }
      }
      
      // Met à jour l'icône dans l'en-tête
      const icon = toggleConsoleBtn?.querySelector('svg');
      if (icon) {
        if (isHidden) {
          icon.innerHTML = '<path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>'; // Icône Code
          toggleConsoleBtn.title = 'Show console';
        } else {
          icon.innerHTML = '<path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>'; // Icône Code (même pour l'instant)
          toggleConsoleBtn.title = 'Hide console';
        }
      }
      
      console.log('Console toggled:', isHidden ? 'hidden' : 'visible');
    }
  }
  
  function handleClearConsole() {
    if (globalLogEl) {
      globalLogEl.innerHTML = '';
      console.log('Console cleared');
    }
  }
  
  function handleScrollToBottom() {
    if (globalLogEl) {
      globalLogEl.scrollTop = globalLogEl.scrollHeight;
      console.log('Scrolled to bottom');
    }
  }
  
  function addLog(data) {
    if (!globalLogEl) {
      console.log('Global log element not found');
      return;
    }
    
    const prefix = data.projectPath ? `[${data.projectPath}] ` : '';
    
    // Crée une entrée de log colorée
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    // Ajoute un timestamp
    const timestamp = new Date().toLocaleTimeString();
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-timestamp';
    timeSpan.textContent = `[${timestamp}] `;
    logEntry.appendChild(timeSpan);
    
    // Ajoute un préfixe de projet si existe
    if (data.projectPath) {
      const projectSpan = document.createElement('span');
      projectSpan.className = 'log-project';
      projectSpan.textContent = `[${data.projectPath.split('/').pop()}] `;
      logEntry.appendChild(projectSpan);
    }
    
    // Ajoute le message avec codage couleur
    const messageSpan = document.createElement('span');
    messageSpan.className = 'log-message';
    
    // Code couleur basé sur le contenu
    if (data.message.includes('$ git') || data.message.includes('$ npm') || data.message.includes('$ composer')) {
      messageSpan.className += ' log-command';
    } else if (data.message.includes('error') || data.message.includes('Error') || data.message.includes('failed')) {
      messageSpan.className += ' log-error';
    } else if (data.message.includes('Warning') || data.message.includes('warning')) {
      messageSpan.className += ' log-warning';
    } else if (data.message.includes('DONE') || data.message.includes('success')) {
      messageSpan.className += ' log-success';
    } else if (data.message.includes('npm info') || data.message.includes('composer')) {
      messageSpan.className += ' log-info';
    }
    
    messageSpan.textContent = data.message;
    logEntry.appendChild(messageSpan);
    
    globalLogEl.appendChild(logEntry);
    
    // Force le scroll vers le bas avec un petit délai pour s'assurer de la mise à jour du DOM
    setTimeout(() => {
      globalLogEl.scrollTop = globalLogEl.scrollHeight;
    }, 10);
    
    console.log('Added to global log:', prefix + data.message);
  }
  
  async function loadSettings() {
    const cfg = await window.api.getConfig();
    settings = cfg || settings;
    
    // Thème
    const theme = settings.theme || 'system';
    applyTheme(theme);
    if (themePicker) {
      themePicker.value = theme;
    }
    
    // Base dir + projets
    if (settings.baseDir) {
      baseDirEl.textContent = settings.baseDir;
      const projects = await window.api.scanProjects(settings.baseDir);
      projectList = projects;
      ensureProjectSettings();
      renderProjects();
    } else {
      updateBulkUI();
    }
    
    // Initialise les versions
    updateVersions();
  }
  
  function saveSettings() {
    // Met à jour les paramètres des projets
    for (const project of projectList) {
      const config = settings.projects[project.path] || { include: true, branch: 'develop', gitStrategy: 'pull' };
      settings.projects[project.path] = config;
    }
    
    window.api.saveConfig(settings);
  }
  
  function applyTheme(theme) {
    const root = document.documentElement;
    const mode = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
    
    // Applique la classe "dark" (Tailwind dark mode = 'class')
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
  
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
  
  async function updateVersions() {
    const phpVer = await getPhpVersion();
    const nodeVer = await getNodeVersion();
    
    if (phpVersionEl) phpVersionEl.textContent = phpVer;
    if (nodeVersionEl) nodeVersionEl.textContent = nodeVer;
  }
  
  function updateVersionsAfterAction() {
    // Attend un peu pour que les changements de version prennent effet
    setTimeout(updateVersions, 1000);
  }
  
  console.log('Renderer script loaded successfully');
}
