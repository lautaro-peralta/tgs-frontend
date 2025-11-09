import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

export interface LegalSection {
  title: string;
  content: string[];
  list?: string[];
}

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './legal-page.html',
  styleUrls: ['./legal-page.scss'],
})
export class LegalPageComponent {
  @Input() title = '';
  @Input() lastUpdated = '';
  @Input() sections: LegalSection[] = [];

  trackByTitle(_index: number, section: LegalSection): string {
    return section.title;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
