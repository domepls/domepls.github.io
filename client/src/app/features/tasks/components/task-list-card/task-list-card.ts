import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  TaskDifficulty,
  TaskItem,
  TaskStatus,
  TaskUpdatePayload,
  TaskUrgency,
} from '../../services/tasks.service';

interface TaskEditDraft {
  title: string;
  description: string;
  status: TaskStatus;
  difficulty: TaskDifficulty;
  urgency: TaskUrgency;
  deadline: string;
}

type TaskListViewMode = 'list' | 'grid';

@Component({
  selector: 'app-task-list-card',
  imports: [CommonModule, FormsModule],
  templateUrl: './task-list-card.html',
  styleUrl: './task-list-card.scss',
})
export default class TaskListCardComponent {
  @Input() tasks: TaskItem[] = [];
  @Input() isLoading = false;
  @Input() currentUserId: number | null = null;

  @Output() updateRequested = new EventEmitter<{ taskId: number; payload: TaskUpdatePayload }>();
  @Output() markInProgress = new EventEmitter<number>();
  @Output() markDone = new EventEmitter<number>();
  @Output() approve = new EventEmitter<number>();
  @Output() remove = new EventEmitter<number>();

  protected readonly editingTaskId = signal<number | null>(null);
  protected readonly editDraft = signal<TaskEditDraft | null>(null);
  protected readonly viewMode = signal<TaskListViewMode>('list');

  protected setViewMode(mode: TaskListViewMode): void {
    this.viewMode.set(mode);
  }

  protected startEdit(task: TaskItem): void {
    this.editingTaskId.set(task.id);
    this.editDraft.set({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      difficulty: task.difficulty,
      urgency: task.urgency,
      deadline: this.toDateTimeLocalValue(task.deadline),
    });
  }

  protected cancelEdit(): void {
    this.editingTaskId.set(null);
    this.editDraft.set(null);
  }

  protected saveEdit(taskId: number): void {
    const draft = this.editDraft();
    if (!draft) {
      return;
    }

    this.updateRequested.emit({
      taskId,
      payload: {
        title: draft.title.trim(),
        description: draft.description.trim(),
        status: draft.status,
        difficulty: draft.difficulty,
        urgency: draft.urgency,
        deadline: draft.deadline.trim() ? draft.deadline : null,
      },
    });
    this.cancelEdit();
  }

  protected confirmRemove(taskId: number): void {
    const confirmed = window.confirm('Delete this task permanently?');
    if (!confirmed) {
      return;
    }
    this.remove.emit(taskId);
  }

  protected taskItemClass(status: string): string {
    return `task-item--status-${status}`;
  }

  protected scopeClass(scope: string): string {
    return `task-item__chip--scope-${scope}`;
  }

  protected statusClass(status: string): string {
    return `task-item__status--${status}`;
  }

  protected statusLabel(value: string): string {
    const labels: Record<string, string> = {
      todo: 'To do',
      in_progress: 'In progress',
      done: 'Done',
      approved: 'Approved',
      cancelled: 'Cancelled',
    };
    return labels[value] ?? value;
  }

  protected difficultyClass(difficulty: string): string {
    return `task-item__chip--difficulty-${difficulty}`;
  }

  protected urgencyClass(urgency: string): string {
    return `task-item__chip--urgency-${urgency}`;
  }

  protected scopeLabel(scope: string): string {
    if (scope === 'project') {
      return 'Project task';
    }
    if (scope === 'personal') {
      return 'Personal task';
    }
    return scope;
  }

  protected difficultyLabel(value: string): string {
    const labels: Record<string, string> = {
      peaceful: 'Peaceful',
      easy: 'Easy',
      normal: 'Normal',
      hard: 'Hard',
      hardcore: 'Hardcore',
    };
    return labels[value] ?? value;
  }

  protected urgencyLabel(value: string): string {
    const labels: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
    };
    return labels[value] ?? value;
  }

  protected selectToneClass(
    kind: 'status' | 'difficulty' | 'urgency',
    value: string | null | undefined,
  ): string {
    const normalized = value ?? '';
    return `task-select--${kind}-${normalized}`;
  }

  protected canTakeTask(task: TaskItem): boolean {
    return task.status === 'todo' && task.assigned_to?.id === this.currentUserId;
  }

  protected canMarkDone(task: TaskItem): boolean {
    return (
      task.status !== 'done' &&
      task.status !== 'approved' &&
      task.assigned_to?.id === this.currentUserId
    );
  }

  protected projectLabel(task: TaskItem): string {
    if (task.project && typeof task.project === 'object') {
      return task.project.name;
    }

    return task.project_name ?? '';
  }

  private toDateTimeLocalValue(raw: string | null | undefined): string {
    if (!raw) {
      return '';
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
