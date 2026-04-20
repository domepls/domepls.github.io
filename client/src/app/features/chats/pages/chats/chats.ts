import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, firstValueFrom, of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { ChatsService, ChatItem, ChatMessage } from '../../services/chats.service';
import { ChatsSidebarComponent } from '../../components/chats-sidebar/chats-sidebar';
import { ChatRoomComponent } from '../../components/chat-room/chat-room';

@Component({
  selector: 'app-chats-page',
  imports: [CommonModule, ChatsSidebarComponent, ChatRoomComponent],
  templateUrl: './chats.html',
  styleUrl: './chats.scss',
})
export default class ChatsPage implements OnInit, OnDestroy {
  private readonly chatsService = inject(ChatsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private socket: WebSocket | null = null;
  private readonly expectedSocketClose = new WeakSet<WebSocket>();
  private unauthorizedRetryChatId: number | null = null;
  private deepLinkApplied = false;

  protected readonly pageError = signal('');
  protected readonly isLoading = signal(true);
  protected readonly chatType = signal<'direct' | 'project' | 'all'>('all');
  protected readonly chats = signal<ChatItem[]>([]);
  protected readonly selectedChat = signal<ChatItem | null>(null);
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly isLoadingMessages = signal(false);
  protected readonly messageText = signal('');

  protected readonly filteredChats = computed(() =>
    this.chatType() === 'all'
      ? this.chats()
      : this.chats().filter((chat) => chat.type === this.chatType()),
  );

  ngOnInit(): void {
    this.loadChats();
  }

  ngOnDestroy(): void {
    this.closeSocket();
  }

  protected setChatType(type: 'direct' | 'project' | 'all'): void {
    this.chatType.set(type);

    const selected = this.selectedChat();
    if (selected?.type !== type) {
      this.closeSelectedChat();
    }
  }

  protected createDirectChat(usernameRaw: string): void {
    const username = usernameRaw.trim();
    if (!username) {
      return;
    }

    this.chatsService
      .startDirectChat(username)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chat) => {
          this.upsertChat(chat);
          this.selectChat(chat);
        },
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to start direct chat.');
        },
      });
  }

  protected openProjectChat(projectId: number): void {
    if (!projectId) {
      return;
    }

    this.chatsService
      .openProjectChat(projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chat) => {
          this.upsertChat(chat);
          this.selectChat(chat);
        },
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to open project chat.');
        },
      });
  }

  protected selectChat(chat: ChatItem): void {
    this.selectedChat.set(chat);
    this.messages.set([]);
    this.loadMessages(chat.id);
    void this.openSocket(chat.id);
  }

  protected onMessageInput(value: string): void {
    this.messageText.set(value);
  }

  protected sendMessage(): void {
    const text = this.messageText().trim();
    if (!text || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify({ text }));
    this.messageText.set('');
  }

  protected closeSelectedChat(): void {
    this.closeSocket();
    this.selectedChat.set(null);
    this.messages.set([]);
  }

  protected openChatProfile(username: string): void {
    if (!username) {
      return;
    }

    this.closeSocket();
    this.router.navigate(['/app/users', username]);
  }

  protected openChatProject(projectId: number): void {
    if (!projectId) {
      return;
    }
    this.closeSocket();
    this.router.navigate(['/app/projects', projectId]);
  }

  protected chatLabel(chat: ChatItem): string {
    if (chat.type === 'project') {
      return chat.project_name || chat.name || `Project #${chat.project}`;
    }

    const currentId = this.auth.currentUser()?.id;
    const peer = chat.members.find((m) => m.id !== currentId);
    return peer ? `@${peer.username}` : chat.name || 'Direct chat';
  }

  private loadChats(): void {
    this.isLoading.set(true);
    this.pageError.set('');

    this.chatsService
      .listChats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chats) => {
          this.chats.set(chats);
          this.isLoading.set(false);
          this.applyDeepLink();
        },
        error: (error) => {
          this.isLoading.set(false);
          this.pageError.set(error?.error?.detail ?? 'Unable to load chats.');
        },
      });
  }

  private loadMessages(chatId: number): void {
    this.isLoadingMessages.set(true);
    this.pageError.set('');
    this.chatsService
      .listMessages(chatId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingMessages.set(false)),
      )
      .subscribe({
        next: (messages) => this.messages.set(messages),
        error: () => this.pageError.set('Unable to load messages.'),
      });
  }

  private async openSocket(chatId: number): Promise<void> {
    this.closeSocket();
    const token = await this.resolveAccessToken();
    if (!token) {
      this.pageError.set('Session expired. Please log in again.');
      return;
    }

    const wsUrl = this.chatsService.websocketUrl(chatId, token);
    const socket = new WebSocket(wsUrl);
    this.socket = socket;
    this.pageError.set('');

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ChatMessage;
        this.messages.set([...this.messages(), message]);
      } catch {
        // Ignore malformed messages.
      }
    };

    socket.onerror = () => {
      if (this.expectedSocketClose.has(socket)) {
        return;
      }
      this.pageError.set('WebSocket connection failed.');
    };

    socket.onclose = (event) => {
      if (this.expectedSocketClose.has(socket)) {
        this.expectedSocketClose.delete(socket);
        return;
      }

      if (event.code === 4401 && this.unauthorizedRetryChatId !== chatId) {
        this.unauthorizedRetryChatId = chatId;
        void this.retrySocketAfterRefresh(chatId);
        return;
      }

      if (event.code !== 1000) {
        this.pageError.set('Chat connection was closed. Please reopen the dialog.');
      }
    };
  }

  private closeSocket(): void {
    const socket = this.socket;
    if (socket) {
      this.expectedSocketClose.add(socket);
      socket.close();
      this.socket = null;
    }
  }

  private upsertChat(chat: ChatItem): void {
    const items = this.chats();
    const next = items.some((item) => item.id === chat.id)
      ? items.map((item) => (item.id === chat.id ? chat : item))
      : [chat, ...items];
    this.chats.set(next);
  }

  private applyDeepLink(): void {
    if (this.deepLinkApplied) {
      return;
    }

    this.deepLinkApplied = true;
    const queryMap = this.route.snapshot.queryParamMap;
    const chatId = Number(queryMap.get('chatId') ?? 0);
    const type = queryMap.get('type');
    const username = queryMap.get('username')?.trim();
    const projectId = Number(queryMap.get('projectId') ?? 0);

    if (type === 'project') {
      this.chatType.set('project');
      if (projectId) {
        this.openProjectChat(projectId);
        return;
      }
    }

    if (type === 'direct') {
      this.chatType.set('direct');
      if (username) {
        this.createDirectChat(username);
        return;
      }
    }

    if (chatId) {
      const existing = this.chats().find((chat) => chat.id === chatId);
      if (existing) {
        this.selectChat(existing);
      }
    }
  }

  private async retrySocketAfterRefresh(chatId: number): Promise<void> {
    const refreshed = await firstValueFrom(
      this.auth.restoreSession().pipe(catchError(() => of(false))),
    );

    if (!refreshed) {
      this.pageError.set('Session expired. Please log in again.');
      return;
    }

    this.unauthorizedRetryChatId = null;
    await this.openSocket(chatId);
  }

  private async resolveAccessToken(): Promise<string | null> {
    const current = this.auth.accessToken();
    if (current) {
      return current;
    }

    const restored = await firstValueFrom(
      this.auth.restoreSession().pipe(catchError(() => of(false))),
    );

    if (!restored) {
      return null;
    }

    return this.auth.accessToken();
  }
}
