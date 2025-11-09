// src/app/services/i18n/i18n.ts
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private t = inject(TranslateService);

  get current() { 
    return this.t.currentLang || this.t.defaultLang || 'es'; 
  }

  constructor() {
    // ✅ Configurar idiomas disponibles
    this.t.addLangs(['es', 'en']);
    this.t.setDefaultLang('es');
    
    // ✅ Inicializar desde localStorage al crear el servicio
    this.initFromStorage();
    
    console.log('[I18nService] Initialized with language:', this.current);
  }

  /**
   * Cambia el idioma y lo guarda en localStorage
   */
  use(lang: 'en' | 'es') {
    this.t.use(lang);
    localStorage.setItem('lang', lang);
    console.log('[I18nService] Language changed to:', lang);
  }

  /**
   * Inicializa el idioma desde localStorage o usa el del navegador
   */
  initFromStorage() {
    const saved = localStorage.getItem('lang');
    
    if (saved === 'en' || saved === 'es') {
      // Usar el idioma guardado
      this.t.use(saved);
      console.log('[I18nService] Using saved language:', saved);
    } else {
      // Usar idioma del navegador o español por defecto
      const browserLang = this.t.getBrowserLang();
      const langToUse = browserLang?.match(/es|en/) ? browserLang : 'es';
      this.t.use(langToUse);
      console.log('[I18nService] Using browser language:', langToUse);
    }
  }

  /**
   * Obtiene una traducción instantánea
   */
  instant(key: string, params?: any): string {
    return this.t.instant(key, params);
  }

  /**
   * Obtiene las traducciones disponibles
   */
  getLangs(): readonly string[] {
    return this.t.getLangs();
  }
}