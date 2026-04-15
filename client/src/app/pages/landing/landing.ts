import { Component } from '@angular/core';
import {
  CtaSection,
  FeaturesSection,
  HeroSection,
  LandingFooterSection,
  LandingHeaderSection,
  TinyWinsSection,
} from './sections';

@Component({
  selector: 'landing-page',
  imports: [
    LandingHeaderSection,
    HeroSection,
    FeaturesSection,
    TinyWinsSection,
    CtaSection,
    LandingFooterSection,
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export default class Landing {}
