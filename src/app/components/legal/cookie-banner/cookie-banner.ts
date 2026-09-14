// src/app/components/legal/cookie-banner/cookie-banner.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { logger } from '../../../core/logger';

const CONSENT_KEY = 'cookieConsent';

/**
 * Banner simple de consentimiento de cookies.
 *
 * No es un consent manager granular: este sitio no usa tracking de
 * terceros, solo localStorage funcional (sesión/auth, idioma, carrito,
 * caché de imágenes). El banner solo registra si el usuario aceptó o
 * rechazó, siguiendo el mismo patrón de lectura/escritura de
 * localStorage que I18nService usa para el idioma.
 */
@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './cookie-banner.html',
  styleUrls: ['./cookie-banner.scss'],
})
export class CookieBannerComponent {
  readonly visible = signal(false);

  constructor() {
    this.visible.set(!this.hasStoredConsent());
  }

  private hasStoredConsent(): boolean {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      return saved === 'accepted' || saved === 'declined';
    } catch {
      // localStorage puede no estar disponible (SSR, navegación privada estricta, etc.)
      return true;
    }
  }

  private storeConsent(value: 'accepted' | 'declined'): void {
    try {
      localStorage.setItem(CONSENT_KEY, value);
      logger.debug('[CookieBannerComponent] Consent stored:', value);
    } catch {
      // Si no se puede persistir, igual ocultamos el banner en esta sesión.
    }
  }

  accept(): void {
    this.storeConsent('accepted');
    this.visible.set(false);
  }

  decline(): void {
    this.storeConsent('declined');
    this.visible.set(false);
  }
}
