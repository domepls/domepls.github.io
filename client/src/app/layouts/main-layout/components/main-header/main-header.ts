import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { finalize, filter, map, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../features/auth/services/auth.service';
import { ThemeSwitcher } from '../../../../features/theme/components/theme-switcher/theme-switcher';

@Component({
  selector: 'main-header',
  imports: [RouterLink, ThemeSwitcher],
  templateUrl: './main-header.html',
  styleUrl: './main-header.scss',
})
export class MainHeader implements OnInit {
  protected readonly pageTitle = signal('Workspace');
  protected readonly isConnecting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isLoggingOut = signal(false);
  protected isMenuOpen = false;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public readonly auth: AuthService,
    private readonly host: ElementRef<HTMLElement>,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
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
  }

  protected toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isMenuOpen) {
      return;
    }

    const target = event.target as Node | null;
    if (!target || !this.host.nativeElement.contains(target)) {
      this.isMenuOpen = false;
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
  }

  protected onLogout(): void {
    this.isLoggingOut.set(true);
    this.auth.logout().subscribe({
      next: () => {
        this.auth.clearSession();
        this.isLoggingOut.set(false);
        this.onActionClick();
        this.router.navigateByUrl('/');
      },
      error: () => {
        this.auth.clearSession();
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
    };

    let cursor: ActivatedRoute | null = this.route;
    while (cursor?.firstChild) {
      cursor = cursor.firstChild;
    }

    const routePath = cursor?.snapshot.routeConfig?.path ?? '';
    return routeTitles[routePath] ?? 'Workspace';
  }
}
