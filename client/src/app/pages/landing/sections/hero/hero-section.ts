import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'hero-section',

  imports: [RouterLink],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.scss',
})
export class HeroSection {
  protected onMascotError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }
}
