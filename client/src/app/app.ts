import { Component, OnInit, signal } from '@angular/core';
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
  ) {}

  async ngOnInit() {
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
