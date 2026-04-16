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
    });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { username, password } = this.form.getRawValue();

    this.auth
      .login(username, password)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          if (this.auth.needsTelegramLink()) {
            this.successMessage.set('Logged in. Connect Telegram to unlock access.');
            return;
          }

          this.successMessage.set('Logged in successfully.');
          this.router.navigateByUrl('/app');
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.detail ?? 'Unable to log in.');
          this.isSubmitting.set(false);
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
