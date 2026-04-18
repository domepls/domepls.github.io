import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments';
import { ProjectUser } from '../../projects/services/projects.service';

export type TaskScope = 'project' | 'personal';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'approved' | 'cancelled';
export type TaskDifficulty = 'peaceful' | 'easy' | 'normal' | 'hard' | 'hardcore';
export type TaskUrgency = 'low' | 'medium' | 'high' | 'critical';

export interface TaskProject {
  id: number;
  name: string;
}

export interface TaskItem {
  id: number;
  title: string;
  description?: string;
  scope: TaskScope;
  status: TaskStatus;
  difficulty: TaskDifficulty;
  urgency: TaskUrgency;
  deadline?: string | null;
  project?: TaskProject | null;
  project_name?: string | null;
  assigned_to?: ProjectUser | null;
  created_by: ProjectUser;
  assigned_by?: ProjectUser | null;
  points_awarded: number;
  completed_at?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreatePayload {
  title: string;
  description: string;
  scope: TaskScope;
  status: TaskStatus;
  difficulty: TaskDifficulty;
  urgency: TaskUrgency;
  deadline?: string;
  project?: number | null;
  assigned_to?: number | null;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  difficulty?: TaskDifficulty;
  urgency?: TaskUrgency;
  deadline?: string | null;
  assigned_to?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private readonly apiUrl = `${environment.apiUrl}/api`;

  constructor(private readonly http: HttpClient) {}

  listTasks(): Observable<TaskItem[]> {
    return this.http.get<TaskItem[]>(`${this.apiUrl}/tasks/`, { withCredentials: true });
  }

  createTask(payload: TaskCreatePayload): Observable<TaskItem> {
    return this.http.post<TaskItem>(`${this.apiUrl}/tasks/`, payload, { withCredentials: true });
  }

  getTask(taskId: number): Observable<TaskItem> {
    return this.http.get<TaskItem>(`${this.apiUrl}/tasks/${taskId}/`, { withCredentials: true });
  }

  updateTask(taskId: number, payload: TaskUpdatePayload): Observable<TaskItem> {
    return this.http.patch<TaskItem>(`${this.apiUrl}/tasks/${taskId}/`, payload, {
      withCredentials: true,
    });
  }

  approveTask(taskId: number): Observable<TaskItem> {
    return this.http.post<TaskItem>(
      `${this.apiUrl}/tasks/${taskId}/approve/`,
      {},
      { withCredentials: true },
    );
  }

  deleteTask(taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tasks/${taskId}/`, { withCredentials: true });
  }
}
