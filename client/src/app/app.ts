import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ApiService } from './services/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HttpClientModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [ApiService],
})
export class App implements OnInit {
  protected readonly title = signal('DoMePls');
  protected message = signal<string>('Loading...');
  protected error = signal<string | null>(null);

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.apiService.getTestMessage().subscribe({
      next: (response) => {
        this.message.set(response.message);
      },
      error: (err) => {
        this.error.set('Failed to load message from backend');
        console.error(err);
      },
    });
  }
}
