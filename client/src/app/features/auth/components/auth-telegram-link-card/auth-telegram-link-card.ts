import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'auth-telegram-link-card',
  imports: [CommonModule],
  templateUrl: './auth-telegram-link-card.html',
  styleUrl: './auth-telegram-link-card.scss',
})
export class AuthTelegramLinkCard {
  protected isSubmitting = false;
  protected errorMessage = '';

  constructor(protected readonly auth: AuthService) {}

  protected beginTelegramAuth(): void {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth
      .beginTelegramAuth()
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        error: (error) => {
          this.errorMessage =
            error?.error?.detail ?? error?.message ?? 'Unable to connect Telegram.';
        },
      });
  }
}
