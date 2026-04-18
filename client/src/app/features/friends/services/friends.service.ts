import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments';

export interface FriendUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar?: string | null;
  status?: string;
  telegram_connected?: boolean;
}

export interface PublicAchievement {
  code: string;
  title: string;
  description: string;
  earned: number;
  earned_at: string;
}

export interface PublicProfile extends FriendUser {
  is_self: boolean;
  is_friend: boolean;
  outgoing_request_id?: number | null;
  bio?: string | null;
  birth_date?: string | null;
  location?: string | null;
  website?: string | null;
  points?: number;
  streak?: number;
  achievements?: PublicAchievement[];
}

export interface FriendRequestItem {
  id: number;
  from_user: FriendUser;
  to_user: FriendUser;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface FriendRequestsPayload {
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  actor?: FriendUser | null;
}

export interface NotificationsPayload {
  items: NotificationItem[];
  unread_count: number;
}

@Injectable({ providedIn: 'root' })
export class FriendsService {
  private readonly apiUrl = `${environment.apiUrl}/api`;

  constructor(private readonly http: HttpClient) {}

  searchUsers(q: string): Observable<FriendUser[]> {
    return this.http.get<FriendUser[]>(`${this.apiUrl}/directory/users/`, {
      params: { q },
      withCredentials: true,
    });
  }

  getPublicProfile(username: string): Observable<PublicProfile> {
    return this.http.get<PublicProfile>(`${this.apiUrl}/users/${username}/`, {
      withCredentials: true,
    });
  }

  listFriends(): Observable<FriendUser[]> {
    return this.http.get<FriendUser[]>(`${this.apiUrl}/friends/`, { withCredentials: true });
  }

  listRequests(): Observable<FriendRequestsPayload> {
    return this.http.get<FriendRequestsPayload>(`${this.apiUrl}/friends/requests/`, {
      withCredentials: true,
    });
  }

  sendRequest(username: string): Observable<FriendRequestItem> {
    return this.http.post<FriendRequestItem>(
      `${this.apiUrl}/friends/requests/send/`,
      { username },
      { withCredentials: true },
    );
  }

  actionRequest(
    requestId: number,
    action: 'accept' | 'reject' | 'cancel',
  ): Observable<FriendRequestItem> {
    return this.http.post<FriendRequestItem>(
      `${this.apiUrl}/friends/requests/${requestId}/${action}/`,
      {},
      { withCredentials: true },
    );
  }

  removeFriend(username: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/friends/${username}/`, { withCredentials: true });
  }

  listNotifications(): Observable<NotificationsPayload> {
    return this.http.get<NotificationsPayload>(`${this.apiUrl}/notifications/`, {
      withCredentials: true,
    });
  }

  markNotificationsRead(notificationId?: number): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(
      `${this.apiUrl}/notifications/mark-read/`,
      notificationId ? { notification_id: notificationId } : {},
      { withCredentials: true },
    );
  }

  notificationsWebsocketUrl(token: string): string {
    const api = environment.apiUrl;
    const wsProtocol = api.startsWith('https') ? 'wss' : 'ws';
    const host = api.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${host}/ws/notifications/?token=${encodeURIComponent(token)}`;
  }
}
