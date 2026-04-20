import { CommonModule } from '@angular/common';
import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
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
  readonly isLoadingMessages = input(false);
  readonly currentUserId = input<number | undefined>(undefined);
  readonly messageText = input('');
  readonly chatLabel = input<(chat: ChatItem) => string>(() => 'Chat');

  readonly messageTextChange = output<string>();
  readonly sendMessage = output<void>();
  readonly closeChat = output<void>();
  readonly openProfile = output<string>();
  readonly openProject = output<number>();

  readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  private pendingInitialScroll = false;
  private lastChatId: number | null = null;

  constructor() {
    effect(() => {
      const chatId = this.selectedChat()?.id ?? null;

      if (chatId !== this.lastChatId) {
        this.lastChatId = chatId;
        this.pendingInitialScroll = !!chatId;
      }

      const loading = this.isLoadingMessages();
      const messageCount = this.messages().length;

      if (!this.pendingInitialScroll || loading || !messageCount) {
        return;
      }

      this.pendingInitialScroll = false;
      queueMicrotask(() => this.scrollToBottom());
    });
  }

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
      return (
        chat.members.map((m) => `@${m.username}`).join(', ') ||
        chat.project_name ||
        chat.name ||
        `Project #${chat.project}`
      );
    }

    const peer = chat.members.find((member) => member.id !== this.currentUserId());
    return peer ? `@${peer.username}` : this.chatLabel()(chat);
  }

  openPeerProfile(chat: ChatItem): void {
    if (chat.type === 'project') {
      chat.project && this.openProject.emit(chat.project);
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

  openMessageSenderProfile(message: ChatMessage): void {
    if (!message.sender?.username) {
      return;
    }

    this.openProfile.emit(message.sender.username);
  }

  shouldShowDateGroup(index: number): boolean {
    if (index === 0) {
      return true;
    }

    const current = this.messages()[index];
    const previous = this.messages()[index - 1];

    if (!current || !previous) {
      return false;
    }

    return !this.isSameDay(current.created_at, previous.created_at);
  }

  getDateGroupLabel(dateStr: string): string {
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) {
      return dateStr;
    }

    const today = this.startOfDay(new Date());
    const targetDay = this.startOfDay(target);

    if (targetDay.getTime() === today.getTime()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (targetDay.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    const isCurrentYear = target.getFullYear() === today.getFullYear();
    return target.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(isCurrentYear ? {} : { year: 'numeric' }),
    });
  }

  private isSameDay(a: string, b: string): boolean {
    const first = new Date(a);
    const second = new Date(b);

    if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) {
      return a === b;
    }

    return this.startOfDay(first).getTime() === this.startOfDay(second).getTime();
  }

  private startOfDay(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer()?.nativeElement;
    if (!el) {
      return;
    }

    el.scrollTop = el.scrollHeight;
  }
}
