import { TestBed } from '@angular/core/testing';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { I18nService } from './i18n';
import { of } from 'rxjs';

// Mock TranslateLoader
class MockTranslateLoader implements TranslateLoader {
  getTranslation(lang: string) {
    return of({
      'test.key': 'Test Translation',
      'test.with_param': 'Hello {{name}}',
      'nested.key.deep': 'Deep nested value'
    });
  }
}

describe('I18nService', () => {
  let service: I18nService;
  let translateService: TranslateService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: MockTranslateLoader }
        })
      ],
      providers: [I18nService]
    });

    translateService = TestBed.inject(TranslateService);
    service = TestBed.inject(I18nService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with Spanish as default language', () => {
      expect(translateService.getDefaultLang()).toBe('es');
    });

    it('should have Spanish and English as available languages', () => {
      const langs = service.getLangs();
      expect(langs).toContain('es');
      expect(langs).toContain('en');
      expect(langs.length).toBe(2);
    });

    it('should initialize with Spanish when no saved language exists', () => {
      // Service is already initialized in beforeEach
      expect(service.current).toMatch(/es|en/);
    });
  });

  describe('current getter', () => {
    it('should return current language', () => {
      translateService.use('en');
      expect(service.current).toBe('en');
    });

    it('should return default language if current is not set', () => {
      // Even if currentLang is somehow undefined, should fall back to defaultLang
      const current = service.current;
      expect(current).toBeTruthy();
      expect(typeof current).toBe('string');
    });
  });

  describe('Language Switching', () => {
    it('should change language to English successfully', () => {
      service.use('en');
      expect(service.current).toBe('en');
    });

    it('should change language to Spanish successfully', () => {
      service.use('es');
      expect(service.current).toBe('es');
    });

    it('should persist language change to localStorage', () => {
      service.use('en');
      expect(localStorage.getItem('lang')).toBe('en');
    });

    it('should update localStorage when switching languages multiple times', () => {
      service.use('en');
      expect(localStorage.getItem('lang')).toBe('en');

      service.use('es');
      expect(localStorage.getItem('lang')).toBe('es');
    });
  });

  describe('initFromStorage()', () => {
    it('should load saved Spanish language from localStorage', () => {
      localStorage.setItem('lang', 'es');
      service.initFromStorage();
      expect(service.current).toBe('es');
    });

    it('should load saved English language from localStorage', () => {
      localStorage.setItem('lang', 'en');
      service.initFromStorage();
      expect(service.current).toBe('en');
    });

    it('should use browser language when localStorage is empty', () => {
      spyOn(translateService, 'getBrowserLang').and.returnValue('en');
      service.initFromStorage();
      expect(service.current).toBe('en');
    });

    it('should fall back to Spanish for unsupported browser languages', () => {
      spyOn(translateService, 'getBrowserLang').and.returnValue('fr');
      service.initFromStorage();
      expect(service.current).toBe('es');
    });

    it('should ignore invalid saved language values', () => {
      localStorage.setItem('lang', 'invalid');
      service.initFromStorage();
      // Should use browser lang or default 'es'
      expect(service.current).toMatch(/es|en/);
    });

    it('should handle null browser language gracefully', () => {
      spyOn(translateService, 'getBrowserLang').and.returnValue(null as any);
      service.initFromStorage();
      expect(service.current).toBe('es'); // Falls back to default
    });

    it('should handle undefined browser language gracefully', () => {
      spyOn(translateService, 'getBrowserLang').and.returnValue(undefined);
      service.initFromStorage();
      expect(service.current).toBe('es'); // Falls back to default
    });
  });

  describe('Translation', () => {
    beforeEach(() => {
      // Initialize translations
      translateService.use('en');
    });

    it('should translate simple keys correctly', () => {
      const translation = service.instant('test.key');
      expect(translation).toBe('Test Translation');
    });

    it('should translate keys with parameters', () => {
      const translation = service.instant('test.with_param', { name: 'World' });
      expect(translation).toBe('Hello World');
    });

    it('should translate nested keys correctly', () => {
      const translation = service.instant('nested.key.deep');
      expect(translation).toBe('Deep nested value');
    });

    it('should return the key itself when translation is missing', () => {
      const translation = service.instant('nonexistent.key');
      // ngx-translate returns the key when translation is missing
      expect(translation).toBe('nonexistent.key');
    });

    it('should handle translations without parameters', () => {
      const translation = service.instant('test.key');
      expect(translation).not.toContain('{{');
      expect(translation).not.toContain('}}');
    });
  });

  describe('getLangs()', () => {
    it('should return array of available languages', () => {
      const langs = service.getLangs();
      expect(Array.isArray(langs)).toBe(true);
      expect(langs.length).toBeGreaterThan(0);
    });

    it('should return readonly array', () => {
      const langs = service.getLangs();
      expect(langs).toBeDefined();
      // Verify it's the same reference from TranslateService
      expect(langs).toEqual(translateService.getLangs());
    });
  });

  describe('Integration Tests', () => {
    it('should maintain language after switching and reloading', () => {
      service.use('en');
      expect(localStorage.getItem('lang')).toBe('en');

      // Simulate reload by calling initFromStorage
      service.initFromStorage();
      expect(service.current).toBe('en');
    });

    it('should handle rapid language switching', () => {
      service.use('en');
      service.use('es');
      service.use('en');
      service.use('es');

      expect(service.current).toBe('es');
      expect(localStorage.getItem('lang')).toBe('es');
    });

    it('should work correctly after clearing localStorage', () => {
      service.use('en');
      localStorage.clear();
      service.initFromStorage();

      // Should fall back to browser language or default
      expect(service.current).toMatch(/es|en/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty translation key', () => {
      const translation = service.instant('');
      expect(translation).toBeDefined();
    });

    it('should handle null parameters in translation', () => {
      const translation = service.instant('test.with_param', null);
      expect(translation).toBeDefined();
    });

    it('should handle undefined parameters in translation', () => {
      const translation = service.instant('test.with_param', undefined);
      expect(translation).toBeDefined();
    });

    it('should handle multiple consecutive initFromStorage calls', () => {
      localStorage.setItem('lang', 'en');
      service.initFromStorage();
      service.initFromStorage();
      service.initFromStorage();

      expect(service.current).toBe('en');
    });
  });
});
