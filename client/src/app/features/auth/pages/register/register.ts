import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthPageShell } from '../../components/auth-page-shell/auth-page-shell';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'register-page',

  imports: [ReactiveFormsModule, RouterLink, AuthPageShell],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export default class RegisterPage {
  protected isSubmitting = false;
  protected errorMessage = '';
  protected successMessage = '';
  readonly form;

  constructor(
    private readonly formBuilder: FormBuilder,
    protected readonly auth: AuthService,
  ) {
    this.form = this.formBuilder.nonNullable.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirm: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { username, password, passwordConfirm } = this.form.getRawValue();

    this.auth.register(username, password, passwordConfirm).subscribe({
      next: () => {
        this.successMessage = 'Account created. Connect Telegram to unlock access.';
        this.isSubmitting = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.detail ?? 'Unable to register.';
        this.isSubmitting = false;
      },
    });
  }
}
