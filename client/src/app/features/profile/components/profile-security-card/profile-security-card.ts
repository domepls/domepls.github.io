import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { ProfileData } from '../../services/profile.service';

@Component({
  selector: 'app-profile-security-card',

  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-security-card.html',
  styleUrl: './profile-security-card.scss',
})
export default class ProfileSecurityCardComponent {
  @Input() profile!: ProfileData;
  @Input() profileForm!: FormGroup;
  @Input() twoFactorChallengeMessage = '';
  @Input() showTwoFactorCode = false;

  @Output() twoFactorCodeInput = new EventEmitter<Event>();
}
