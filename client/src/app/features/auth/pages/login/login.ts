import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthPageShell } from '../../components/auth-page-shell/auth-page-shell';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'login-page',

  imports: [ReactiveFormsModule, RouterLink, AuthPageShell],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export default class LoginPage {
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

    const { username, password } = this.form.getRawValue();

    this.auth.login(username, password).subscribe({
      next: () => {
        this.successMessage = 'Logged in successfully.';
        this.isSubmitting = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.detail ?? 'Unable to log in.';
        this.isSubmitting = false;
      },
    });
  }
}
