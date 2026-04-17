import { Component, OnInit, signal } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
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
    private readonly router: Router,
  ) {}

  private syncScrollMode(url: string) {
    if (typeof document === 'undefined') {
      return;
    }

    const isMainLayoutRoute = /^\/app(?:\/|$)/.test(url);

    document.body.classList.toggle('route-main-layout', isMainLayoutRoute);
    document.documentElement.classList.toggle('route-main-layout', isMainLayoutRoute);
  }

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

    this.syncScrollMode(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.syncScrollMode(event.urlAfterRedirects));

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
