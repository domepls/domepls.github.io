import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ChatType } from '../../services/chats.service';

@Component({
  selector: 'app-chats-header',
  imports: [CommonModule],
  templateUrl: './chats-header.html',
  styleUrl: './chats-header.scss',
})
export class ChatsHeaderComponent {
  readonly activeType = input<ChatType>('direct');
  readonly typeChange = output<ChatType>();
}
