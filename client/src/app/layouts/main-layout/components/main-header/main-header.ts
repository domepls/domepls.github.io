import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  forkJoin,
  firstValueFrom,
  map,
  of,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../features/auth/services/auth.service';
import {
  FriendsService,
  FriendUser,
  NotificationItem,
} from '../../../../features/friends/services/friends.service';
import {
  ProjectsService,
  ProjectItem,
} from '../../../../features/projects/services/projects.service';
import { TaskItem, TasksService } from '../../../../features/tasks/services/tasks.service';
import { ThemeSwitcher } from '../../../../features/theme/components/theme-switcher/theme-switcher';
import {
  HeaderSearchSection,
  MainGlobalSearchComponent,
} from './components/main-global-search/main-global-search';

@Component({
  selector: 'main-header',
  imports: [RouterLink, ThemeSwitcher, DatePipe, MainGlobalSearchComponent],
  templateUrl: './main-header.html',
  styleUrl: './main-header.scss',
})
export class MainHeader implements OnInit {
  protected readonly pageTitle = signal('Workspace');
  protected readonly isConnecting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isLoggingOut = signal(false);
  protected readonly notifications = signal<NotificationItem[]>([]);
  protected readonly unreadNotifications = signal(0);
  protected readonly isLoadingNotifications = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly searchSections = signal<HeaderSearchSection[]>([]);
  protected readonly isSearching = signal(false);
  protected isSearchOpen = false;
  protected isNotificationsOpen = false;
  protected isMenuOpen = false;

  private readonly search$ = new Subject<string>();
  private notificationSocket: WebSocket | null = null;
  private projectsCache: ProjectItem[] | null = null;
  private tasksCache: TaskItem[] | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public readonly auth: AuthService,
    private readonly friendsService: FriendsService,
    private readonly projectsService: ProjectsService,
    private readonly tasksService: TasksService,
    private readonly host: ElementRef<HTMLElement>,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        startWith(null),
        map(() => this.resolvePageTitle()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((title) => this.pageTitle.set(title));

    this.loadNotifications();
    void this.connectNotificationsSocket();

    this.search$
      .pipe(
        debounceTime(220),
        distinctUntilChanged(),
        switchMap((query) => this.performSearch(query)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((sections) => this.searchSections.set(sections));
  }

  ngOnDestroy(): void {
    this.closeNotificationsSocket();
  }

  protected onSearchQueryChange(value: string): void {
    this.searchQuery.set(value);
    const query = value.trim();

    if (query.length < 2) {
      this.searchSections.set([]);
      this.isSearching.set(false);
      this.isSearchOpen = query.length > 0;
      return;
    }

    this.isSearchOpen = true;
    this.search$.next(query);
  }

  protected openSearch(): void {
    this.isSearchOpen = true;
  }

  protected selectSearchItem(route: string): void {
    this.router.navigateByUrl(route);
    this.isSearchOpen = false;
    this.searchSections.set([]);
  }

  protected toggleMenu(): void {
    this.isNotificationsOpen = false;
    this.isMenuOpen = !this.isMenuOpen;
  }

  protected toggleNotifications(): void {
    this.isMenuOpen = false;
    this.isNotificationsOpen = !this.isNotificationsOpen;
    if (this.isNotificationsOpen) {
      this.loadNotifications();
    }
  }

  protected markAllNotificationsRead(): void {
    this.friendsService
      .markNotificationsRead()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.unreadNotifications.set(0);
          this.notifications.set(this.notifications().map((item) => ({ ...item, is_read: true })));
        },
        error: () => {},
      });
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isMenuOpen && !this.isNotificationsOpen && !this.isSearchOpen) {
      return;
    }

    const target = event.target as Node | null;
    if (!target || !this.host.nativeElement.contains(target)) {
      this.isMenuOpen = false;
      this.isNotificationsOpen = false;
      this.isSearchOpen = false;
    }
  }

  protected getUserDisplayName(): string {
    const user = this.auth.currentUser();
    if (!user) {
      return '';
    }

    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return fullName || user.username;
  }

  protected onAvatarError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }

  protected onActionClick(): void {
    this.isMenuOpen = false;
    this.isNotificationsOpen = false;
  }

  protected openNotificationLink(item: NotificationItem): void {
    const targetPath = item.data?.['target_path'];
    if (typeof targetPath === 'string' && targetPath.trim()) {
      this.router.navigateByUrl(targetPath.trim());
      this.onActionClick();
      return;
    }

    const profilePath = item.data?.['profile_path'];
    if (typeof profilePath === 'string' && profilePath.trim()) {
      this.router.navigateByUrl(profilePath.trim());
      this.onActionClick();
      return;
    }

    const chatIdRaw = item.data?.['chat_id'];
    if (typeof chatIdRaw === 'number' || typeof chatIdRaw === 'string') {
      this.router.navigate(['/app/chats'], { queryParams: { chatId: chatIdRaw } });
      this.onActionClick();
      return;
    }

    const username = item.data?.['username'];
    if (typeof username === 'string' && username.trim()) {
      this.router.navigate(['/app/users', username.trim()]);
      this.onActionClick();
      return;
    }

    const fromUsername = item.data?.['from_username'];
    if (typeof fromUsername === 'string' && fromUsername.trim()) {
      this.router.navigate(['/app/users', fromUsername.trim()]);
      this.onActionClick();
      return;
    }
    this.onActionClick();
  }

  protected onLogout(): void {
    this.isLoggingOut.set(true);
    this.auth.logout().subscribe({
      next: () => {
        this.auth.clearSession();
        this.closeNotificationsSocket();
        this.isLoggingOut.set(false);
        this.onActionClick();
        this.router.navigateByUrl('/');
      },
      error: () => {
        this.auth.clearSession();
        this.closeNotificationsSocket();
        this.isLoggingOut.set(false);
        this.onActionClick();
      },
    });
  }

  protected onTgConnect(): void {
    if (this.isConnecting()) {
      return;
    }

    this.isConnecting.set(true);
    this.errorMessage.set('');

    this.auth
      .beginTelegramAuth()
      .pipe(finalize(() => this.isConnecting.set(false)))
      .subscribe({
        next: () => {
          this.router.navigateByUrl('/app');
        },
        error: (error) => {
          this.errorMessage.set(
            error?.error?.detail ?? error?.message ?? 'Unable to connect Telegram.',
          );
        },
      });
  }

  private resolvePageTitle(): string {
    const routeTitles: Record<string, string> = {
      dashboard: 'Dashboard',
      profile: 'Profile',
      projects: 'Projects',
      tasks: 'Tasks',
      chats: 'Chats',
      friends: 'Friends',
      users: 'User Profile',
      'telegram-connect': 'Telegram',
    };

    const appPath = this.router.url
      .split('?')[0]
      .replace(/^\/app\/?/, '')
      .split('/')[0];
    return routeTitles[appPath] ?? 'Workspace';
  }

  private loadNotifications(): void {
    this.isLoadingNotifications.set(true);
    this.friendsService
      .listNotifications()
      .pipe(
        finalize(() => this.isLoadingNotifications.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (payload) => {
          this.notifications.set(payload.items);
          this.unreadNotifications.set(payload.unread_count);
        },
        error: () => {},
      });
  }

  private async connectNotificationsSocket(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    const token = this.auth.accessToken() ?? (await this.restoreAccessToken());
    if (!token) {
      return;
    }

    this.closeNotificationsSocket();
    const socket = new WebSocket(this.friendsService.notificationsWebsocketUrl(token));
    this.notificationSocket = socket;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          notification?: NotificationItem;
          unread_count?: number;
        };
        if (!payload.notification) {
          return;
        }

        const nextItems = [payload.notification, ...this.notifications()].slice(0, 30);
        this.notifications.set(nextItems);
        if (typeof payload.unread_count === 'number') {
          this.unreadNotifications.set(payload.unread_count);
        } else {
          this.unreadNotifications.set(this.unreadNotifications() + 1);
        }
      } catch {
        // Ignore malformed notification frames.
      }
    };

    socket.onclose = (event) => {
      if (event.code === 4401) {
        void this.reconnectNotificationsSocket();
      }
    };
  }

  private closeNotificationsSocket(): void {
    if (this.notificationSocket) {
      this.notificationSocket.close();
      this.notificationSocket = null;
    }
  }

  private async reconnectNotificationsSocket(): Promise<void> {
    const restored = await this.restoreAccessToken();
    if (!restored) {
      return;
    }

    await this.connectNotificationsSocket();
  }

  private async restoreAccessToken(): Promise<string | null> {
    const current = this.auth.accessToken();
    if (current) {
      return current;
    }

    const restored = await firstValueFrom(
      this.auth.restoreSession().pipe(catchError(() => of(false))),
    );

    return restored ? this.auth.accessToken() : null;
  }

  private performSearch(query: string) {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) {
      this.isSearching.set(false);
      return of([] as HeaderSearchSection[]);
    }

    this.isSearching.set(true);

    const projects$ = this.projectsCache
      ? of(this.projectsCache)
      : this.projectsService.listProjects().pipe(
          map((items) => {
            this.projectsCache = items;
            return items;
          }),
        );

    const tasks$ = this.tasksCache
      ? of(this.tasksCache)
      : this.tasksService.listTasks().pipe(
          map((items) => {
            this.tasksCache = items;
            return items;
          }),
        );

    const users$ = this.friendsService.searchUsers(normalized);

    return forkJoin({
      projects: projects$,
      tasks: tasks$,
      users: users$,
    }).pipe(
      map(({ projects, tasks, users }) => {
        const projectItems = projects
          .filter(
            (project) =>
              project.name.toLowerCase().includes(normalized) ||
              (project.description ?? '').toLowerCase().includes(normalized),
          )
          .slice(0, 3)
          .map((project) => ({
            id: `project-${project.id}`,
            title: project.name,
            subtitle: project.description || `Members: ${project.members.length}`,
            route: `/app/projects/${project.id}`,
          }));

        const taskItems = tasks
          .filter(
            (task) =>
              task.title.toLowerCase().includes(normalized) ||
              (task.description ?? '').toLowerCase().includes(normalized),
          )
          .slice(0, 3)
          .map((task) => ({
            id: `task-${task.id}`,
            title: task.title,
            subtitle: task.project?.name || task.scope,
            route: '/app/tasks',
          }));

        const userItems = users.slice(0, 3).map((user: FriendUser) => ({
          id: `user-${user.id}`,
          title:
            [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
            `@${user.username}`,
          subtitle: `@${user.username}`,
          route: `/app/users/${user.username}`,
        }));

        const sections: HeaderSearchSection[] = [];

        if (projectItems.length) {
          sections.push({ key: 'projects', title: 'Projects', items: projectItems });
        }

        if (taskItems.length) {
          sections.push({ key: 'tasks', title: 'Tasks', items: taskItems });
        }

        if (userItems.length) {
          sections.push({ key: 'users', title: 'Users', items: userItems });
        }

        return sections;
      }),
      catchError(() => of([] as HeaderSearchSection[])),
      finalize(() => this.isSearching.set(false)),
    );
  }
}
