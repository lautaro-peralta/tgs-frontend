/**
 * Componente raíz de la aplicación
 * 
 * Este componente es el punto de entrada principal de la aplicación Angular.
 * Se encarga de la inicialización de servicios críticos como autenticación
 * e internacionalización, y proporciona la estructura base de la aplicación.
 */
import { Component, OnInit, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth/auth';
import { I18nService } from './services/i18n/i18n';
import { NavbarComponent } from './components/navbar/navbar';
import { AuthTransitionService } from './services/ui/auth-transition';
import { FooterComponent } from './shared/footer/footer';
/**
 * Componente raíz de la aplicación
 * 
 * Configurado como standalone component, incluye:
 * - RouterOutlet para navegación entre rutas
 * - NavbarComponent para navegación global
 * - Inicialización de servicios críticos
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent,FooterComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class AppComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  readonly transition = inject(AuthTransitionService);

  /**
   * Inicialización del componente
   * 
   * Se ejecuta una sola vez al cargar la aplicación y se encarga de:
   * - Inicializar el servicio de autenticación para restaurar sesiones
   * - Configurar el idioma actual del sistema de internacionalización
   */
  ngOnInit(): void {
    console.log('[AppComponent] Initializing...');

    // I18nService ya se inicializa automáticamente en su constructor
    console.log('[AppComponent] Current language:', this.i18n.current);

    // Inicializar AuthService para restaurar sesión del usuario si existe
    this.auth.initialize();
  }
}
