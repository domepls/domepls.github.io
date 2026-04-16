import { Routes } from '@angular/router';

export const routes: Routes = [
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
