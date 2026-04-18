import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { DashboardGamificationCardComponent } from '../../components/gamification-card/gamification-card';
import { DashboardKpiTileComponent } from '../../components/kpi-tile/kpi-tile';
import { DashboardProjectProgressCardComponent } from '../../components/project-progress-card/project-progress-card';
import { DashboardStatusDistributionCardComponent } from '../../components/status-distribution-card/status-distribution-card';
import { DashboardTaskListCardComponent } from '../../components/task-list-card/task-list-card';
import {
  DashboardListItem,
  DashboardProjectProgress,
  DashboardStatusSlice,
} from '../../models/dashboard.models';
import { AuthService } from '../../../auth/services/auth.service';
import { ProfileData, ProfileService } from '../../../profile/services/profile.service';
import { ProjectItem, ProjectsService } from '../../../projects/services/projects.service';
import { TaskItem, TaskStatus, TasksService } from '../../../tasks/services/tasks.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CommonModule,
    RouterLink,
    DashboardKpiTileComponent,
    DashboardGamificationCardComponent,
    DashboardStatusDistributionCardComponent,
    DashboardTaskListCardComponent,
    DashboardProjectProgressCardComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export default class DashboardPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly tasksService = inject(TasksService);
  private readonly projectsService = inject(ProjectsService);
  private readonly profileService = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly dateFormatter = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  protected readonly isLoading = signal(true);
  protected readonly pageError = signal('');

  protected readonly tasks = signal<TaskItem[]>([]);
  protected readonly projects = signal<ProjectItem[]>([]);
  protected readonly profile = signal<ProfileData | null>(null);
  protected readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  protected readonly totalTasks = computed(() => this.tasks().length);

  protected readonly todoTasks = computed(
    () => this.tasks().filter((task) => task.status === 'todo').length,
  );

  protected readonly inProgressTasks = computed(
    () => this.tasks().filter((task) => task.status === 'in_progress').length,
  );

  protected readonly doneTasks = computed(
    () =>
      this.tasks().filter((task) => task.status === 'done' || task.status === 'approved').length,
  );

  protected readonly pendingTasks = computed(() => this.todoTasks() + this.inProgressTasks());

  protected readonly overdueTasks = computed(() => {
    const now = Date.now();
    return this.tasks().filter((task) => {
      if (!task.deadline) {
        return false;
      }
      if (task.status === 'done' || task.status === 'approved' || task.status === 'cancelled') {
        return false;
      }
      const deadline = new Date(task.deadline).getTime();
      return !Number.isNaN(deadline) && deadline < now;
    }).length;
  });

  protected readonly approvalQueue = computed(
    () => this.tasks().filter((task) => task.scope === 'project' && task.status === 'done').length,
  );

  protected readonly completedLast7Days = computed(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.tasks().filter((task) => {
      if (!task.updated_at) {
        return false;
      }
      if (task.status !== 'done' && task.status !== 'approved') {
        return false;
      }
      const updatedAt = new Date(task.updated_at).getTime();
      return !Number.isNaN(updatedAt) && updatedAt >= cutoff;
    }).length;
  });

  protected readonly statusSlices = computed<DashboardStatusSlice[]>(() => {
    const all = this.tasks();
    const total = all.length || 1;

    const counts: Record<TaskStatus, number> = {
      todo: 0,
      in_progress: 0,
      done: 0,
      approved: 0,
      cancelled: 0,
    };

    for (const task of all) {
      counts[task.status] += 1;
    }

    const order: TaskStatus[] = ['todo', 'in_progress', 'done', 'approved', 'cancelled'];
    return order.map((status) => ({
      key: status,
      label: this.statusLabel(status),
      count: counts[status],
      percent: Math.round((counts[status] / total) * 100),
    }));
  });

  protected readonly upcomingDeadlines = computed(() => {
    const now = Date.now();

    return this.tasks()
      .filter((task) => {
        if (!task.deadline) {
          return false;
        }
        if (task.status === 'done' || task.status === 'approved' || task.status === 'cancelled') {
          return false;
        }

        const deadline = new Date(task.deadline).getTime();
        return !Number.isNaN(deadline) && deadline >= now;
      })
      .sort((a, b) => new Date(a.deadline ?? '').getTime() - new Date(b.deadline ?? '').getTime())
      .slice(0, 6);
  });

  protected readonly myActiveTasks = computed(() => {
    const userId = this.currentUserId();
    if (!userId) {
      return this.tasks()
        .filter((task) => task.status === 'todo' || task.status === 'in_progress')
        .slice(0, 6);
    }

    return this.tasks()
      .filter((task) => {
        if (task.status !== 'todo' && task.status !== 'in_progress') {
          return false;
        }
        return task.assigned_to?.id === userId;
      })
      .slice(0, 6);
  });

  protected readonly projectProgress = computed<DashboardProjectProgress[]>(() => {
    const rows: DashboardProjectProgress[] = [];

    for (const project of this.projects()) {
      const tasks = this.tasks().filter((task) => task.project?.id === project.id);
      const total = tasks.length;
      const completed = tasks.filter(
        (task) => task.status === 'approved' || task.status === 'done',
      ).length;
      const active = tasks.filter(
        (task) => task.status === 'todo' || task.status === 'in_progress',
      ).length;
      const percent = total ? Math.round((completed / total) * 100) : 0;

      rows.push({
        id: project.id,
        name: project.name,
        completed,
        total,
        percent,
        active,
      });
    }

    return rows.sort((a, b) => b.total - a.total).slice(0, 6);
  });

  protected readonly recentActivity = computed(() =>
    [...this.tasks()]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8),
  );

  protected readonly upcomingDeadlineItems = computed<DashboardListItem[]>(() =>
    this.upcomingDeadlines().map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: this.projectName(task),
      status: task.status,
      meta: task.deadline ? this.formatDate(task.deadline) : '',
    })),
  );

  protected readonly myActiveItems = computed<DashboardListItem[]>(() =>
    this.myActiveTasks().map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: this.projectName(task),
      status: task.status,
    })),
  );

  protected readonly recentActivityItems = computed<DashboardListItem[]>(() =>
    this.recentActivity().map((task) => ({
      id: task.id,
      title: task.title,
      subtitle: `Updated ${this.formatDate(task.updated_at)}`,
      status: task.status,
    })),
  );

  protected readonly points = computed(() => this.profile()?.points ?? 0);
  protected readonly streak = computed(() => this.profile()?.streak ?? 0);

  ngOnInit(): void {
    this.loadDashboard();
  }

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

  protected projectName(task: TaskItem): string {
    return task.project?.name ?? task.project_name ?? 'Personal';
  }

  private formatDate(raw: string): string {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return this.dateFormatter.format(date);
  }

  private loadDashboard(): void {
    this.isLoading.set(true);
    this.pageError.set('');

    forkJoin({
      tasks: this.tasksService.listTasks().pipe(catchError(() => of([] as TaskItem[]))),
      projects: this.projectsService.listProjects().pipe(catchError(() => of([] as ProjectItem[]))),
      profile: this.profileService
        .getProfile()
        .pipe(catchError(() => of(null as ProfileData | null))),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ tasks, projects, profile }) => {
          this.tasks.set(tasks);
          this.projects.set(projects);
          this.profile.set(profile);
        },
        error: () => {
          this.pageError.set('Unable to load dashboard right now.');
        },
      });
  }
}
