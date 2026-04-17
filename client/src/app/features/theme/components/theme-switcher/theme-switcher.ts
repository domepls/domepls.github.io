import { Component } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

type Theme = 'light' | 'dark' | 'system';

@Component({
  selector: 'theme-switcher',
  imports: [],
  templateUrl: './theme-switcher.html',
  styleUrl: './theme-switcher.scss',
})
export class ThemeSwitcher {
  private static readonly instancePrefix = 'theme-switcher';
  private static instanceCount = 0;

  protected readonly groupName = `${ThemeSwitcher.instancePrefix}-${ThemeSwitcher.instanceCount++}`;

  constructor(private readonly theme: ThemeService) {}

  protected setTheme(theme: Theme): void {
    this.theme.setTheme(theme);
  }

  protected isTheme(theme: Theme): boolean {
    return this.theme.getTheme() === theme;
  }

  protected getThemeId(theme: Theme): string {
    return `${this.groupName}-${theme}`;
  }
}
