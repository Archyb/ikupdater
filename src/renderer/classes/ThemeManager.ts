import { Theme } from '../../types';

/**
 * Gestionnaire de thème pour l'interface utilisateur
 */
export class ThemeManager {
  private systemDarkQuery: MediaQueryList | null = null;
  private currentTheme: Theme = 'system';

  constructor() {
    this.initSystemMatcher();
  }

  /**
   * Initialise le détecteur de thème système
   */
  private initSystemMatcher(): void {
    if (!this.systemDarkQuery) {
      this.systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemDarkQuery.addEventListener?.('change', () => {
        if (this.currentTheme === 'system') {
          this.applyTheme('system');
        }
      });
    }
  }

  /**
   * Vérifie si le système est en mode sombre
   */
  private isSystemDark(): boolean {
    this.initSystemMatcher();
    return !!this.systemDarkQuery?.matches;
  }

  /**
   * Applique un thème
   */
  public applyTheme(theme: Theme): void {
    const root = document.documentElement;
    const mode = theme === 'system' ? (this.isSystemDark() ? 'dark' : 'light') : theme;

    // Applique la classe "dark" (Tailwind dark mode = 'class')
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    this.currentTheme = theme;
  }

  /**
   * Retourne le thème actuel
   */
  public getCurrentTheme(): Theme {
    return this.currentTheme;
  }
}
