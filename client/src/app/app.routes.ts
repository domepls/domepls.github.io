import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Profile } from './pages/profile/profile';
import { Projects } from './pages/projects/projects';
import { ProjectDetails } from './pages/project-details/project-details';
import { Tasks } from './pages/tasks/tasks';
import { TaskDetails } from './pages/task-details/task-details';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard },
  { path: 'profile', component: Profile },
  { path: 'projects', component: Projects },
  { path: 'projects/:id', component: ProjectDetails },
  { path: 'tasks', component: Tasks },
  { path: 'tasks/:id', component: TaskDetails },
  { path: '**', redirectTo: '' },
];
