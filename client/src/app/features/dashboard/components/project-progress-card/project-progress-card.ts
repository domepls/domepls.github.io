import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardProjectProgress } from '../../models/dashboard.models';

@Component({
  selector: 'app-dashboard-project-progress-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './project-progress-card.html',
  styleUrl: './project-progress-card.scss',
})
export class DashboardProjectProgressCardComponent {
  @Input() rows: DashboardProjectProgress[] = [];
  @Input() emptyMessage = 'No projects to show yet.';
}
