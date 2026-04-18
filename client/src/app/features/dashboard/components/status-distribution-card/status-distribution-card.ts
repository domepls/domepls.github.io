import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DashboardStatusSlice } from '../../models/dashboard.models';

@Component({
  selector: 'app-dashboard-status-distribution-card',
  imports: [CommonModule],
  templateUrl: './status-distribution-card.html',
  styleUrl: './status-distribution-card.scss',
})
export class DashboardStatusDistributionCardComponent {
  @Input() slices: DashboardStatusSlice[] = [];

  protected barClass(status: string): string {
    return `dashboard-status__bar--${status}`;
  }
}
