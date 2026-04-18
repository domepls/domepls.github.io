import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FriendUser } from '../../services/friends.service';

@Component({
  selector: 'app-friends-search-card',
  imports: [CommonModule, FormsModule],
  templateUrl: './friends-search-card.html',
  styleUrl: './friends-search-card.scss',
})
export class FriendsSearchCardComponent {
  readonly query = input('');
  readonly users = input<FriendUser[]>([]);
  readonly isSearching = input(false);

  readonly queryChange = output<string>();
  readonly openProfile = output<string>();
  readonly addFriend = output<string>();
}
