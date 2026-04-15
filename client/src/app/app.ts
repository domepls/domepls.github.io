import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './features/theme/services/theme.service';

@Component({
  selector: 'root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App implements OnInit {
  constructor(private readonly theme: ThemeService) {}

  ngOnInit() {
    this.theme.init();
  }
}
