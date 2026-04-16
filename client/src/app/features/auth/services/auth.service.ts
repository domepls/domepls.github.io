import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError, timeout } from 'rxjs';
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

interface MeResponse {
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  bio?: string | null;
  birth_date?: string | null;
  location?: string | null;
  website?: string | null;
  status?: string | null;
  points?: number;
  streak?: number;
  last_seen?: string | null;
  telegram_id?: number | null;
}

interface JwtPayload {
  user_id?: number;
  sub?: string;
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

  restoreSession(): Observable<boolean> {
    return this.http
      .post<TokenResponse>(`${this.apiUrl}/auth/refresh/`, {}, { withCredentials: true })
      .pipe(
        tap((response) => this.saveAccessToken(response.tokens.access)),
        map(() => true),
        catchError(() => {
          this.clearSession();
          return of(false);
        }),
      );
  }

  fetchCurrentUser(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.apiUrl}/users/me/`).pipe(
      tap((profile) => {
        this.updateCurrentUser(profile);
      }),
    );
  }

  private updateCurrentUser(profile: MeResponse): void {
    const user = this.currentUser();
    const userId = user?.id ?? this.getUserIdFromAccessToken() ?? 0;

    const hydratedUser: AuthUser = {
      id: userId,
      username: profile.username,
      first_name: profile.first_name ?? null,
      last_name: profile.last_name ?? null,
      avatar: profile.avatar ?? null,
      bio: profile.bio ?? null,
      birth_date: profile.birth_date ?? null,
      location: profile.location ?? null,
      website: profile.website ?? null,
      status: profile.status ?? null,
      points: profile.points ?? 0,
      streak: profile.streak ?? 0,
      last_seen: profile.last_seen ?? null,
      telegram_id: profile.telegram_id ?? null,
      telegram_connected: Boolean(profile.telegram_id),
    };

    this.currentUser.set(hydratedUser);
    localStorage.setItem(this.userKey, JSON.stringify(hydratedUser));
    localStorage.setItem(this.needsTelegramKey, String(!hydratedUser.telegram_connected));
    this.needsTelegramLink.set(!hydratedUser.telegram_connected);
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
        timeout(10_000),
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
        timeout(15_000),
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
      switchMap(() =>
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
        }).pipe(
          timeout({
            first: 90_000,
            with: () => throwError(() => new Error('Telegram authorization timed out.')),
          }),
        ),
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

      const completeIfReady = () => {
        if (window.Telegram?.Login) {
          observer.next(void 0);
          observer.complete();
          return true;
        }
        return false;
      };

      if (existingScript) {
        if (completeIfReady()) {
          return;
        }

        const onLoad = () => {
          if (completeIfReady()) {
            return;
          }
          observer.error(new Error('Telegram widget loaded but API is unavailable.'));
        };
        const onError = () => observer.error(new Error('Failed to load Telegram widget.'));

        existingScript.addEventListener('load', onLoad, { once: true });
        existingScript.addEventListener('error', onError, { once: true });

        const fallbackTimer = window.setTimeout(() => {
          if (!completeIfReady()) {
            observer.error(new Error('Telegram widget initialization timed out.'));
          }
        }, 10_000);

        return () => {
          window.clearTimeout(fallbackTimer);
          existingScript.removeEventListener('load', onLoad);
          existingScript.removeEventListener('error', onError);
        };
      }

      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.dataset['telegramWidget'] = 'login';

      const onLoad = () => {
        if (completeIfReady()) {
          return;
        }
        observer.error(new Error('Telegram widget loaded but API is unavailable.'));
      };
      const onError = () => observer.error(new Error('Failed to load Telegram widget.'));

      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });

      const fallbackTimer = window.setTimeout(() => {
        if (!completeIfReady()) {
          observer.error(new Error('Telegram widget initialization timed out.'));
        }
      }, 10_000);

      document.head.appendChild(script);

      return () => {
        window.clearTimeout(fallbackTimer);
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
      };
    });
  }

  private getUserIdFromAccessToken(): number | null {
    const token = this.accessToken();
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    try {
      const payloadSegment = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payloadSegment + '='.repeat((4 - (payloadSegment.length % 4)) % 4);
      const payload = JSON.parse(window.atob(padded)) as JwtPayload;

      if (typeof payload.user_id === 'number') {
        return payload.user_id;
      }

      if (typeof payload.sub === 'string' && /^\d+$/.test(payload.sub)) {
        return Number(payload.sub);
      }

      return null;
    } catch {
      return null;
    }
  }
}
