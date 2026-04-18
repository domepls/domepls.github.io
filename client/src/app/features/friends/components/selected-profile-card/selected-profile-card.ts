import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicProfile } from '../../services/friends.service';

@Component({
  selector: 'app-selected-profile-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './selected-profile-card.html',
  styleUrl: './selected-profile-card.scss',
})
export class SelectedProfileCardComponent {
  readonly profile = input<PublicProfile | null>(null);
}
