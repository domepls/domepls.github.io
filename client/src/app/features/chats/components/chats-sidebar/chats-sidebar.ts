import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ChatItem, ChatType } from '../../services/chats.service';

@Component({
  selector: 'app-chats-sidebar',
  imports: [CommonModule],
  templateUrl: './chats-sidebar.html',
  styleUrl: './chats-sidebar.scss',
})
export class ChatsSidebarComponent {
  readonly isLoading = input(false);
  readonly chatType = input<ChatType | 'all'>('all');
  readonly chats = input<ChatItem[]>([]);
  readonly selectedChatId = input<number | null>(null);
  readonly currentUserId = input<number | undefined>(undefined);
  readonly chatLabel = input<(chat: ChatItem) => string>(() => 'Chat');

  readonly typeChange = output<ChatType | 'all'>();
  readonly selectChat = output<ChatItem>();

  peerAvatar(chat: ChatItem): string | null {
    if (chat.type !== 'direct') {
      return null;
    }

    const peer = chat.members.find((m) => m.id !== this.currentUserId());
    return peer?.avatar ?? null;
  }

  peerInitials(chat: ChatItem): string {
    const title = this.peerName(chat).replace(/^@/, '').trim();
    if (!title) {
      return 'CH';
    }

    const pieces = title.split(/\s+/).filter(Boolean);
    const first = pieces[0]?.[0] ?? '';
    const second = pieces.length > 1 ? (pieces[1]?.[0] ?? '') : (pieces[0]?.[1] ?? '');
    return `${first}${second}`.toUpperCase() || 'CH';
  }

  peerName(chat: ChatItem): string {
    if (chat.type !== 'direct') {
      return this.chatLabel()(chat);
    }

    const peer = chat.members.find((m) => m.id !== this.currentUserId());
    if (!peer) {
      return this.chatLabel()(chat);
    }

    const fullName = [peer.first_name, peer.last_name].filter(Boolean).join(' ').trim();
    return fullName || `@${peer.username}`;
  }

  peerUsername(chat: ChatItem): string {
    if (chat.type !== 'direct') {
      return chat.project_name || this.chatLabel()(chat);
    }

    const peer = chat.members.find((m) => m.id !== this.currentUserId());
    return peer ? `@${peer.username}` : this.chatLabel()(chat);
  }

  getLastMessageText(chat: ChatItem): string {
    return chat.last_message?.text || 'No messages yet';
  }

  getLastMessageDate(chat: ChatItem): string {
    const dateRaw = chat.last_message?.created_at || chat.updated_at;
    return dateRaw;
  }

  formatMessageDate(dateStr: string): string {
    try {
      const messageDate = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      today.setHours(0, 0, 0, 0);
      messageDate.setHours(
        messageDate.getHours(),
        messageDate.getMinutes(),
        messageDate.getSeconds(),
        0,
      );
      yesterday.setHours(0, 0, 0, 0);
      weekAgo.setHours(0, 0, 0, 0);
      const messageDateOnly = new Date(messageDate);
      messageDateOnly.setHours(0, 0, 0, 0);

      const now = new Date();

      if (messageDateOnly.getTime() === today.getTime()) {
        return messageDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      }

      if (messageDateOnly.getTime() === yesterday.getTime()) {
        return 'Yesterday';
      }

      if (
        messageDateOnly.getTime() > weekAgo.getTime() &&
        messageDateOnly.getTime() < today.getTime()
      ) {
        return messageDate.toLocaleString('en-US', { weekday: 'short' });
      }

      if (messageDate.getFullYear() === now.getFullYear()) {
        return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
}
