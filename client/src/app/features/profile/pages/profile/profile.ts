import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../auth/services/auth.service';
import ProfileDangerCardComponent from '../../components/profile-danger-card/profile-danger-card';
import ProfileEditCardComponent from '../../components/profile-edit-card/profile-edit-card';
import ProfileIdentityCardComponent from '../../components/profile-identity-card/profile-identity-card';
import ProfileSecurityCardComponent from '../../components/profile-security-card/profile-security-card';
import { ProfileData, ProfileService, ProfileUpdatePayload } from '../../services/profile.service';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ProfileDangerCardComponent,
    ProfileEditCardComponent,
    ProfileIdentityCardComponent,
    ProfileSecurityCardComponent,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  encapsulation: ViewEncapsulation.None,
})
export default class Profile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly profile = signal<ProfileData | null>(null);
  protected readonly avatarPreview = signal<string | null>(null);
  protected readonly avatarFile = signal<File | null>(null);
  protected readonly hasChanges = signal(false);
  protected readonly isConnectingTelegram = signal(false);
  protected readonly telegramConnectErrorMessage = signal('');
  protected readonly twoFactorChallengeMessage = signal('');
  protected readonly showTwoFactorCode = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly deleteErrorMessage = signal('');
  protected readonly deleteChallengeMessage = signal('');
  protected readonly deletePassword = signal('');
  protected readonly deleteConfirm = signal('');
  protected readonly deleteTwoFactorCode = signal('');
  protected readonly isDeleteFinalStepVisible = signal(false);
  protected readonly deleteFinalAnswer = signal('');

  protected readonly canStartDeleteFlow = computed(() => {
    return (
      !this.isDeleting() &&
      this.deletePassword().trim().length > 0 &&
      this.deleteConfirm().trim().toUpperCase() === 'DELETE'
    );
  });

  protected readonly canPressDeleteButton = computed(() => {
    const profile = this.profile();
    if (profile?.two_factor_enabled && this.isDeleteFinalStepVisible()) {
      return (
        !this.isDeleting() &&
        this.deleteConfirm().trim().toUpperCase() === 'DELETE' &&
        this.deleteTwoFactorCode().trim().length > 0
      );
    }

    if (this.isDeleteFinalStepVisible()) {
      return !this.isDeleting();
    }

    return this.canStartDeleteFlow();
  });

  protected readonly achievementPlaceholders = computed(() => {
    return Array.from({ length: 3 }, (_, index) => index + 1);
  });

  protected readonly stats = computed(() => {
    const profile = this.profile();
    if (!profile) {
      return [];
    }

    return [
      { label: 'Points', value: String(profile.points ?? 0) },
      { label: 'Streak', value: `${profile.streak ?? 0} days` },
    ];
  });

  protected readonly profileForm = this.fb.group({
    username: ['', [Validators.maxLength(150)]],
    first_name: ['', [Validators.maxLength(150)]],
    last_name: ['', [Validators.maxLength(150)]],
    bio: ['', [Validators.maxLength(500)]],
    birth_date: [''],
    location: ['', [Validators.maxLength(100)]],
    website: ['', [Validators.maxLength(255)]],
    status: ['', [Validators.maxLength(255)]],
    two_factor_enabled: [false],
    two_factor_code: [''],
    current_password: [''],
    password: [''],
    password_confirm: [''],
  });

  constructor(
    private readonly profileService: ProfileService,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.loadProfile();

    this.profileForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.hasChanges.set(true);
    });
  }

  protected loadProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.profileService
      .getProfile()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.avatarPreview.set(profile.avatar ?? null);
          this.avatarFile.set(null);
          this.patchForm(profile);
          this.hasChanges.set(false);
          this.showTwoFactorCode.set(false);
          this.twoFactorChallengeMessage.set('');
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.detail ?? 'Unable to load profile.');
        },
      });
  }

  protected onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.avatarFile.set(file);
    this.hasChanges.set(true);

    if (!file) {
      const currentAvatar = this.profile()?.avatar ?? null;
      this.avatarPreview.set(currentAvatar);
      return;
    }

    this.avatarPreview.set(URL.createObjectURL(file));
  }

  protected connectTelegram(): void {
    if (this.isConnectingTelegram()) {
      return;
    }

    this.isConnectingTelegram.set(true);
    this.telegramConnectErrorMessage.set('');

    this.auth
      .beginTelegramAuth()
      .pipe(
        finalize(() => this.isConnectingTelegram.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.loadProfile();
        },
        error: (error) => {
          this.telegramConnectErrorMessage.set(
            error?.error?.detail ?? error?.message ?? 'Unable to connect Telegram.',
          );
        },
      });
  }

  protected resetForm(): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }

    this.patchForm(profile);
    this.avatarPreview.set(profile.avatar ?? null);
    this.avatarFile.set(null);
    this.resetDeleteState();
    this.telegramConnectErrorMessage.set('');
    this.twoFactorChallengeMessage.set('');
    this.showTwoFactorCode.set(false);
    this.profileForm.controls.two_factor_code.setValue('');
    this.hasChanges.set(false);
  }

  protected onTwoFactorCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.profileForm.controls.two_factor_code.setValue(input.value ?? '');
    this.twoFactorChallengeMessage.set('');
    this.errorMessage.set('');
  }

  protected onDeletePasswordInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.deletePassword.set(input.value ?? '');
    this.deleteErrorMessage.set('');
  }

  protected onDeleteConfirmInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.deleteConfirm.set(input.value ?? '');
    this.deleteErrorMessage.set('');
  }

  protected onDeleteTwoFactorCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.deleteTwoFactorCode.set(input.value ?? '');
    this.deleteErrorMessage.set('');
  }

  protected onDeleteFinalAnswerInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value ?? '';
    this.deleteFinalAnswer.set(value);
    this.deleteErrorMessage.set('');

    if (!this.profile()?.two_factor_enabled && value.trim().toLowerCase() === 'no') {
      this.resetDeleteState();
    }
  }

  protected deleteAccount(): void {
    const profile = this.profile();
    const requiresTwoFactorCode = Boolean(profile?.two_factor_enabled);

    if (!this.isDeleteFinalStepVisible()) {
      if (!this.canStartDeleteFlow()) {
        if (this.deleteConfirm().trim().toUpperCase() !== 'DELETE') {
          this.deleteErrorMessage.set('Type DELETE to confirm account removal.');
        } else {
          this.deleteErrorMessage.set('Current password is required to delete account.');
        }
        return;
      }

      if (requiresTwoFactorCode) {
        this.isDeleting.set(true);
        this.deleteErrorMessage.set('');
        this.deleteChallengeMessage.set('');

        this.profileService
          .deleteAccount(this.deletePassword())
          .pipe(
            finalize(() => this.isDeleting.set(false)),
            takeUntilDestroyed(this.destroyRef),
          )
          .subscribe({
            next: (response) => {
              if (response?.requires_2fa_code) {
                this.isDeleteFinalStepVisible.set(true);
                this.deleteTwoFactorCode.set('');
                this.deleteChallengeMessage.set(response.detail ?? 'Enter code sent your TG.');
                return;
              }

              this.resetDeleteState();
              this.auth.clearSession();
              this.router.navigateByUrl('/');
            },
            error: (error) => {
              this.deleteErrorMessage.set(this.extractErrorMessage(error));
            },
          });

        return;
      }

      this.isDeleteFinalStepVisible.set(true);
      this.deleteErrorMessage.set('');
      return;
    }

    if (requiresTwoFactorCode) {
      const otpCode = this.deleteTwoFactorCode().trim();
      if (!otpCode) {
        this.deleteErrorMessage.set('Enter code sent your TG.');
        return;
      }

      this.isDeleting.set(true);
      this.deleteErrorMessage.set('');

      this.profileService
        .deleteAccount(this.deletePassword(), otpCode)
        .pipe(
          finalize(() => this.isDeleting.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: () => {
            this.resetDeleteState();
            this.auth.clearSession();
            this.router.navigateByUrl('/');
          },
          error: (error) => {
            this.deleteErrorMessage.set(this.extractErrorMessage(error));
          },
        });

      return;
    }

    const finalAnswer = this.deleteFinalAnswer().trim().toLowerCase();
    if (finalAnswer === 'no') {
      this.resetDeleteState();
      return;
    }

    if (finalAnswer !== 'yes') {
      this.deleteErrorMessage.set('Type Yes to continue or No to cancel.');
      return;
    }

    if (!this.canStartDeleteFlow()) {
      if (this.deleteConfirm().trim().toUpperCase() !== 'DELETE') {
        this.deleteErrorMessage.set('Type DELETE to confirm account removal.');
      } else {
        this.deleteErrorMessage.set('Current password is required to delete account.');
      }
      return;
    }

    this.isDeleting.set(true);
    this.deleteErrorMessage.set('');

    this.profileService
      .deleteAccount(this.deletePassword())
      .pipe(
        finalize(() => this.isDeleting.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.resetDeleteState();
          this.auth.clearSession();
          this.router.navigateByUrl('/');
        },
        error: (error) => {
          this.deleteErrorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid || this.isSaving()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const values = this.profileForm.getRawValue();
    const username = values.username?.trim() ?? '';
    const currentPassword = values.current_password ?? '';
    const password = values.password ?? '';
    const passwordConfirm = values.password_confirm ?? '';
    const twoFactorCode = values.two_factor_code ?? '';
    const enablingTwoFactor =
      Boolean(values.two_factor_enabled) && !this.profile()?.two_factor_enabled;

    // Keep validation in sync with backend contract so the user gets instant feedback.
    if (currentPassword || password || passwordConfirm) {
      if (!currentPassword) {
        this.errorMessage.set('Current password is required to change password.');
        return;
      }

      if (!password) {
        this.errorMessage.set('New password is required.');
        return;
      }

      if (password !== passwordConfirm) {
        this.errorMessage.set('Passwords do not match.');
        return;
      }
    }

    const payload: ProfileUpdatePayload = {
      username,
      first_name: values.first_name ?? '',
      last_name: values.last_name ?? '',
      bio: values.bio ?? '',
      birth_date: values.birth_date ?? '',
      location: values.location ?? '',
      website: values.website ?? '',
      status: values.status ?? '',
      two_factor_enabled: Boolean(values.two_factor_enabled),
      current_password: currentPassword,
      password,
      password_confirm: passwordConfirm,
      two_factor_code: twoFactorCode,
      avatar: this.avatarFile(),
    };

    this.isSaving.set(true);
    this.errorMessage.set('');

    this.profileService
      .updateProfile(payload)
      .pipe(
        finalize(() => this.isSaving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (this.isProfileDataResponse(response)) {
            this.profile.set(response);
            this.avatarPreview.set(response.avatar ?? null);
            this.avatarFile.set(null);
            this.patchForm(response);
            this.profileForm.controls.two_factor_code.setValue('');
            this.twoFactorChallengeMessage.set('');
            this.showTwoFactorCode.set(false);
            this.hasChanges.set(false);
            if (enablingTwoFactor) {
              this.profileForm.controls.two_factor_enabled.setValue(true, { emitEvent: false });
            }
            this.auth.fetchCurrentUser().subscribe({
              error: () => {},
            });
            return;
          }

          this.twoFactorChallengeMessage.set(response.detail ?? 'Enter code sent your TG.');
          this.showTwoFactorCode.set(true);
          this.profileForm.controls.two_factor_code.setValue('');
          this.profileForm.controls.two_factor_code.markAsUntouched();
          this.hasChanges.set(true);
        },
        error: (error) => {
          this.errorMessage.set(this.extractErrorMessage(error));
        },
      });
  }

  protected onLogout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.auth.clearSession();
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.auth.clearSession();
        this.router.navigateByUrl('/login');
      },
    });
  }

  protected getAvatarLabel(): string {
    const profile = this.profile();
    if (!profile) {
      return 'User avatar';
    }

    const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
    return name ? `${name} avatar` : `${profile.username} avatar`;
  }

  protected getDisplayName(profile: ProfileData): string {
    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
    return fullName || profile.username;
  }

  protected formatLastSeen(value: string | null | undefined): string {
    if (!value) {
      return 'Unknown';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private extractErrorMessage(error: unknown): string {
    const fallback = 'Unable to save profile.';
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const maybeHttpError = error as { error?: unknown };
    const payload = maybeHttpError.error;
    if (!payload || typeof payload !== 'object') {
      return fallback;
    }

    const pickMessage = (source: Record<string, unknown>): string | null => {
      const preferredKeys = [
        'current_password',
        'password',
        'password_confirm',
        'username',
        'first_name',
        'last_name',
        'non_field_errors',
      ];

      for (const key of preferredKeys) {
        const value = source[key];
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
        if (Array.isArray(value) && typeof value[0] === 'string') {
          return value[0];
        }
      }

      for (const value of Object.values(source)) {
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
        if (Array.isArray(value) && typeof value[0] === 'string') {
          return value[0];
        }
      }

      return null;
    };

    const payloadRecord = payload as Record<string, unknown>;
    const nestedErrors = payloadRecord['errors'];
    if (nestedErrors && typeof nestedErrors === 'object') {
      const message = pickMessage(nestedErrors as Record<string, unknown>);
      if (message) {
        return message;
      }
    }

    const topLevelMessage = pickMessage(payloadRecord);
    if (topLevelMessage && !/^request failed\.?$/i.test(topLevelMessage.trim())) {
      return topLevelMessage;
    }

    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    return fallback;
  }

  private isProfileDataResponse(
    response: ProfileData | { detail: string; requires_2fa_code?: boolean },
  ): response is ProfileData {
    return Boolean(
      response && typeof response === 'object' && 'username' in response && 'avatar' in response,
    );
  }

  private patchForm(profile: ProfileData): void {
    this.profileForm.patchValue({
      username: profile.username ?? '',
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      bio: profile.bio ?? '',
      birth_date: profile.birth_date ?? '',
      location: profile.location ?? '',
      website: profile.website ?? '',
      status: profile.status ?? '',
      two_factor_enabled: profile.two_factor_enabled ?? false,
      two_factor_code: '',
      current_password: '',
      password: '',
      password_confirm: '',
    });
  }

  private resetDeleteState(): void {
    this.deleteErrorMessage.set('');
    this.deleteChallengeMessage.set('');
    this.deletePassword.set('');
    this.deleteConfirm.set('');
    this.deleteTwoFactorCode.set('');
    this.deleteFinalAnswer.set('');
    this.isDeleteFinalStepVisible.set(false);
  }
}
