import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../features/auth/services/auth.service';

@Component({
  selector: 'app-telegram-connect',
  imports: [CommonModule],
  templateUrl: './telegram-connect.html',
  styleUrl: './telegram-connect.scss',
})
export default class TelegramConnectComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isConnecting = signal(false);
  protected readonly errorMessage = signal('');

  protected connectTelegram(): void {
    if (this.isConnecting()) {
      return;
    }

    this.isConnecting.set(true);
    this.errorMessage.set('');

    this.auth
      .beginTelegramAuth()
      .pipe(finalize(() => this.isConnecting.set(false)))
      .subscribe({
        next: () => {
          this.router.navigateByUrl('/app/dashboard');
        },
        error: (error) => {
          this.errorMessage.set(
            error?.error?.detail ?? error?.message ?? 'Unable to connect Telegram.',
          );
        },
      });
  }
}
