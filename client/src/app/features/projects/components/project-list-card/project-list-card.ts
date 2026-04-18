import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ProjectItem } from '../../services/projects.service';

interface ProjectTaskStats {
  projectId: number;
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  approved: number;
  cancelled: number;
}

@Component({
  selector: 'app-project-list-card',

  imports: [CommonModule],
  templateUrl: './project-list-card.html',
  styleUrl: './project-list-card.scss',
})
export default class ProjectListCardComponent {
  @Input() projects: ProjectItem[] = [];
  @Input() statsMap: Record<number, ProjectTaskStats> = {};
  @Input() isLoading = false;

  @Output() openRequested = new EventEmitter<number>();

  protected readonly viewMode = signal<'list' | 'grid'>('list');

  protected setViewMode(mode: 'list' | 'grid'): void {
    this.viewMode.set(mode);
  }
}
