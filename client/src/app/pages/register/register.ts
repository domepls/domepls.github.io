import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  protected email = '';
  protected username = '';
  protected password = '';
  protected passwordConfirm = '';
  protected error = '';
  protected isSubmitting = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  protected submit(): void {
    this.error = '';

    if (this.password !== this.passwordConfirm) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.isSubmitting = true;

    this.authService
      .register(this.username.trim(), this.email.trim(), this.password, this.passwordConfirm)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigateByUrl('/dashboard');
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.error = this.getErrorMessage(error);
        },
      });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    const backendError = error.error;

    if (typeof backendError?.detail === 'string') {
      return backendError.detail;
    }

    if (backendError && typeof backendError === 'object') {
      const firstError = Object.values(backendError)[0];

      if (Array.isArray(firstError)) {
        return String(firstError[0]);
      }

      if (typeof firstError === 'string') {
        return firstError;
      }
    }

    return 'Could not create your account. Please check the form.';
  }
}
