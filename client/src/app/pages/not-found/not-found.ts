import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export default class NotFound {
  protected onMascotError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }
}
