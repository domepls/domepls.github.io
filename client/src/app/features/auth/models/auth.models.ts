export interface AuthUser {
  id: number;
  username: string;
  telegram_connected: boolean;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  tokens: {
    access: string;
  };
}

export interface TelegramAuthPayload {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
  auth_date: number;
  hash: string;
  state?: string | null;
}

export interface TelegramAuthResponse {
  message: string;
  user: AuthUser;
  profile: Record<string, unknown>;
}
