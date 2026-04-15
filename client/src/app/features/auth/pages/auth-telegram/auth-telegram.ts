import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TelegramAuthPayload } from '../../models/auth.models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'auth-telegram-page',
  standalone: true,

  imports: [RouterLink],
  templateUrl: './auth-telegram.html',
  styleUrl: './auth-telegram.scss',
})
export default class AuthTelegramPage implements OnInit {
  protected isLoading = true;
  protected isSuccess = false;
  protected message = 'Validating Telegram connection...';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    const payload = this.readPayload();

    if (!payload) {
      this.isLoading = false;
      this.message = 'Telegram returned an incomplete payload.';
      return;
    }

    this.auth.completeTelegramAuth(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
        this.message = 'Telegram connected successfully.';
      },
      error: (error) => {
        this.isLoading = false;
        this.message = error?.error?.detail ?? 'Unable to connect Telegram.';
      },
    });
  }

  private readPayload(): TelegramAuthPayload | null {
    const snapshot = this.route.snapshot.queryParamMap;
    const state = snapshot.get('state');

    const queryPayload = this.readQueryPayload(state);
    if (queryPayload) {
      return queryPayload;
    }

    return this.readHashPayload(state);
  }

  private readQueryPayload(state: string | null): TelegramAuthPayload | null {
    const snapshot = this.route.snapshot.queryParamMap;
    const id = snapshot.get('id');
    const authDate = snapshot.get('auth_date');
    const hash = snapshot.get('hash');

    if (!id || !authDate || !hash) {
      return null;
    }

    return {
      id: Number(id),
      first_name: snapshot.get('first_name'),
      last_name: snapshot.get('last_name'),
      username: snapshot.get('username'),
      photo_url: snapshot.get('photo_url'),
      auth_date: Number(authDate),
      hash,
      state,
    };
  }

  private readHashPayload(state: string | null): TelegramAuthPayload | null {
    const hashString = window.location.hash.toString();
    const match = hashString.match(/[#?&]tgAuthResult=([A-Za-z0-9\-_=]*)$/);
    if (!match) {
      return null;
    }

    try {
      let data = match[1] || '';
      data = data.replace(/-/g, '+').replace(/_/g, '/');
      const pad = data.length % 4;
      if (pad > 1) {
        data += new Array(5 - pad).join('=');
      }

      const decoded = JSON.parse(window.atob(data)) as Omit<TelegramAuthPayload, 'state'>;

      // Clear only tgAuthResult from hash after parsing.
      window.location.hash = hashString.replace(/[#?&]tgAuthResult=([A-Za-z0-9\-_=]*)$/, '');

      return {
        ...decoded,
        state,
      };
    } catch {
      return null;
    }
  }
}
