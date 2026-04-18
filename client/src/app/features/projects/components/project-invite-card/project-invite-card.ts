import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectItem, ProjectUser } from '../../services/projects.service';

@Component({
  selector: 'app-project-invite-card',

  imports: [CommonModule, FormsModule],
  templateUrl: './project-invite-card.html',
  styleUrl: './project-invite-card.scss',
})
export default class ProjectInviteCardComponent {
  @Input() selectedProject: ProjectItem | null = null;
  @Input() candidates: ProjectUser[] = [];
  @Input() inviteQuery = '';
  @Input() isSearching = false;
  @Input() isInviting = false;
  @Input() errorMessage = '';

  @Output() inviteQueryChange = new EventEmitter<string>();
  @Output() inviteRequested = new EventEmitter<string>();
}
