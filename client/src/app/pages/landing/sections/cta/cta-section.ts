import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'cta-section',

  imports: [RouterLink],
  templateUrl: './cta-section.html',
  styleUrl: './cta-section.scss',
})
export class CtaSection {}
