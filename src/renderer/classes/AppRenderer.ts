import { Project, AppConfig, BranchesResponse } from '../../types';
import { ThemeManager } from './ThemeManager';
import { ProjectManager } from './ProjectManager';
import { LogManager } from './LogManager';
import { VersionManager } from './VersionManager';

/**
 * Application principale du processus de rendu
 */
export class AppRenderer {
  private themeManager: ThemeManager;
  private projectManager: ProjectManager;
  private logManager: LogManager;
  private versionManager: VersionManager;
  private settings: AppConfig = { baseDir: '', projects: {}, theme: 'system' };

  // Éléments DOM
  private chooseBtn: HTMLButtonElement | null = null;
  private baseDirEl: HTMLElement | null = null;
  private projectsEl: HTMLElement | null = null;
  private bulkGitEl: HTMLInputElement | null = null;
  private bulkPhpEl: HTMLInputElement | null = null;
  private bulkNodeEl: HTMLInputElement | null = null;
  private runSelectedBtn: HTMLButtonElement | null = null;
  private selectAllBtn: HTMLButtonElement | null = null;
  private clearSelectionBtn: HTMLButtonElement | null = null;
  private themePicker: HTMLSelectElement | null = null;
  private toggleConsoleBtn: HTMLButtonElement | null = null;
  private clearConsoleBtn: HTMLButtonElement | null = null;
  private scrollToBottomBtn: HTMLButtonElement | null = null;
  private stopProcessBtn: HTMLButtonElement | null = null;

  constructor() {
    this.themeManager = new ThemeManager();
    this.projectManager = new ProjectManager();
    this.logManager = new LogManager('globalLog');
    this.versionManager = new VersionManager('php-version', 'node-version');
  }

  /**
   * Initialise l'application
   */
  public async initialize(): Promise<void> {
    this.initializeElements();
    this.setupEventListeners();
    await this.loadSettings();
  }

  /**
   * Initialise les références aux éléments DOM
   */
  private initializeElements(): void {
    this.chooseBtn = document.getElementById('chooseFolder') as HTMLButtonElement;
    this.baseDirEl = document.getElementById('baseDir');
    this.projectsEl = document.getElementById('projects');
    this.bulkGitEl = document.getElementById('bulkGit') as HTMLInputElement;
    this.bulkPhpEl = document.getElementById('bulkPhp') as HTMLInputElement;
    this.bulkNodeEl = document.getElementById('bulkNode') as HTMLInputElement;
    this.runSelectedBtn = document.getElementById('runSelected') as HTMLButtonElement;
    this.selectAllBtn = document.getElementById('selectAll') as HTMLButtonElement;
    this.clearSelectionBtn = document.getElementById('clearSelection') as HTMLButtonElement;
    this.themePicker = document.getElementById('themePicker') as HTMLSelectElement;
    this.toggleConsoleBtn = document.getElementById('toggleConsole') as HTMLButtonElement;
    this.clearConsoleBtn = document.getElementById('clearConsole') as HTMLButtonElement;
    this.scrollToBottomBtn = document.getElementById('scrollToBottom') as HTMLButtonElement;
    this.stopProcessBtn = document.getElementById('stopProcess') as HTMLButtonElement;
  }

  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Sélection de dossier
    this.chooseBtn?.addEventListener('click', () => this.handleChooseFolder());

    // Thème
    this.themePicker?.addEventListener('change', () => {
      const theme = this.themePicker?.value as any;
      this.themeManager.applyTheme(theme);
      this.settings.theme = theme;
      this.saveSettings();
    });

    // Actions en lot
    this.runSelectedBtn?.addEventListener('click', () => this.handleRunSelected());
    this.selectAllBtn?.addEventListener('click', () => this.handleSelectAll());
    this.clearSelectionBtn?.addEventListener('click', () => this.handleClearSelection());

    // Contrôles de la console
    this.toggleConsoleBtn?.addEventListener('click', () => this.handleToggleConsole());
    this.clearConsoleBtn?.addEventListener('click', () => this.handleClearConsole());
    this.scrollToBottomBtn?.addEventListener('click', () => this.handleScrollToBottom());

    // Checkboxes en lot
    this.bulkGitEl?.addEventListener('change', () => this.updateRunSelectedState());
    this.bulkPhpEl?.addEventListener('change', () => this.updateRunSelectedState());
    this.bulkNodeEl?.addEventListener('change', () => this.updateRunSelectedState());

    // Logs
    window.api.onLog((data) => {
      this.logManager.addLog(data);
    });
  }

  /**
   * Gère la sélection de dossier
   */
  private async handleChooseFolder(): Promise<void> {
    const dir = await window.api.selectFolder();
    if (!dir) return;

    this.baseDirEl!.textContent = dir;
    this.settings.baseDir = dir;
    this.saveSettings();

    const projects = await window.api.scanProjects(dir);
    this.projectManager.setProjects(projects);
    this.ensureProjectSettings();
    this.renderProjects();
  }

  /**
   * Gère l'exécution des actions sélectionnées
   */
  private async handleRunSelected(): Promise<void> {
    if (!this.bulkGitEl || !this.bulkPhpEl || !this.bulkNodeEl || !this.stopProcessBtn) {
      console.error('Required elements not found');
      return;
    }

    const doGit = this.bulkGitEl.checked;
    const doPhp = this.bulkPhpEl.checked;
    const doNode = this.bulkNodeEl.checked;

    const selectedProjects = this.projectManager.getIncludedProjects();

    if (selectedProjects.length === 0) {
      alert('Please select at least one project');
      return;
    }

    console.log('Running bulk actions on', selectedProjects.length, 'projects');

    // Affiche le bouton stop et désactive le bouton run
    this.runSelectedBtn!.style.display = 'none';
    this.stopProcessBtn.style.display = 'inline-block';

    // Variable pour contrôler l'arrêt du processus
    let shouldStop = false;

    // Crée un listener unique pour ce processus
    const stopListener = () => {
      shouldStop = true;
      console.log('Process stop requested');
    };

    // Ajoute l'écouteur d'événement
    this.stopProcessBtn.addEventListener('click', stopListener);

    try {
      for (const project of selectedProjects) {
        // Vérifie si l'arrêt a été demandé
        if (shouldStop) {
          console.log('Process stopped by user');
          break;
        }

        const config = this.projectManager.getProjectConfig(project.path);

        // Exécute les actions selon les checkboxes
        if (doGit) {
          if (shouldStop) break;
          await this.executeAction(project.path, 'git', config.branch, config.gitStrategy);
        }
        if (doPhp && project.techs.includes('php')) {
          if (shouldStop) break;
          await this.executeAction(project.path, 'php', config.branch, config.gitStrategy);
        }
        if (doNode && project.techs.some(t => t === 'node' || t === 'ts')) {
          if (shouldStop) break;
          await this.executeAction(project.path, 'node', config.branch, config.gitStrategy);
        }

        // Désélectionne le projet après l'action
        this.projectManager.setProjectConfig(project.path, { ...config, include: false });

        // Met à jour les versions après les actions
        this.versionManager.updateVersionsAfterAction();
      }
    } finally {
      // Restaure l'interface
      this.runSelectedBtn!.style.display = 'inline-block';
      this.stopProcessBtn.style.display = 'none';

      // Retire l'écouteur d'événement
      this.stopProcessBtn.removeEventListener('click', stopListener);

      // Sauvegarde les paramètres et re-rend
      this.saveSettings();
      this.renderProjects();

      if (shouldStop) {
        console.log('Process stopped - projects deselected');
      } else {
        console.log('All projects completed and deselected');
      }
    }
  }

  /**
   * Gère la sélection de tous les projets
   */
  private handleSelectAll(): void {
    this.projectManager.includeAllProjects();
    this.saveSettings();
    this.renderProjects();
  }

  /**
   * Gère la désélection de tous les projets
   */
  private handleClearSelection(): void {
    this.projectManager.excludeAllProjects();
    this.saveSettings();
    this.renderProjects();
  }

  /**
   * Gère le basculement de la console
   */
  private handleToggleConsole(): void {
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
      const icon = this.toggleConsoleBtn?.querySelector('svg');
      if (icon) {
        if (isHidden) {
          icon.innerHTML = '<path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>'; // Icône Code
          this.toggleConsoleBtn!.title = 'Show console';
        } else {
          icon.innerHTML = '<path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>'; // Icône Code (même pour l'instant)
          this.toggleConsoleBtn!.title = 'Hide console';
        }
      }

      console.log('Console toggled:', isHidden ? 'hidden' : 'visible');
    }
  }

  /**
   * Gère l'effacement de la console
   */
  private handleClearConsole(): void {
    this.logManager.clearLogs();
  }

  /**
   * Gère le scroll vers le bas
   */
  private handleScrollToBottom(): void {
    this.logManager.scrollToBottom();
  }

  /**
   * Exécute une action sur un projet
   */
  private async executeAction(
    projectPath: string, 
    action: string, 
    branch: string, 
    gitStrategy: string
  ): Promise<void> {
    try {
      console.log('Executing action:', { projectPath, action, branch, gitStrategy });
      const result = await window.api.executeAction({ 
        projectPath, 
        action: action as any, 
        branch, 
        gitStrategy: gitStrategy as any 
      });
      console.log('Action result:', result);
      this.versionManager.updateVersionsAfterAction();
    } catch (error) {
      console.error(`Error executing ${action} action:`, error);
    }
  }

  /**
   * S'assure que chaque projet a des paramètres par défaut
   */
  private ensureProjectSettings(): void {
    const projects = this.projectManager.getProjects();
    for (const project of projects) {
      if (!this.settings.projects[project.path]) {
        this.settings.projects[project.path] = { 
          include: true, 
          branch: 'develop', 
          gitStrategy: 'pull' 
        };
      }
    }
  }

  /**
   * Rend la liste des projets
   */
  private renderProjects(): void {
    if (!this.projectsEl) return;

    this.projectsEl.innerHTML = '';
    const projects = this.projectManager.getProjects();

    for (const project of projects) {
      const card = this.createProjectCard(project);
      this.projectsEl.appendChild(card);
    }

    this.updateBulkUI();
  }

  /**
   * Crée une carte de projet
   */
  private createProjectCard(project: Project): HTMLElement {
    const card = document.createElement('div');
    card.className = 'card';

    const config = this.projectManager.getProjectConfig(project.path);

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

    this.setupProjectCardEvents(card, project, config);
    return card;
  }

  /**
   * Configure les événements d'une carte de projet
   */
  private setupProjectCardEvents(card: HTMLElement, project: Project, config: any): void {
    // Actions: git / php / node / sync
    const buttons = card.querySelectorAll('.card-actions button[data-action]');
    buttons.forEach(btn => {
      btn.addEventListener('click', async () => {
        (btn as HTMLButtonElement).disabled = true;
        try {
          const branch = config.branch || 'develop';
          const gitStrategy = config.gitStrategy || 'pull';
          await this.executeAction(project.path, (btn as HTMLElement).dataset['action']!, branch, gitStrategy);
        } finally {
          (btn as HTMLButtonElement).disabled = false;
        }
      });
    });

    // Include
    const includeEl = card.querySelector('.include') as HTMLInputElement;
    includeEl.addEventListener('change', () => {
      this.projectManager.setProjectConfig(project.path, { ...config, include: includeEl.checked });
      this.saveSettings();
      this.updateBulkUI();
    });

    // Branch select
    const branchEl = card.querySelector('.branch') as HTMLSelectElement;
    this.populateBranches(project.path, branchEl);
    branchEl.addEventListener('change', () => {
      this.projectManager.setProjectConfig(project.path, { ...config, branch: branchEl.value || 'develop' });
      this.saveSettings();
    });

    // Git strategy
    const gitStrategyEl = card.querySelector('.git-strategy') as HTMLSelectElement;
    gitStrategyEl.addEventListener('change', () => {
      this.projectManager.setProjectConfig(project.path, { ...config, gitStrategy: gitStrategyEl.value as any });
      this.saveSettings();
    });
  }

  /**
   * Peuple la liste des branches pour un projet
   */
  private async populateBranches(projectPath: string, selectEl: HTMLSelectElement): Promise<void> {
    selectEl.disabled = true;
    try {
      const response: BranchesResponse = await window.api.getBranches(projectPath);
      const { branches = [], current } = response;
      const existing = new Set<string>();
      selectEl.innerHTML = '';
      
      const addOption = (name: string) => {
        if (!name || existing.has(name)) return;
        existing.add(name);
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        selectEl.appendChild(option);
      };

      const config = this.projectManager.getProjectConfig(projectPath);
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

  /**
   * Met à jour l'interface des actions en lot
   */
  private updateBulkUI(): void {
    const capabilities = this.projectManager.getAggregatedCapabilities();

    // Cases à cocher bulk: disabled si aucune cible possible
    if (this.bulkGitEl) this.bulkGitEl.disabled = !capabilities.anyIncluded || !capabilities.anyGit;
    if (this.bulkPhpEl) this.bulkPhpEl.disabled = !capabilities.anyIncluded || !capabilities.anyPhp;
    if (this.bulkNodeEl) this.bulkNodeEl.disabled = !capabilities.anyIncluded || !capabilities.anyNode;

    // Si une case cochée est devenue impossible -> décoche
    if (this.bulkGitEl?.checked && this.bulkGitEl.disabled) this.bulkGitEl.checked = false;
    if (this.bulkPhpEl?.checked && this.bulkPhpEl.disabled) this.bulkPhpEl.checked = false;
    if (this.bulkNodeEl?.checked && this.bulkNodeEl.disabled) this.bulkNodeEl.checked = false;

    this.updateRunSelectedState();
  }

  /**
   * Met à jour l'état du bouton "Run on selected"
   */
  private updateRunSelectedState(): void {
    const capabilities = this.projectManager.getAggregatedCapabilities();

    const willDoSomething = capabilities.anyIncluded && (
      (this.bulkGitEl?.checked && capabilities.anyGit) ||
      (this.bulkPhpEl?.checked && capabilities.anyPhp) ||
      (this.bulkNodeEl?.checked && capabilities.anyNode)
    );

    if (this.runSelectedBtn) {
      this.runSelectedBtn.disabled = !willDoSomething;
    }
  }

  /**
   * Charge les paramètres
   */
  private async loadSettings(): Promise<void> {
    const config = await window.api.getConfig();
    this.settings = config || this.settings;

    // Thème
    const theme = this.settings.theme || 'system';
    this.themeManager.applyTheme(theme);
    if (this.themePicker) {
      this.themePicker.value = theme;
    }

    // Base dir + projets
    if (this.settings.baseDir) {
      this.baseDirEl!.textContent = this.settings.baseDir;
      const projects = await window.api.scanProjects(this.settings.baseDir);
      this.projectManager.setProjects(projects);
      this.ensureProjectSettings();
      this.renderProjects();
    } else {
      this.updateBulkUI();
    }

    // Initialise les versions
    this.versionManager.updateVersions();
  }

  /**
   * Sauvegarde les paramètres
   */
  private saveSettings(): void {
    // Met à jour les paramètres des projets
    const projects = this.projectManager.getProjects();
    for (const project of projects) {
      const config = this.projectManager.getProjectConfig(project.path);
      this.settings.projects[project.path] = config;
    }

    window.api.saveConfig(this.settings);
  }
}

// Initialisation de l'application
const appRenderer = new AppRenderer();
appRenderer.initialize().catch(console.error);
