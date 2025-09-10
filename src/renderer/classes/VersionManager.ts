import { VersionResponse } from '../../types';

/**
 * Gestionnaire des versions pour l'interface utilisateur
 */
export class VersionManager {
  private phpVersionElement: HTMLElement | null = null;
  private nodeVersionElement: HTMLElement | null = null;

  constructor(phpVersionId: string, nodeVersionId: string) {
    this.phpVersionElement = document.getElementById(phpVersionId);
    this.nodeVersionElement = document.getElementById(nodeVersionId);
  }

  /**
   * Obtient la version PHP actuelle
   */
  public async getPhpVersion(): Promise<string> {
    try {
      const response: VersionResponse = await window.api.getPhpVersion();
      if (response.ok && response.version) {
        return response.version;
      }
      return '--';
    } catch (error) {
      console.error('Error getting PHP version:', error);
      return '--';
    }
  }

  /**
   * Obtient la version Node.js actuelle
   */
  public async getNodeVersion(): Promise<string> {
    try {
      const response: VersionResponse = await window.api.getNodeVersion();
      if (response.ok && response.version) {
        return response.version;
      }
      return '--';
    } catch (error) {
      console.error('Error getting Node version:', error);
      return '--';
    }
  }

  /**
   * Met à jour l'affichage des versions
   */
  public async updateVersions(): Promise<void> {
    const phpVer = await this.getPhpVersion();
    const nodeVer = await this.getNodeVersion();
    
    if (this.phpVersionElement) {
      this.phpVersionElement.textContent = phpVer;
    }
    if (this.nodeVersionElement) {
      this.nodeVersionElement.textContent = nodeVer;
    }
  }

  /**
   * Met à jour les versions après une action qui pourrait les changer
   */
  public updateVersionsAfterAction(): void {
    // Attend un peu pour que les changements de version prennent effet
    setTimeout(() => {
      this.updateVersions();
    }, 1000);
  }
}
