import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'auth-page-shell',
  imports: [],
  templateUrl: './auth-page-shell.html',
  styleUrl: './auth-page-shell.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AuthPageShell implements OnInit {
  constructor(
    protected readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/');
    }
  }
}
