import { Component, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LegalPageComponent, LegalSection } from './legal-page.js';

@Component({
  selector: 'app-cookies',
  standalone: true,
  imports: [LegalPageComponent, TranslateModule],
  template: `
    <app-legal-page
      [title]="'legal.cookies.title' | translate"
      [lastUpdated]="'legal.lastUpdatedDate' | translate"
      [sections]="sections">
    </app-legal-page>
  `,
})
export class CookiesComponent {
  private translate = inject(TranslateService);

  sections: LegalSection[] = [];

  constructor() {
    this.loadSections();
    this.translate.onLangChange.subscribe(() => this.loadSections());
  }

  private loadSections() {
    const sectionKeys = ['what', 'technologies', 'purpose', 'types', 'management', 'security', 'thirdParty', 'disable', 'updates'];

    this.sections = sectionKeys.map(key => {
      const section = this.translate.instant(`legal.cookies.sections.${key}`);
      return {
        title: section.title,
        content: section.content || [],
        list: section.list
      };
    });
  }
}
