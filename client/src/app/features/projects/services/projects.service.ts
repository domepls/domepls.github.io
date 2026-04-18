import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments';

export interface ProjectUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  telegram_connected?: boolean;
}

export interface ProjectItem {
  id: number;
  name: string;
  description?: string;
  owner: ProjectUser;
  members: ProjectUser[];
  tasks_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectPayload {
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProjectsService {
  private readonly apiUrl = `${environment.apiUrl}/api`;

  constructor(private readonly http: HttpClient) {}

  listProjects(): Observable<ProjectItem[]> {
    return this.http.get<ProjectItem[]>(`${this.apiUrl}/projects/`, { withCredentials: true });
  }

  createProject(payload: ProjectPayload): Observable<ProjectItem> {
    return this.http.post<ProjectItem>(`${this.apiUrl}/projects/`, payload, {
      withCredentials: true,
    });
  }

  getProject(projectId: number): Observable<ProjectItem> {
    return this.http.get<ProjectItem>(`${this.apiUrl}/projects/${projectId}/`, {
      withCredentials: true,
    });
  }

  updateProject(projectId: number, payload: ProjectPayload): Observable<ProjectItem> {
    return this.http.patch<ProjectItem>(`${this.apiUrl}/projects/${projectId}/`, payload, {
      withCredentials: true,
    });
  }

  deleteProject(projectId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/projects/${projectId}/`, {
      withCredentials: true,
    });
  }

  inviteMember(projectId: number, username: string): Observable<ProjectItem> {
    return this.http.post<ProjectItem>(
      `${this.apiUrl}/projects/${projectId}/invite/`,
      { username },
      { withCredentials: true },
    );
  }

  searchInviteCandidates(query: string): Observable<ProjectUser[]> {
    return this.http.get<ProjectUser[]>(`${this.apiUrl}/projects/invite-candidates/`, {
      params: { username: query },
      withCredentials: true,
    });
  }
}
