import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthPageShell } from '../../components/auth-page-shell/auth-page-shell';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'login-page',

  imports: [ReactiveFormsModule, RouterLink, AuthPageShell],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export default class LoginPage {
  protected isSubmitting = signal(false);
  protected isConnectingTelegram = signal(false);
  protected isWaitingForTwoFactor = signal(false);
  protected errorMessage = signal('');
  protected successMessage = signal('');

  readonly form;

  constructor(
    private readonly formBuilder: FormBuilder,
    protected readonly auth: AuthService,
    private readonly router: Router,
  ) {
    this.form = this.formBuilder.nonNullable.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      otpCode: [''],
    });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const otpCode = this.form.controls.otpCode.value.trim();
    if (this.isWaitingForTwoFactor() && !otpCode) {
      this.form.controls.otpCode.markAsTouched();
      this.errorMessage.set('Enter the code sent your TG.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { username, password } = this.form.getRawValue();

    this.auth
      .login(username, password, this.isWaitingForTwoFactor() ? otpCode : undefined)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.requires_2fa_code) {
            this.isWaitingForTwoFactor.set(true);
            this.form.controls.otpCode.setValidators([
              Validators.required,
              Validators.minLength(6),
              Validators.maxLength(6),
            ]);
            this.form.controls.otpCode.updateValueAndValidity({ emitEvent: false });
            this.form.controls.otpCode.setValue('');
            this.form.controls.otpCode.markAsUntouched();
            this.successMessage.set(response.detail ?? 'Enter code sent your TG.');
            return;
          }

          this.isWaitingForTwoFactor.set(false);
          this.form.controls.otpCode.clearValidators();
          this.form.controls.otpCode.setValue('');
          this.form.controls.otpCode.updateValueAndValidity({ emitEvent: false });

          if (this.auth.needsTelegramLink()) {
            this.successMessage.set('Logged in. Connect Telegram to unlock access.');
            return;
          }

          this.successMessage.set('Logged in successfully.');
          this.router.navigateByUrl('/app');
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.detail ?? 'Unable to log in.');
        },
      });
  }

  connectTelegram(): void {
    if (!this.auth.needsTelegramLink() || this.isConnectingTelegram()) {
      return;
    }

    this.isConnectingTelegram.set(true);
    this.errorMessage.set('');

    this.auth
      .beginTelegramAuth()
      .pipe(finalize(() => this.isConnectingTelegram.set(false)))
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
}
