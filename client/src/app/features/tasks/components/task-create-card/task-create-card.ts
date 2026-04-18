import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProjectItem, ProjectUser } from '../../../projects/services/projects.service';
import { AuthService } from '../../../auth/services/auth.service';
import {
  TaskCreatePayload,
  TaskDifficulty,
  TaskScope,
  TaskStatus,
  TaskUrgency,
} from '../../services/tasks.service';

@Component({
  selector: 'app-task-create-card',

  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-create-card.html',
  styleUrl: './task-create-card.scss',
})
export default class TaskCreateCardComponent implements OnChanges, OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  @Input() projects: ProjectItem[] = [];
  @Input() isBusy = false;
  @Input() errorMessage = '';

  @Output() createRequested = new EventEmitter<TaskCreatePayload>();

  protected readonly scopeOptions: TaskScope[] = ['project', 'personal'];
  protected readonly difficultyOptions: TaskDifficulty[] = [
    'peaceful',
    'easy',
    'normal',
    'hard',
    'hardcore',
  ];
  protected readonly urgencyOptions: TaskUrgency[] = ['low', 'medium', 'high', 'critical'];

  protected readonly form = new FormBuilder().group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(2000)]],
    scope: ['project' as TaskScope, [Validators.required]],
    difficulty: ['normal' as TaskDifficulty, [Validators.required]],
    urgency: ['medium' as TaskUrgency, [Validators.required]],
    deadline: [''],
    project: [null as number | null],
    assigned_to: [null as number | null],
  });

  protected readonly availableAssignees: ProjectUser[] = [];

  protected selectedProject(): ProjectItem | null {
    const projectId = this.form.controls.project.value;
    if (!projectId) {
      return null;
    }
    return this.projects.find((project) => project.id === Number(projectId)) ?? null;
  }

  protected assigneeOptions(): ProjectUser[] {
    return this.availableAssignees;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projects']) {
      this.refreshAssigneeOptions();
    }
  }

  private refreshAssigneeOptions(): void {
    const project = this.selectedProject();
    if (!project) {
      this.availableAssignees.splice(0, this.availableAssignees.length);
      return;
    }

    const users = [...project.members];
    if (!users.some((member) => member.id === project.owner.id)) {
      users.unshift(project.owner);
    }
    this.availableAssignees.splice(0, this.availableAssignees.length, ...users);
  }

  ngOnInit(): void {
    this.form.controls.project.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshAssigneeOptions();
        this.syncCurrentUserAsAssignee();
      });

    this.form.controls.scope.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshAssigneeOptions();
        this.syncCurrentUserAsAssignee();
      });

    this.refreshAssigneeOptions();
  }

  private syncCurrentUserAsAssignee(): void {
    const project = this.selectedProject();
    const currentUserId = this.auth.currentUser()?.id ?? null;

    if (!project || !currentUserId || this.form.controls.scope.value !== 'project') {
      return;
    }

    const currentAssignee = this.form.controls.assigned_to.value;
    if (currentAssignee == null) {
      this.form.controls.assigned_to.setValue(currentUserId, { emitEvent: false });
    }
  }

  protected selectToneClass(
    kind: 'scope' | 'difficulty' | 'urgency',
    value: string | null | undefined,
  ): string {
    const normalized = value ?? '';
    return `task-select--${kind}-${normalized}`;
  }

  protected submit(): void {
    if (this.form.invalid || this.isBusy) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const scope = raw.scope ?? 'project';
    const currentUserId = this.auth.currentUser()?.id ?? null;

    const projectId = raw.project != null ? Number(raw.project) : null;
    const selectedAssigneeId = raw.assigned_to != null ? Number(raw.assigned_to) : null;
    const assignedTo = scope === 'project' ? (selectedAssigneeId ?? currentUserId) : null;

    const payload: TaskCreatePayload = {
      title: raw.title?.trim() ?? '',
      description: raw.description?.trim() ?? '',
      scope,
      status: 'todo' as TaskStatus,
      difficulty: raw.difficulty ?? 'normal',
      urgency: raw.urgency ?? 'medium',
      deadline: raw.deadline?.trim() ? raw.deadline : undefined,
      project: scope === 'project' ? projectId : null,
      assigned_to: assignedTo,
    };

    this.createRequested.emit(payload);
  }
}
