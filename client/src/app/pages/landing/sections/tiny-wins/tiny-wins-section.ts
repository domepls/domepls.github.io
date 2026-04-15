import { Component } from '@angular/core';

@Component({
  selector: 'tiny-wins-section',

  imports: [],
  templateUrl: './tiny-wins-section.html',
  styleUrl: './tiny-wins-section.css',
})
export class TinyWinsSection {
  protected onMascotError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }
}
