import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout'),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/profile/pages/profile/profile'),
      },
      {
        path: 'projects',
        loadComponent: () => import('./features/profile/pages/profile/profile'),
      },
      {
        path: 'tasks',
        loadComponent: () => import('./features/profile/pages/profile/profile'),
      },
      {
        path: 'chats',
        loadComponent: () => import('./features/profile/pages/profile/profile'),
      },
      {
        path: 'friends',
        loadComponent: () => import('./features/profile/pages/profile/profile'),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/pages/profile/profile'),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layouts/public-layout/public-layout'),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/landing/landing'),
      },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/pages/login/login'),
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/pages/register/register'),
      },
      {
        path: '**',
        loadComponent: () => import('./pages/not-found/not-found'),
      },
    ],
  },
];
