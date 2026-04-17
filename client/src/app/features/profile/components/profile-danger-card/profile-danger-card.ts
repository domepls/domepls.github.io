import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProfileData } from '../../services/profile.service';

@Component({
  selector: 'app-profile-danger-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-danger-card.html',
  styleUrl: './profile-danger-card.scss',
})
export default class ProfileDangerCardComponent {
  @Input() profile!: ProfileData;
  @Input() isDeleteFinalStepVisible = false;
  @Input() deleteErrorMessage = '';
  @Input() deleteChallengeMessage = '';
  @Input() deletePassword = '';
  @Input() deleteConfirm = '';
  @Input() deleteTwoFactorCode = '';
  @Input() deleteFinalAnswer = '';
  @Input() isDeleting = false;
  @Input() canPressDeleteButton = false;

  @Output() deletePasswordInput = new EventEmitter<Event>();
  @Output() deleteConfirmInput = new EventEmitter<Event>();
  @Output() deleteTwoFactorCodeInput = new EventEmitter<Event>();
  @Output() deleteFinalAnswerInput = new EventEmitter<Event>();
  @Output() deleteRequested = new EventEmitter<void>();
}
