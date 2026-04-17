import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments';

export interface ProfileData {
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
  telegram_connected?: boolean;
  two_factor_enabled?: boolean;
}

export interface ProfileUpdatePayload {
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  birth_date: string;
  location: string;
  website: string;
  status: string;
  two_factor_enabled: boolean;
  current_password: string;
  password: string;
  password_confirm: string;
  two_factor_code?: string;
  avatar?: File | null;
}

export interface ProfileUpdateChallengeResponse {
  detail: string;
  requires_2fa_code?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly apiUrl = `${environment.apiUrl}/api`;

  constructor(private readonly http: HttpClient) {}

  getProfile(): Observable<ProfileData> {
    return this.http.get<ProfileData>(`${this.apiUrl}/users/me/`, { withCredentials: true });
  }

  updateProfile(
    payload: ProfileUpdatePayload,
  ): Observable<ProfileData | ProfileUpdateChallengeResponse> {
    const formData = new FormData();

    formData.append('username', payload.username.trim());
    formData.append('first_name', payload.first_name.trim());
    formData.append('last_name', payload.last_name.trim());
    formData.append('bio', payload.bio.trim());
    formData.append('location', payload.location.trim());
    formData.append('website', payload.website.trim());
    formData.append('status', payload.status.trim());
    formData.append('two_factor_enabled', String(payload.two_factor_enabled));

    if (payload.birth_date.trim()) {
      formData.append('birth_date', payload.birth_date.trim());
    }

    if (payload.current_password) {
      formData.append('current_password', payload.current_password);
    }

    if (payload.password) {
      formData.append('password', payload.password);
      formData.append('password_confirm', payload.password_confirm);
    }

    if (payload.two_factor_code) {
      formData.append('two_factor_code', payload.two_factor_code);
    }

    if (payload.avatar) {
      formData.append('avatar', payload.avatar);
    }

    return this.http.patch<ProfileData | ProfileUpdateChallengeResponse>(
      `${this.apiUrl}/users/me/`,
      formData,
      {
        withCredentials: true,
      },
    );
  }

  deleteAccount(
    currentPassword: string,
    otpCode?: string,
  ): Observable<{ message: string; detail?: string; requires_2fa_code?: boolean }> {
    const body: Record<string, string> = { current_password: currentPassword };
    if (otpCode) {
      body['otp_code'] = otpCode;
    }

    return this.http.request<{ message: string }>('DELETE', `${this.apiUrl}/users/me/`, {
      body,
      withCredentials: true,
    });
  }
}
