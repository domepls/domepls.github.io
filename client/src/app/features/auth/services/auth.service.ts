import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../../environments';
import {
  AuthResponse,
  AuthUser,
  TelegramAuthPayload,
  TelegramAuthResponse,
} from '../models/auth.models';

interface TokenResponse {
  tokens: {
    access: string;
  };
}

interface TelegramInitResponse {
  state: string;
  bot_id: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/api`;
  private readonly accessTokenKey = 'accessToken';
  private readonly userKey = 'authUser';
  private readonly needsTelegramKey = 'needsTelegramLink';

  readonly accessToken = signal<string | null>(localStorage.getItem(this.accessTokenKey));
  readonly currentUser = signal<AuthUser | null>(this.readStoredUser());
  readonly needsTelegramLink = signal(localStorage.getItem(this.needsTelegramKey) === 'true');
  readonly isAuthenticated = computed(() => Boolean(this.accessToken()));

  constructor(private readonly http: HttpClient) {}

  login(username: string, password: string) {
    return this.http
      .post<AuthResponse>(
        `${this.apiUrl}/auth/login/`,
        { username, password },
        { withCredentials: true },
      )
      .pipe(tap((response) => this.saveSession(response)));
  }

  register(username: string, password: string, passwordConfirm: string) {
    return this.http
      .post<AuthResponse>(
        `${this.apiUrl}/auth/register/`,
        {
          username,
          password,
          password_confirm: passwordConfirm,
        },
        { withCredentials: true },
      )
      .pipe(tap((response) => this.saveSession(response)));
  }

  restoreSession() {
    return this.http
      .post<TokenResponse>(`${this.apiUrl}/auth/refresh/`, {}, { withCredentials: true })
      .pipe(
        tap((response) => this.saveAccessToken(response.tokens.access)),
        catchError(() => of(null)),
      );
  }

  logout() {
    return this.http
      .post<{ message: string }>(`${this.apiUrl}/auth/logout/`, {}, { withCredentials: true })
      .pipe(tap(() => this.clearSession()));
  }

  beginTelegramAuth() {
    return this.http
      .get<TelegramInitResponse>(`${this.apiUrl}/auth/telegram/`, { withCredentials: true })
      .pipe(map(({ state, bot_id }) => this.buildTelegramAuthUrl(state, bot_id)));
  }

  completeTelegramAuth(payload: TelegramAuthPayload) {
    return this.http
      .post<TelegramAuthResponse>(`${this.apiUrl}/auth/telegram/`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.currentUser.set(response.user);
          this.needsTelegramLink.set(false);
          localStorage.setItem(this.needsTelegramKey, 'false');
        }),
      );
  }

  clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.needsTelegramKey);
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.needsTelegramLink.set(false);
  }

  private saveSession(response: AuthResponse): void {
    this.saveAccessToken(response.tokens.access);
    this.currentUser.set(response.user);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));
    localStorage.setItem(this.needsTelegramKey, String(!response.user.telegram_connected));
    this.needsTelegramLink.set(!response.user.telegram_connected);
  }

  private saveAccessToken(accessToken: string): void {
    localStorage.setItem(this.accessTokenKey, accessToken);
    this.accessToken.set(accessToken);
  }

  private readStoredUser(): AuthUser | null {
    const storedUser = localStorage.getItem(this.userKey);

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as AuthUser;
    } catch {
      return null;
    }
  }

  private buildTelegramAuthUrl(state: string, botId: string): string {
    const resolvedBotId = botId.trim();

    if (!resolvedBotId) {
      throw new Error('Telegram bot id is not configured.');
    }

    const callbackUrl = new URL(`${window.location.origin}/auth/telegram`);
    callbackUrl.searchParams.set('state', state);

    const authUrl = new URL('https://oauth.telegram.org/auth');
    authUrl.searchParams.set('bot_id', resolvedBotId);
    authUrl.searchParams.set('origin', window.location.origin);
    authUrl.searchParams.set('return_to', callbackUrl.toString());
    authUrl.searchParams.set('request_access', '0');

    return authUrl.toString();
  }
}
