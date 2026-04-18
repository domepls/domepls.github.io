import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardListItem } from '../../models/dashboard.models';
import { TaskStatus } from '../../../tasks/services/tasks.service';

@Component({
  selector: 'app-dashboard-task-list-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './task-list-card.html',
  styleUrl: './task-list-card.scss',
})
export class DashboardTaskListCardComponent {
  @Input({ required: true }) title = '';
  @Input() linkLabel = '';
  @Input() linkTo = '/app/tasks';
  @Input() emptyMessage = 'No data.';
  @Input() items: DashboardListItem[] = [];

  protected statusLabel(value: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      todo: 'To do',
      in_progress: 'In progress',
      done: 'Done',
      approved: 'Approved',
      cancelled: 'Cancelled',
    };
    return labels[value];
  }

  protected chipClass(status: TaskStatus): string {
    return `dashboard-chip--status-${status}`;
  }
}
