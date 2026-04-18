import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FriendsService, PublicProfile } from '../../services/friends.service';

@Component({
  selector: 'app-user-profile-page',
  imports: [CommonModule],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.scss',
})
export default class UserProfilePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly friendsService = inject(FriendsService);

  protected readonly profile = signal<PublicProfile | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');
  protected readonly friendActionError = signal('');
  protected readonly isSendingFriendRequest = signal(false);

  ngOnInit(): void {
    const username = this.route.snapshot.paramMap.get('username') ?? '';
    if (!username) {
      this.error.set('Username is required.');
      this.isLoading.set(false);
      return;
    }

    this.friendsService
      .getPublicProfile(username)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.error.set(error?.error?.detail ?? 'Unable to load profile.');
          this.isLoading.set(false);
        },
      });
  }

  protected sendFriendRequest(user: PublicProfile): void {
    if (
      this.isSendingFriendRequest() ||
      user.is_friend ||
      user.is_self ||
      user.outgoing_request_id
    ) {
      return;
    }

    this.friendActionError.set('');
    this.isSendingFriendRequest.set(true);

    this.friendsService
      .sendRequest(user.username)
      .pipe(
        finalize(() => this.isSendingFriendRequest.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (request) => {
          this.profile.update((prev) => {
            if (!prev) {
              return prev;
            }

            return {
              ...prev,
              outgoing_request_id: request.id,
            };
          });
        },
        error: (error) => {
          this.friendActionError.set(
            error?.error?.detail ?? 'Unable to send friend request right now.',
          );
        },
      });
  }

  protected displayName(user: PublicProfile): string {
    const fullName = [user.first_name, user.last_name]
      .filter((value) => Boolean(value))
      .join(' ')
      .trim();
    return fullName || `@${user.username}`;
  }

  protected readonlyValue(value?: string | null, fallback = 'Not provided'): string {
    const next = (value ?? '').trim();
    return next || fallback;
  }

  protected pointsValue(user: PublicProfile): string {
    return String(user.points ?? 0);
  }

  protected streakValue(user: PublicProfile): string {
    return `${user.streak ?? 0} days`;
  }

  protected earnedAchievementsCount(user: PublicProfile): string {
    const count = (user.achievements ?? []).filter((achievement) => achievement.earned).length;
    return String(count);
  }

  protected earnedAchievements(user: PublicProfile) {
    return (user.achievements ?? []).filter((achievement) => achievement.earned);
  }
}
