import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, of, Subject, switchMap } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import TaskListCardComponent from '../../../tasks/components/task-list-card/task-list-card';
import {
  TaskDifficulty,
  TaskItem,
  TaskStatus,
  TaskUpdatePayload,
  TaskUrgency,
  TasksService,
} from '../../../tasks/services/tasks.service';
import { ChatsService } from '../../../chats/services/chats.service';
import { ProjectItem, ProjectUser, ProjectsService } from '../../services/projects.service';

@Component({
  selector: 'app-project-detail-page',

  imports: [CommonModule, FormsModule, ReactiveFormsModule, TaskListCardComponent],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.scss',
})
export default class ProjectDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectsService = inject(ProjectsService);
  private readonly tasksService = inject(TasksService);
  private readonly chatsService = inject(ChatsService);
  private readonly auth = inject(AuthService);
  private readonly inviteSearch$ = new Subject<string>();

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isInviting = signal(false);
  protected readonly isSearchingUsers = signal(false);

  protected readonly pageError = signal('');
  protected readonly editError = signal('');
  protected readonly inviteError = signal('');

  protected readonly project = signal<ProjectItem | null>(null);
  protected readonly tasks = signal<TaskItem[]>([]);
  protected readonly inviteQuery = signal('');
  protected readonly inviteCandidates = signal<ProjectUser[]>([]);

  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal<'all' | TaskStatus>('all');
  protected readonly urgencyFilter = signal<'all' | TaskUrgency>('all');
  protected readonly difficultyFilter = signal<'all' | TaskDifficulty>('all');

  protected readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  protected readonly projectId = computed(() => {
    const idRaw = this.route.snapshot.paramMap.get('projectId');
    return Number(idRaw ?? 0);
  });

  protected readonly projectTasks = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const urgency = this.urgencyFilter();
    const difficulty = this.difficultyFilter();

    return this.tasks()
      .filter((task) => task.project?.id === this.projectId())
      .filter((task) => {
        if (status !== 'all' && task.status !== status) {
          return false;
        }
        if (urgency !== 'all' && task.urgency !== urgency) {
          return false;
        }
        if (difficulty !== 'all' && task.difficulty !== difficulty) {
          return false;
        }
        if (!query) {
          return true;
        }
        return (
          task.title.toLowerCase().includes(query) ||
          (task.description ?? '').toLowerCase().includes(query)
        );
      });
  });

  protected readonly editForm = new FormBuilder().group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    if (!this.projectId()) {
      this.router.navigate(['/app/projects']);
      return;
    }

    this.loadProject();
    this.loadTasks();

    this.inviteSearch$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query.trim() || query.trim().length < 2) {
            this.inviteCandidates.set([]);
            return of([]);
          }
          this.isSearchingUsers.set(true);
          return this.projectsService
            .searchInviteCandidates(query)
            .pipe(finalize(() => this.isSearchingUsers.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (users) => this.inviteCandidates.set(users),
        error: () => this.inviteError.set('Unable to search users right now.'),
      });
  }

  protected saveProject(): void {
    if (this.editForm.invalid || this.isSaving() || !this.project()) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.editError.set('');

    const value = this.editForm.getRawValue();
    this.projectsService
      .updateProject(this.projectId(), {
        name: value.name?.trim() ?? '',
        description: value.description?.trim() ?? '',
      })
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedProject) => {
          this.project.set(updatedProject);
          this.editForm.patchValue({
            name: updatedProject.name,
            description: updatedProject.description ?? '',
          });
        },
        error: (error) => {
          this.editError.set(error?.error?.detail ?? 'Unable to update project.');
        },
      });
  }

  protected deleteProject(): void {
    const confirmed = window.confirm('Delete this project and all its tasks?');
    if (!confirmed) {
      return;
    }

    this.projectsService
      .deleteProject(this.projectId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/app/projects']),
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to delete project.');
        },
      });
  }

  protected onInviteQueryChange(query: string): void {
    this.inviteQuery.set(query);
    this.inviteError.set('');
    this.inviteSearch$.next(query);
  }

  protected inviteByUsername(username: string): void {
    if (!this.project() || !username.trim()) {
      return;
    }

    this.isInviting.set(true);
    this.inviteError.set('');

    this.projectsService
      .inviteMember(this.projectId(), username.trim())
      .pipe(
        finalize(() => this.isInviting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updatedProject) => {
          this.project.set(updatedProject);
          this.inviteQuery.set('');
          this.inviteCandidates.set([]);
        },
        error: (error) => {
          this.inviteError.set(error?.error?.detail ?? 'Unable to invite this user.');
        },
      });
  }

  protected markDone(taskId: number): void {
    this.updateTask(taskId, { status: 'done' });
  }

  protected markInProgress(taskId: number): void {
    this.updateTask(taskId, { status: 'in_progress' });
  }

  protected editTask(event: { taskId: number; payload: TaskUpdatePayload }): void {
    this.tasksService
      .updateTask(event.taskId, event.payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedTask) => this.replaceTask(updatedTask),
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to update task.');
        },
      });
  }

  protected approveTask(taskId: number): void {
    this.tasksService
      .approveTask(taskId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedTask) => this.replaceTask(updatedTask),
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

  protected openProjectChat(): void {
    this.chatsService
      .openProjectChat(this.projectId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chat) => {
          this.router.navigate(['/app/chats'], {
            queryParams: {
              chatId: chat.id,
              type: 'project',
              projectId: this.projectId(),
            },
          });
        },
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to open project chat.');
        },
      });
  }

  private loadProject(): void {
    this.isLoading.set(true);
    this.pageError.set('');

    this.projectsService
      .getProject(this.projectId())
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (project) => {
          this.project.set(project);
          this.editForm.patchValue({
            name: project.name,
            description: project.description ?? '',
          });
        },
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to load project.');
        },
      });
  }

  private loadTasks(): void {
    this.tasksService
      .listTasks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tasks) => this.tasks.set(tasks),
        error: () => this.tasks.set([]),
      });
  }

  private updateTask(taskId: number, payload: { status: TaskStatus }): void {
    this.tasksService
      .updateTask(taskId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedTask) => this.replaceTask(updatedTask),
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to update task.');
        },
      });
  }

  private replaceTask(updatedTask: TaskItem): void {
    this.tasks.set(this.tasks().map((task) => (task.id === updatedTask.id ? updatedTask : task)));
  }
}
