import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface TaskFilters {
  scope: 'all' | 'project' | 'personal';
  status: 'all' | 'todo' | 'in_progress' | 'done' | 'approved' | 'cancelled';
  urgency: 'all' | 'low' | 'medium' | 'high' | 'critical';
  difficulty: 'all' | 'peaceful' | 'easy' | 'normal' | 'hard' | 'hardcore';
  mineOnly: boolean;
}

@Component({
  selector: 'app-task-filters-bar',

  imports: [CommonModule, FormsModule],
  templateUrl: './task-filters-bar.html',
  styleUrl: './task-filters-bar.scss',
})
export default class TaskFiltersBarComponent {
  @Input() filters!: TaskFilters;
  @Output() filtersChange = new EventEmitter<TaskFilters>();

  protected update<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]): void {
    this.filtersChange.emit({ ...this.filters, [key]: value });
  }

  protected selectToneClass(
    kind: 'scope' | 'status' | 'urgency' | 'difficulty',
    value: string | null | undefined,
  ): string {
    const normalized = value ?? 'all';
    return `task-filter-select--${kind}-${normalized}`;
  }
}
