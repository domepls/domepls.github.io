import { Component } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

type Theme = 'light' | 'dark' | 'system';

@Component({
  selector: 'theme-switcher',
  imports: [],
  templateUrl: './theme-switcher.html',
  styleUrl: './theme-switcher.css',
})
export class ThemeSwitcher {
  constructor(private readonly theme: ThemeService) {}

  protected setTheme(theme: Theme): void {
    this.theme.setTheme(theme);
  }

  protected isTheme(theme: Theme): boolean {
    return this.theme.getTheme() === theme;
  }
}
