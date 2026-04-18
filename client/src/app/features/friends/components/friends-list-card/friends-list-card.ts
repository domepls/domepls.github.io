import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { FriendUser } from '../../services/friends.service';

@Component({
  selector: 'app-friends-list-card',
  imports: [CommonModule],
  templateUrl: './friends-list-card.html',
  styleUrl: './friends-list-card.scss',
})
export class FriendsListCardComponent {
  readonly friends = input<FriendUser[]>([]);
  readonly openProfile = output<string>();
  readonly openChat = output<string>();
  readonly removeFriend = output<string>();

  protected readonly viewMode = signal<'list' | 'grid'>('list');

  displayName(friend: FriendUser): string {
    const fullName = [friend.first_name, friend.last_name]
      .filter((value) => Boolean(value))
      .join(' ')
      .trim();
    return fullName || `@${friend.username}`;
  }

  protected setViewMode(mode: 'list' | 'grid'): void {
    this.viewMode.set(mode);
  }
}
