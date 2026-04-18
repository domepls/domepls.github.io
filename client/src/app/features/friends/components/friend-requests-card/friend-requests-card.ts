import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { FriendRequestItem } from '../../services/friends.service';

@Component({
  selector: 'app-friend-requests-card',
  imports: [CommonModule],
  templateUrl: './friend-requests-card.html',
  styleUrl: './friend-requests-card.scss',
})
export class FriendRequestsCardComponent {
  readonly incoming = input<FriendRequestItem[]>([]);
  readonly outgoing = input<FriendRequestItem[]>([]);

  readonly requestAction = output<{ requestId: number; action: 'accept' | 'reject' | 'cancel' }>();

  readonly incomingCount = computed(() => this.incoming().length);
  readonly outgoingCount = computed(() => this.outgoing().length);

  displayName(username: string, firstName?: string, lastName?: string): string {
    const fullName = [firstName, lastName]
      .filter((value) => Boolean(value))
      .join(' ')
      .trim();
    return fullName || `@${username}`;
  }
}
