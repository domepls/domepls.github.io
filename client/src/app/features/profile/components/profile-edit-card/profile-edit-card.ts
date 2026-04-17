import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile-edit-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-edit-card.html',
  styleUrl: './profile-edit-card.scss',
})
export default class ProfileEditCardComponent {
  @Input() profileForm!: FormGroup;
}
