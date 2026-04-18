import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import TaskCreateCardComponent from '../../components/task-create-card/task-create-card';
import TaskFiltersBarComponent, {
  TaskFilters,
} from '../../components/task-filters-bar/task-filters-bar';
import TaskListCardComponent from '../../components/task-list-card/task-list-card';
import {
  TaskCreatePayload,
  TaskItem,
  TaskStatus,
  TaskUpdatePayload,
  TasksService,
} from '../../services/tasks.service';
import { ProjectItem } from '../../../projects/services/projects.service';
import { ProjectsService } from '../../../projects/services/projects.service';

@Component({
  selector: 'app-tasks-page',

  imports: [CommonModule, TaskCreateCardComponent, TaskFiltersBarComponent, TaskListCardComponent],
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss',
})
export default class TasksPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly tasksService = inject(TasksService);
  private readonly projectsService = inject(ProjectsService);
  private readonly auth = inject(AuthService);

  protected readonly isLoading = signal(true);
  protected readonly isCreating = signal(false);
  protected readonly pageError = signal('');
  protected readonly createError = signal('');

  protected readonly projects = signal<ProjectItem[]>([]);
  protected readonly tasks = signal<TaskItem[]>([]);

  protected readonly filters = signal<TaskFilters>({
    scope: 'all',
    status: 'all',
    urgency: 'all',
    difficulty: 'all',
    mineOnly: false,
  });

  protected readonly filteredTasks = computed(() => {
    const filters = this.filters();
    const currentUserId = this.auth.currentUser()?.id ?? null;

    return this.tasks().filter((task) => {
      if (filters.scope !== 'all' && task.scope !== filters.scope) {
        return false;
      }
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }
      if (filters.urgency !== 'all' && task.urgency !== filters.urgency) {
        return false;
      }
      if (filters.difficulty !== 'all' && task.difficulty !== filters.difficulty) {
        return false;
      }
      if (filters.mineOnly && currentUserId) {
        return task.assigned_to?.id === currentUserId || task.created_by.id === currentUserId;
      }
      return true;
    });
  });

  protected readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  ngOnInit(): void {
    this.loadProjects();
    this.loadTasks();
  }

  protected onFiltersChange(nextFilters: TaskFilters): void {
    this.filters.set(nextFilters);
  }

  protected createTask(payload: TaskCreatePayload): void {
    this.isCreating.set(true);
    this.createError.set('');

    this.tasksService
      .createTask(payload)
      .pipe(
        finalize(() => this.isCreating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (task) => {
          this.tasks.set([task, ...this.tasks()]);
        },
        error: (error) => {
          this.createError.set(error?.error?.detail ?? 'Unable to create task.');
        },
      });
  }

  protected markDone(taskId: number): void {
    this.updateTask(taskId, { status: 'done' });
  }

  protected markInProgress(taskId: number): void {
    this.updateTask(taskId, { status: 'in_progress' });
  }

  protected approveTask(taskId: number): void {
    this.tasksService
      .approveTask(taskId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.replaceTask(updated);
        },
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to approve task.');
        },
      });
  }

  protected removeTask(taskId: number): void {
    this.tasksService
      .deleteTask(taskId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.tasks.set(this.tasks().filter((task) => task.id !== taskId));
        },
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to delete task.');
        },
      });
  }

  protected editTask(event: { taskId: number; payload: TaskUpdatePayload }): void {
    this.tasksService
      .updateTask(event.taskId, event.payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.replaceTask(updated);
        },
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to update task.');
        },
      });
  }

  private updateTask(taskId: number, payload: { status: TaskStatus }): void {
    this.tasksService
      .updateTask(taskId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.replaceTask(updated);
        },
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to update task.');
        },
      });
  }

  private replaceTask(updated: TaskItem): void {
    this.tasks.set(this.tasks().map((task) => (task.id === updated.id ? updated : task)));
  }

  private loadProjects(): void {
    this.projectsService
      .listProjects()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projects) => this.projects.set(projects),
        error: () => {},
      });
  }

  private loadTasks(): void {
    this.isLoading.set(true);
    this.pageError.set('');

    this.tasksService
      .listTasks()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (tasks) => {
          this.tasks.set(tasks);
        },
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to load tasks.');
        },
      });
  }
}
