import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { I18nService } from '../../services/i18n/i18n.js';

interface FooterLink {
  label: string;
  path?: string;
  external?: string;
  icon?: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss'],
})
export class FooterComponent {
  private i18n = inject(I18nService);

  readonly brand = 'GarrSYS';
  readonly currentYear = new Date().getFullYear();

  // Secciones del footer
  readonly sections: FooterSection[] = [
    {
      title: 'footer.sections.company',
      links: [
        { label: 'footer.links.about', path: '/sobre-nosotros' },
        { label: 'footer.links.contact', path: '/contactanos' },
        { label: 'footer.links.faqs', path: '/faqs' },
      ],
    },
    {
      title: 'footer.sections.legal',
      links: [
        { label: 'footer.links.terms', path: '/terminos' },
        { label: 'footer.links.privacy', path: '/privacidad' },
        { label: 'footer.links.cookies', path: '/cookies' },
      ],
    },
    {
      title: 'footer.sections.resources',
      links: [
        { label: 'footer.links.docs', external: 'https://github.com/lautaro-peralta' },
        { label: 'footer.links.api', external: 'https://github.com/lautaro-peralta' },
        { label: 'footer.links.support', path: '/contactanos' },
      ],
    },
  ];

  // Redes sociales
  readonly socialLinks = [
    {
      name: 'GitHub',
      icon: 'github',
      url: 'https://github.com/lautaro-peralta',
      ariaLabel: 'footer.social.github',
    },
    {
      name: 'Email',
      icon: 'email',
      url: 'mailto:thegarrisonsystem@gmail.com',
      ariaLabel: 'footer.social.email',
    },
  ];

  lang(): 'en' | 'es' {
    return (this.i18n.current as 'en' | 'es') || 'en';
  }

  trackByLabel(_index: number, item: FooterLink): string {
    return item.label;
  }

  trackBySection(_index: number, section: FooterSection): string {
    return section.title;
  }

  trackBySocial(_index: number, social: { name: string }): string {
    return social.name;
  }
}