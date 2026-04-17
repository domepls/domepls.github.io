import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MainHeader } from './components/main-header/main-header';
import { MainSidebar } from './components/main-sidebar/main-sidebar';

@Component({
  selector: 'main-layout',

  imports: [RouterModule, MainSidebar, MainHeader],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export default class MainLayout {}
