import { Component, ElementRef, HostListener, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../features/auth/services/auth.service';

@Component({
  selector: 'public-header',

  imports: [RouterLink],
  templateUrl: './public-header.html',
  styleUrl: './public-header.scss',
})
export class PublicHeader {
  protected isMenuOpen = false;
  protected readonly isConnecting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isLoggingOut = signal(false);

  constructor(
    public readonly auth: AuthService,
    private readonly host: ElementRef<HTMLElement>,
    private readonly router: Router,
  ) {}

  protected toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent) {
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

  onAvatarError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }

  protected onActionClick() {
    this.isMenuOpen = false;
  }

  protected onLogout() {
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

  onTgConnect() {
    if (this.isConnecting()) {
      return;
    }

    this.isConnecting.set(true);
    this.errorMessage.set('');

    this.auth
      .beginTelegramAuth()
      .pipe(finalize(() => this.isConnecting.set(false)))
      .subscribe({
        error: (error) => {
          this.errorMessage.set(
            error?.error?.detail ?? error?.message ?? 'Unable to connect Telegram.',
          );
        },
      });
  }
}
