import { Component } from '@angular/core';
import { ViewEncapsulation } from '@angular/core';
import { AuthTelegramLinkCard } from '../auth-telegram-link-card/auth-telegram-link-card';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'auth-page-shell',
  imports: [AuthTelegramLinkCard],
  templateUrl: './auth-page-shell.html',
  styleUrl: './auth-page-shell.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AuthPageShell {
  constructor(protected readonly auth: AuthService) {}
}
