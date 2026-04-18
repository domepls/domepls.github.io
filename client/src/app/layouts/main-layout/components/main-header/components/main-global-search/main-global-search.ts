import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';

export interface HeaderSearchItem {
  id: string;
  title: string;
  subtitle: string;
  route: string;
}

export interface HeaderSearchSection {
  key: 'projects' | 'tasks' | 'users';
  title: string;
  items: HeaderSearchItem[];
}

@Component({
  selector: 'app-main-global-search',
  imports: [CommonModule],
  templateUrl: './main-global-search.html',
  styleUrl: './main-global-search.scss',
})
export class MainGlobalSearchComponent {
  readonly query = input('');
  readonly isOpen = input(false);
  readonly isLoading = input(false);
  readonly sections = input<HeaderSearchSection[]>([]);

  readonly queryChange = output<string>();
  readonly searchFocus = output<void>();
  readonly itemSelect = output<string>();
}
