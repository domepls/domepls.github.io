import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatItem, ChatMessage } from '../../services/chats.service';

@Component({
  selector: 'app-chat-room',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-room.html',
  styleUrl: './chat-room.scss',
})
export class ChatRoomComponent {
  readonly selectedChat = input<ChatItem | null>(null);
  readonly messages = input<ChatMessage[]>([]);
  readonly currentUserId = input<number | undefined>(undefined);
  readonly messageText = input('');
  readonly chatLabel = input<(chat: ChatItem) => string>(() => 'Chat');

  readonly messageTextChange = output<string>();
  readonly sendMessage = output<void>();
  readonly closeChat = output<void>();
  readonly openProfile = output<string>();

  peerAvatar(chat: ChatItem): string | null {
    if (chat.type !== 'direct') {
      return null;
    }

    const peer = chat.members.find((member) => member.id !== this.currentUserId());
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
    if (chat.type === 'project') {
      return chat.project_name || chat.name || `Project #${chat.project}`;
    }

    const peer = chat.members.find((member) => member.id !== this.currentUserId());
    if (!peer) {
      return this.chatLabel()(chat);
    }

    const fullName = [peer.first_name, peer.last_name].filter(Boolean).join(' ').trim();
    return fullName || `@${peer.username}`;
  }

  peerUsername(chat: ChatItem): string {
    if (chat.type === 'project') {
      return chat.name || this.chatLabel()(chat);
    }

    const peer = chat.members.find((member) => member.id !== this.currentUserId());
    return peer ? `@${peer.username}` : this.chatLabel()(chat);
  }

  openPeerProfile(chat: ChatItem): void {
    if (chat.type !== 'direct') {
      return;
    }

    const peer = chat.members.find((member) => member.id !== this.currentUserId());
    if (!peer) {
      return;
    }

    this.openProfile.emit(peer.username);
  }

  isMine(message: ChatMessage): boolean {
    return message.sender.id === this.currentUserId();
  }

  messageAvatar(message: ChatMessage): string | null {
    return message.sender.avatar ?? null;
  }

  messageInitials(message: ChatMessage): string {
    const title =
      [message.sender.first_name, message.sender.last_name].filter(Boolean).join(' ').trim() ||
      message.sender.username;
    const pieces = title.split(/\s+/).filter(Boolean);
    const first = pieces[0]?.[0] ?? '';
    const second = pieces.length > 1 ? (pieces[1]?.[0] ?? '') : (pieces[0]?.[1] ?? '');
    return `${first}${second}`.toUpperCase() || 'U';
  }
}
