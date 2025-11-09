/**
 * Punto de entrada principal de la aplicación Angular
 * 
 * Este archivo es responsable de inicializar la aplicación Angular con:
 * - La configuración principal definida en app.config.ts
 * - El componente raíz de la aplicación
 * - Manejo de errores durante el bootstrap
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

/**
 * Inicializa la aplicación Angular
 * 
 * Utiliza la nueva API de standalone components de Angular para bootstrapping
 * sin necesidad de módulos NgModule. La configuración incluye:
 * - Router con lazy loading
 * - HTTP client con interceptores
 * - Sistema de internacionalización
 * - Detección de cambios optimizada
 */
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));