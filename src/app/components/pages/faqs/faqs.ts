import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-faqs',
  imports: [CommonModule, TranslateModule],
  templateUrl: './faqs.html',
  styleUrls: ['./faqs.scss'],
})
export class FaqsComponent {
  // Claves de FAQs
  faqKeys = ['howToStart', 'exportData', 'managePermissions', 'systemIntegration'];

  // Estados de apertura (todas cerradas inicialmente)
  openStates: Record<string, boolean> = {
    howToStart: false,
    exportData: false,
    managePermissions: false,
    systemIntegration: false,
  };

  toggle(key: string) {
    this.openStates[key] = !this.openStates[key];
  }

  keyToggle(key: string, ev: KeyboardEvent) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.toggle(key);
    }
  }

  private t = inject(TranslateService);
}