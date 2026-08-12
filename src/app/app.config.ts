/**
 * Configuración principal de la aplicación Angular
 * 
 * Este archivo define la configuración global de la aplicación incluyendo:
 * - Configuración del router para navegación
 * - Configuración de HTTP client con interceptores
 * - Configuración de internacionalización (i18n)
 * - Configuración de detección de cambios optimizada
 */
import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor'; // <- Interceptor FUNCIONAL

// Módulos para internacionalización
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';

// Loader personalizado para cargar traducciones desde el servidor
import { HttpTranslateLoader } from '../app/i18n/translate-loader';

// ECharts
import { provideEchartsCore } from 'ngx-echarts';

/**
 * Carga diferida de ECharts.
 *
 * Antes se importaba `echarts/core` y se llamaba a `echarts.use([...])` en el
 * cuerpo de este módulo, que forma parte del bundle inicial: toda la librería
 * viajaba en el arranque aunque los gráficos sólo aparecen en tres rutas
 * lazy (autoridad, revisiones mensuales y ventas). Con un factory async
 * ngx-echarts la pide recién cuando se monta el primer <div echarts>.
 */
async function loadEcharts() {
  const [core, charts, components, renderers] = await Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ]);

  core.use([
    charts.LineChart,
    charts.BarChart,
    charts.PieChart,
    components.TitleComponent,
    components.TooltipComponent,
    components.GridComponent,
    components.LegendComponent,
    renderers.CanvasRenderer,
  ]);

  return core;
}

/**
 * Factory function para crear el loader de traducciones personalizado
 * 
 * @param http - Instancia de HttpClient para realizar peticiones HTTP
 * @returns Instancia del loader personalizado para traducciones
 */
export function createTranslateLoader(http: HttpClient) {
  return new HttpTranslateLoader(http);
}

/**
 * Configuración principal de la aplicación
 * 
 * Define todos los providers necesarios para el funcionamiento de la aplicación:
 * - Router con lazy loading de componentes
 * - HTTP client con interceptor de autenticación
 * - Sistema de internacionalización con español como idioma por defecto
 * - Detección de cambios optimizada para mejor rendimiento
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Configuración optimizada de detección de cambios
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Configuración del router con lazy loading
    provideRouter(routes),

    // Configuración de HTTP client con interceptor de autenticación
    // IMPORTANTE: HttpClient debe estar disponible antes de TranslateModule
    provideHttpClient(
      withInterceptors([
        authInterceptor, // <- usa el interceptor funcional exportado desde ./interceptors/auth.interceptor
      ])
    ),

    // ECharts: se descarga sólo cuando una vista con gráficos lo necesita
    provideEchartsCore({ echarts: loadEcharts }),

    // Configuración del módulo de traducciones con loader personalizado
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'es', // Idioma por defecto: español
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient]
        }
      })
    )
  ]
};
