import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FriendUser, FriendsService, FriendRequestsPayload } from '../../services/friends.service';
import { FriendRequestsCardComponent } from '../../components/friend-requests-card/friend-requests-card';
import { FriendsListCardComponent } from '../../components/friends-list-card/friends-list-card';
import { ChatsService } from '../../../chats/services/chats.service';

@Component({
  selector: 'app-friends-page',
  imports: [CommonModule, FriendRequestsCardComponent, FriendsListCardComponent],
  templateUrl: './friends.html',
  styleUrl: './friends.scss',
})
export default class FriendsPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly friendsService = inject(FriendsService);
  private readonly chatsService = inject(ChatsService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(true);
  protected readonly pageError = signal('');
  protected readonly friends = signal<FriendUser[]>([]);
  protected readonly requests = signal<FriendRequestsPayload>({ incoming: [], outgoing: [] });

  ngOnInit(): void {
    this.loadPage();
  }

  protected handleRequest(requestId: number, action: 'accept' | 'reject' | 'cancel'): void {
    this.friendsService
      .actionRequest(requestId, action)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadRequests();
          this.loadFriends();
        },
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to process request.');
        },
      });
  }

  protected removeFriend(username: string): void {
    const confirmed = window.confirm(`Remove @${username} from friends?`);
    if (!confirmed) {
      return;
    }

    this.friendsService
      .removeFriend(username)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadFriends(),
        error: (error) => this.pageError.set(error?.error?.detail ?? 'Unable to remove friend.'),
      });
  }

  protected openProfile(username: string): void {
    if (!username) {
      return;
    }

    this.router.navigate(['/app/users', username]);
  }

  protected openDirectChat(username: string): void {
    this.chatsService
      .startDirectChat(username)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chat) => {
          this.router.navigate(['/app/chats'], {
            queryParams: { chatId: chat.id, type: 'direct', username },
          });
        },
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to open direct chat.');
        },
      });
  }

  private loadPage(): void {
    this.isLoading.set(true);
    this.pageError.set('');

    this.friendsService
      .listFriends()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (friends) => this.friends.set(friends),
        error: () => this.pageError.set('Unable to load friends.'),
      });

    this.loadRequests();
  }

  private loadFriends(): void {
    this.friendsService
      .listFriends()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (friends) => this.friends.set(friends), error: () => {} });
  }

  private loadRequests(): void {
    this.friendsService
      .listRequests()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (payload) => this.requests.set(payload), error: () => {} });
  }
}
