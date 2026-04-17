import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

interface MainNavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'main-sidebar',
  imports: [RouterModule],
  templateUrl: './main-sidebar.html',
  styleUrl: './main-sidebar.scss',
})
export class MainSidebar {
  protected readonly mainItems: MainNavItem[] = [
    {
      label: 'Dashboard',
      route: '/app/dashboard',
      icon: 'dashboard',
    },
    {
      label: 'Projects',
      route: '/app/projects',
      icon: 'folder',
    },
    {
      label: 'Tasks',
      route: '/app/tasks',
      icon: 'check_circle',
    },
    {
      label: 'Chats',
      route: '/app/chats',
      icon: 'chat_bubble',
    },
    {
      label: 'Friends',
      route: '/app/friends',
      icon: 'group',
    },
  ];
}
