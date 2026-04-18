import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-kpi-tile',
  imports: [CommonModule],
  templateUrl: './kpi-tile.html',
  styleUrl: './kpi-tile.scss',
})
export class DashboardKpiTileComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value = 0;
  @Input() tone: 'neutral' | 'success' | 'warning' | 'danger' = 'neutral';

  protected toneClass(): string {
    return `dashboard-kpi--${this.tone}`;
  }
}
