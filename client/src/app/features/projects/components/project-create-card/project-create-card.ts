import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-project-create-card',

  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-create-card.html',
  styleUrl: './project-create-card.scss',
})
export default class ProjectCreateCardComponent {
  @Input() isBusy = false;
  @Input() errorMessage = '';

  @Output() createRequested = new EventEmitter<{ name: string; description: string }>();

  protected readonly form = new FormBuilder().group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(2000)]],
  });

  protected submit(): void {
    if (this.form.invalid || this.isBusy) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.createRequested.emit({
      name: value.name?.trim() ?? '',
      description: value.description?.trim() ?? '',
    });
  }
}
