import { LogData } from '../../types';

/**
 * Gestionnaire de logs pour l'interface utilisateur
 */
export class LogManager {
  private logContainer: HTMLElement | null = null;

  constructor(logContainerId: string) {
    this.logContainer = document.getElementById(logContainerId);
  }

  /**
   * Ajoute un log à l'affichage
   */
  public addLog(data: LogData): void {
    if (!this.logContainer) {
      console.log('Log container not found');
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
    
    this.logContainer.appendChild(logEntry);
    
    // Force le scroll vers le bas avec un petit délai pour s'assurer de la mise à jour du DOM
    setTimeout(() => {
      if (this.logContainer) {
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
      }
    }, 10);
    
    console.log('Added to global log:', prefix + data.message);
  }

  /**
   * Efface tous les logs
   */
  public clearLogs(): void {
    if (this.logContainer) {
      this.logContainer.innerHTML = '';
      console.log('Console cleared');
    }
  }

  /**
   * Scroll vers le bas
   */
  public scrollToBottom(): void {
    if (this.logContainer) {
      this.logContainer.scrollTop = this.logContainer.scrollHeight;
      console.log('Scrolled to bottom');
    }
  }
}
