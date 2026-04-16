import { Component, OnInit, signal } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './features/auth/services/auth.service';
import { ThemeService } from './features/theme/services/theme.service';

@Component({
  selector: 'root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly isInitializing = signal(true);

  constructor(
    private readonly theme: ThemeService,
    private readonly auth: AuthService,
    private readonly viewportScroller: ViewportScroller,
  ) {}

  async ngOnInit() {
    this.viewportScroller.setOffset(() => {
      if (typeof document === 'undefined') {
        return [0, 0];
      }

      const header = document.querySelector('public-header');
      const headerHeight =
        header instanceof HTMLElement ? header.getBoundingClientRect().height : 0;

      return [0, Math.ceil(headerHeight) + 8];
    });

    this.theme.init();

    let isAuthenticated = false;

    try {
      isAuthenticated = await firstValueFrom(this.auth.restoreSession());

      if (isAuthenticated) {
        this.auth.fetchCurrentUser().subscribe({
          error: () => {},
        });
      }
    } finally {
      this.isInitializing.set(false);
    }
  }
}
