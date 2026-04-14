import { Injectable } from '@angular/core';

type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private THEME_KEY = 'theme';

  init() {
    const savedTheme = this.getTheme();
    this.applyTheme(savedTheme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.getTheme() === 'system') {
        this.applyTheme('system');
      }
    });
  }

  getTheme(): Theme {
    return (localStorage.getItem(this.THEME_KEY) as Theme) || 'system';
  }

  setTheme = (theme: Theme) => {
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyTheme(theme);
  };

  private applyTheme = (theme: Theme) => {
    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  };
}
