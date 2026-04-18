import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { telegramLinkGuard } from './core/guards/telegram-link.guard';

export const routes: Routes = [
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout'),
    children: [
      {
        path: 'telegram-connect',
        loadComponent: () =>
          import('./layouts/main-layout/pages/telegram-connect/telegram-connect'),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        canActivate: [telegramLinkGuard],
        loadComponent: () => import('./features/dashboard/pages/dashboard/dashboard'),
      },
      {
        path: 'projects',
        canActivate: [telegramLinkGuard],
        loadComponent: () => import('./features/projects/pages/projects/projects'),
      },
      {
        path: 'projects/:projectId',
        canActivate: [telegramLinkGuard],
        loadComponent: () => import('./features/projects/pages/project-detail'),
      },
      {
        path: 'tasks',
        canActivate: [telegramLinkGuard],
        loadComponent: () => import('./features/tasks/pages/tasks/tasks'),
      },
      {
        path: 'chats',
        canActivate: [telegramLinkGuard],
        loadComponent: () => import('./features/chats/pages/chats/chats'),
      },
      {
        path: 'friends',
        canActivate: [telegramLinkGuard],
        loadComponent: () => import('./features/friends/pages/friends/friends'),
      },
      {
        path: 'users/:username',
        canActivate: [telegramLinkGuard],
        loadComponent: () => import('./features/friends/pages/user-profile/user-profile'),
      },
      {
        path: 'profile',
        canActivate: [telegramLinkGuard],
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
