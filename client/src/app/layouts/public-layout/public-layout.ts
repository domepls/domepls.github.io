import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PublicHeader } from './components/public-header/public-header';
import { PublicFooter } from './components/public-footer/public-footer';

@Component({
  selector: 'public-layout',

  imports: [RouterOutlet, PublicHeader, PublicFooter],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
})
export default class PublicLayout {}
