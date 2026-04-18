import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-gamification-card',
  imports: [CommonModule],
  templateUrl: './gamification-card.html',
  styleUrl: './gamification-card.scss',
})
export class DashboardGamificationCardComponent {
  @Input() points = 0;
  @Input() streak = 0;
  @Input() completedLast7Days = 0;
  @Input() approvalQueue = 0;
}
