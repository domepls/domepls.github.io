import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  tokens: {
    access: string;
    refresh: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/api`;

  readonly isAuthenticated = signal(Boolean(localStorage.getItem('accessToken')));

  constructor(private readonly http: HttpClient) {}

  login(username: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login/`, { username, password })
      .pipe(tap((response) => this.saveSession(response)));
  }

  register(username: string, email: string, password: string, passwordConfirm: string) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/register/`, {
        username,
        email,
        password,
        password_confirm: passwordConfirm,
      })
      .pipe(tap((response) => this.saveSession(response)));
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.isAuthenticated.set(false);
  }

  private saveSession(response: AuthResponse): void {
    localStorage.setItem('accessToken', response.tokens.access);
    localStorage.setItem('refreshToken', response.tokens.refresh);
    this.isAuthenticated.set(true);
  }
}
