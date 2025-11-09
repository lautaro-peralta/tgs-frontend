import { Component, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LegalPageComponent, LegalSection } from './legal-page.js';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [LegalPageComponent, TranslateModule],
  template: `
    <app-legal-page
      [title]="'legal.privacy.title' | translate"
      [lastUpdated]="'legal.lastUpdatedDate' | translate"
      [sections]="sections">
    </app-legal-page>
  `,
})
export class PrivacyComponent {
  private translate = inject(TranslateService);

  sections: LegalSection[] = [];

  constructor() {
    this.loadSections();
    this.translate.onLangChange.subscribe(() => this.loadSections());
  }

  private loadSections() {
    const sectionKeys = ['information', 'usage', 'protection', 'sharing', 'retention', 'rights', 'cookies', 'changes'];

    this.sections = sectionKeys.map(key => {
      const section = this.translate.instant(`legal.privacy.sections.${key}`);
      return {
        title: section.title,
        content: section.content || [],
        list: section.list
      };
    });
  }
}
