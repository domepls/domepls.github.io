import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './features/auth/services/auth.service';
import { ThemeService } from './features/theme/services/theme.service';

@Component({
  selector: 'root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App implements OnInit {
  constructor(
    private readonly theme: ThemeService,
    private readonly auth: AuthService,
  ) {}

  ngOnInit() {
    this.theme.init();
    this.auth.restoreSession().subscribe();
  }
}
