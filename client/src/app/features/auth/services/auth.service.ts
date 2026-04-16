import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, of, switchMap, tap, throwError } from 'rxjs';
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
  bot_id: string;
}

type TelegramLoginAuthPayload = Omit<TelegramAuthPayload, 'state'>;

interface TelegramLoginOptions {
  bot_id: string;
  request_access?: 'write' | 'read';
}

interface TelegramLoginApi {
  auth(
    options: TelegramLoginOptions,
    callback: (payload: TelegramLoginAuthPayload | false) => void,
  ): void;
}

interface TelegramWindow {
  Login?: TelegramLoginApi;
}

declare global {
  interface Window {
    Telegram?: TelegramWindow;
  }
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
      .pipe(
        switchMap(({ bot_id }) =>
          this.openTelegramPopup(bot_id).pipe(
            switchMap((payload) => this.completeTelegramAuth(payload)),
          ),
        ),
      );
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

  private openTelegramPopup(botId: string): Observable<TelegramLoginAuthPayload> {
    const resolvedBotId = botId.trim();
    if (!resolvedBotId) {
      return throwError(() => new Error('Telegram bot id is not configured.'));
    }

    return this.loadTelegramWidget().pipe(
      switchMap(
        () =>
          new Observable<TelegramLoginAuthPayload>((observer) => {
            const telegramLogin = window.Telegram?.Login;

            if (!telegramLogin) {
              observer.error(new Error('Telegram widget is unavailable.'));
              return;
            }

            telegramLogin.auth(
              {
                bot_id: resolvedBotId,
                request_access: 'write',
              },
              (payload) => {
                if (!payload) {
                  observer.error(new Error('Telegram authorization was canceled.'));
                  return;
                }

                observer.next(payload);
                observer.complete();
              },
            );
          }),
      ),
    );
  }

  private loadTelegramWidget(): Observable<void> {
    if (window.Telegram?.Login) {
      return of(void 0);
    }

    return new Observable<void>((observer) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-telegram-widget="login"]',
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => observer.next(void 0), { once: true });
        existingScript.addEventListener(
          'error',
          () => observer.error(new Error('Failed to load Telegram widget.')),
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.dataset['telegramWidget'] = 'login';

      script.addEventListener(
        'load',
        () => {
          observer.next(void 0);
          observer.complete();
        },
        { once: true },
      );

      script.addEventListener(
        'error',
        () => observer.error(new Error('Failed to load Telegram widget.')),
        { once: true },
      );

      document.head.appendChild(script);
    });
  }
}
