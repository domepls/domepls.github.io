import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'auth-telegram-link-card',
  imports: [CommonModule],
  templateUrl: './auth-telegram-link-card.html',
  styleUrl: './auth-telegram-link-card.scss',
})
export class AuthTelegramLinkCard {
  constructor(protected readonly auth: AuthService) {}

  protected beginTelegramAuth(): void {
    this.auth.beginTelegramAuth().subscribe({
      next: (authUrl) => {
        window.location.href = authUrl;
      },
    });
  }
}
