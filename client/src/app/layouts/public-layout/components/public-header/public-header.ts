import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'public-header',

  imports: [RouterLink],
  templateUrl: './public-header.html',
  styleUrl: './public-header.scss',
})
export class PublicHeader {}
