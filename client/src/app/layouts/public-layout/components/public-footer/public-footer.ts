import { Component } from '@angular/core';
import { ThemeSwitcher } from '../../../../features/theme/components/theme-switcher/theme-switcher';

@Component({
  selector: 'public-footer',

  imports: [ThemeSwitcher],
  templateUrl: './public-footer.html',
  styleUrl: './public-footer.scss',
})
export class PublicFooter {
  protected onMascotError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }
}
