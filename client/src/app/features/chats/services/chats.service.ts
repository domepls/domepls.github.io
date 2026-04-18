import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments';
import { FriendUser } from '../../friends/services/friends.service';

export type ChatType = 'direct' | 'project';

export interface ChatMessage {
  id: number;
  chat: number;
  sender: FriendUser;
  text: string;
  created_at: string;
}

export interface ChatItem {
  id: number;
  type: ChatType;
  name: string;
  project?: number | null;
  project_name?: string | null;
  members: FriendUser[];
  last_message?: ChatMessage | null;
  updated_at: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ChatsService {
  private readonly apiUrl = `${environment.apiUrl}/api`;

  constructor(private readonly http: HttpClient) {}

  listChats(): Observable<ChatItem[]> {
    return this.http.get<ChatItem[]>(`${this.apiUrl}/chats/`, { withCredentials: true });
  }

  startDirectChat(username: string): Observable<ChatItem> {
    return this.http.post<ChatItem>(
      `${this.apiUrl}/chats/direct/start/`,
      { username },
      { withCredentials: true },
    );
  }

  openProjectChat(projectId: number): Observable<ChatItem> {
    return this.http.post<ChatItem>(
      `${this.apiUrl}/chats/project/${projectId}/open/`,
      {},
      { withCredentials: true },
    );
  }

  listMessages(chatId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/chats/${chatId}/messages/`, {
      withCredentials: true,
    });
  }

  websocketUrl(chatId: number, token: string): string {
    const api = environment.apiUrl;
    const wsProtocol = api.startsWith('https') ? 'wss' : 'ws';
    const host = api.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${host}/ws/chats/${chatId}/?token=${encodeURIComponent(token)}`;
  }
}
