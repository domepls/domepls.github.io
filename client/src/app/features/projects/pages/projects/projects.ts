import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import ProjectCreateCardComponent from '../../components/project-create-card/project-create-card';
import ProjectListCardComponent from '../../components/project-list-card/project-list-card';
import { ProjectItem, ProjectsService } from '../../services/projects.service';
import { TaskItem, TasksService } from '../../../tasks/services/tasks.service';

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
  selector: 'app-projects-page',

  imports: [CommonModule, ProjectCreateCardComponent, ProjectListCardComponent],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export default class ProjectsPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectsService = inject(ProjectsService);
  private readonly tasksService = inject(TasksService);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(true);
  protected readonly isCreating = signal(false);

  protected readonly pageError = signal('');
  protected readonly createError = signal('');

  protected readonly projects = signal<ProjectItem[]>([]);
  protected readonly tasks = signal<TaskItem[]>([]);

  protected readonly projectStats = computed<Record<number, ProjectTaskStats>>(() => {
    const stats: Record<number, ProjectTaskStats> = {};

    for (const task of this.tasks()) {
      const projectId = task.project?.id;
      if (!projectId) {
        continue;
      }

      if (!stats[projectId]) {
        stats[projectId] = {
          projectId,
          total: 0,
          todo: 0,
          inProgress: 0,
          done: 0,
          approved: 0,
          cancelled: 0,
        };
      }

      stats[projectId].total += 1;
      if (task.status === 'todo') {
        stats[projectId].todo += 1;
      }
      if (task.status === 'in_progress') {
        stats[projectId].inProgress += 1;
      }
      if (task.status === 'done') {
        stats[projectId].done += 1;
      }
      if (task.status === 'approved') {
        stats[projectId].approved += 1;
      }
      if (task.status === 'cancelled') {
        stats[projectId].cancelled += 1;
      }
    }

    return stats;
  });

  protected readonly projectRows = computed(() => {
    const statsMap = this.projectStats();
    return this.projects().map((project) => ({
      project,
      stats: statsMap[project.id] ?? {
        projectId: project.id,
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        approved: 0,
        cancelled: 0,
      },
    }));
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadTasks();
  }

  protected loadProjects(): void {
    this.isLoading.set(true);
    this.pageError.set('');

    this.projectsService
      .listProjects()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (projects) => {
          this.projects.set(projects);
        },
        error: (error) => {
          this.pageError.set(error?.error?.detail ?? 'Unable to load projects.');
        },
      });
  }

  protected createProject(payload: { name: string; description: string }): void {
    this.isCreating.set(true);
    this.createError.set('');

    this.projectsService
      .createProject(payload)
      .pipe(
        finalize(() => this.isCreating.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (project) => {
          this.projects.set([project, ...this.projects()]);
          this.openProject(project.id);
        },
        error: (error) => {
          this.createError.set(error?.error?.detail ?? 'Unable to create project.');
        },
      });
  }

  protected openProject(projectId: number): void {
    this.router.navigate(['/app/projects', projectId]);
  }

  private loadTasks(): void {
    this.tasksService
      .listTasks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tasks) => {
          this.tasks.set(tasks);
        },
        error: () => {
          this.tasks.set([]);
        },
      });
  }
}
