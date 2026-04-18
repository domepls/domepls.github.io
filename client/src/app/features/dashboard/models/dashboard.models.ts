import { TaskStatus } from '../../tasks/services/tasks.service';

export interface DashboardStatusSlice {
  key: TaskStatus;
  label: string;
  count: number;
  percent: number;
}

export interface DashboardProjectProgress {
  id: number;
  name: string;
  completed: number;
  total: number;
  percent: number;
  active: number;
}

export interface DashboardListItem {
  id: number;
  title: string;
  subtitle: string;
  status: TaskStatus;
  meta?: string;
}
