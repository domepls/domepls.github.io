import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProfileData } from '../../services/profile.service';

@Component({
  selector: 'app-profile-identity-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-identity-card.html',
  styleUrl: './profile-identity-card.scss',
})
export default class ProfileIdentityCardComponent {
  @Input() profile!: ProfileData;
  @Input() avatarPreview: string | null = null;
  @Input() avatarLabel = 'User avatar';
  @Input() displayName = '';
  @Input() stats: Array<{ label: string; value: string }> = [];
  @Input() achievementPlaceholders: number[] = [];
  @Input() isConnectingTelegram = false;
  @Input() telegramConnectErrorMessage = '';

  @Output() avatarChange = new EventEmitter<Event>();
  @Output() connectTelegram = new EventEmitter<void>();
}
