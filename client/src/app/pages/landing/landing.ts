import { Component } from '@angular/core';
import { CtaSection, FeaturesSection, HeroSection, TinyWinsSection } from './sections';

@Component({
  selector: 'landing-page',
  standalone: true,
  imports: [HeroSection, FeaturesSection, TinyWinsSection, CtaSection],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export default class Landing {}
