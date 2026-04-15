import { Component } from '@angular/core';
import { ThemeSwitcher } from '../../../../features/theme/components/theme-switcher/theme-switcher';

@Component({
  selector: 'landing-footer-section',
  imports: [ThemeSwitcher],
  templateUrl: './landing-footer-section.html',
  styleUrl: './landing-footer-section.css',
})
export class LandingFooterSection {
  protected onMascotError(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.display = 'none';
  }
}
