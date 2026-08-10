# 02 — Arquitectura de la Aplicación

## Principios de Diseño

La aplicación sigue tres principios arquitectónicos centrales:

**Componentes standalone**: No existen `NgModule`. Cada componente declara sus propias dependencias en el array `imports` del decorador `@Component`, lo que elimina el boilerplate de módulos y mejora el tree-shaking del bundle final.

**Lazy loading por ruta**: Todas las vistas se cargan bajo demanda mediante `loadComponent()`. El bundle inicial descargado por el usuario es mínimo; cada segmento de código se solicita únicamente cuando se navega a la ruta correspondiente.

**Estado reactivo con Signals**: El estado compartido (sesión, carrito) se gestiona mediante Angular Signals en lugar de `BehaviorSubject`. Los `computed()` derivan automáticamente valores del estado sin necesidad de suscripciones manuales.

---

## Estructura de Directorios

```
src/
├── app/
│   ├── app.config.ts              # Registro centralizado de providers globales
│   ├── app.routes.ts              # Árbol de rutas con lazy loading
│   ├── app.ts / app.html          # Componente raíz (<router-outlet>)
│   │
│   ├── components/                # Vistas principales de la aplicación
│   │   ├── home/                  # Landing page (login/registro integrado)
│   │   ├── navbar/                # Navegación global persistente
│   │   ├── auth/                  # Flujos de autenticación (forgot/reset password)
│   │   ├── account/               # Perfil y configuración del usuario
│   │   ├── admin/                 # Panel de administración del sistema
│   │   ├── store/                 # Catálogo de productos (tienda)
│   │   ├── checkout/              # Proceso de compra
│   │   ├── my-purchases/          # Historial de compras
│   │   ├── product/               # CRUD de productos (roles internos)
│   │   ├── client/                # Gestión de clientes
│   │   ├── distributor/           # Gestión de distribuidores
│   │   ├── authority/             # Gestión de autoridades
│   │   ├── bribe/                 # Gestión de sobornos
│   │   ├── sale/                  # Gestión de ventas
│   │   ├── zone/                  # Gestión de zonas geográficas
│   │   ├── partner/               # Gestión de socios
│   │   ├── shelby-council/        # Consejo Shelby
│   │   ├── clandestine-agreement/ # Acuerdos clandestinos
│   │   ├── monthly-review/        # Revisiones mensuales
│   │   ├── decision/              # Decisiones del consejo
│   │   ├── topic/                 # Temáticas
│   │   ├── chart/                 # Componente de visualización de datos
│   │   ├── pages/                 # Páginas informativas (about, faqs, contacto)
│   │   ├── legal/                 # Páginas legales (términos, privacidad, cookies)
│   │   └── errors/                # Páginas de error (forbidden)
│   │
│   ├── features/                  # Módulos funcionales autocontenidos
│   │   └── inbox/                 # Sistema de inbox y notificaciones
│   │       ├── components/
│   │       │   ├── notifications/ # Componentes de notificaciones
│   │       │   └── role-requests/ # Solicitudes de rol (vistas user y admin)
│   │       ├── email-verification/
│   │       ├── models/            # Interfaces propias del inbox
│   │       ├── pages/             # InboxPageComponent (orquestador)
│   │       └── services/          # Servicios propios del inbox
│   │
│   ├── guards/
│   │   └── auth.guard.ts          # authGuard, roleGuard, guestGuard, inboxGuard
│   │
│   ├── i18n/
│   │   └── translate-loader.ts    # Loader HTTP personalizado para ngx-translate
│   │
│   ├── interceptors/
│   │   └── auth.interceptor.ts    # Manejo de errores 401 y refresh automático
│   │
│   ├── models/                    # Tipos e interfaces compartidos entre capas
│   │   ├── user/user.model.ts     # User, Role, PersonInfo
│   │   └── product/product.model.ts
│   │
│   ├── services/                  # Servicios de dominio (comunicación con API)
│   │   ├── auth/                  # AuthService + VerifyEmailService
│   │   ├── user/                  # UserService
│   │   ├── admin/                 # AdminService
│   │   ├── product/               # ProductService
│   │   ├── sale/                  # SaleService
│   │   ├── cart/                  # CartService (estado local + localStorage)
│   │   ├── client/                # ClientService
│   │   ├── distributor/           # DistributorService
│   │   ├── authority/             # AuthorityService
│   │   ├── bribe/                 # BribeService
│   │   ├── partner/               # PartnerService
│   │   ├── zone/                  # ZoneService
│   │   ├── stats/                 # StatsService
│   │   ├── monthly-review/        # MonthlyReviewService
│   │   ├── clandestine-agreement/
│   │   ├── decision/
│   │   ├── shelby-council/
│   │   ├── topic/
│   │   ├── product-image/         # Upload de imágenes de productos
│   │   ├── password-reset/        # Flujo de recuperación de contraseña
│   │   ├── i18n/                  # I18nService (wrapper de TranslateService)
│   │   └── ui/                    # AuthTransitionService (animaciones GSAP)
│   │
│   ├── shared/                    # Componentes y utilidades reutilizables
│   │   ├── footer/                # Footer global
│   │   └── ui/
│   │       └── glass-panel/       # GlassPanelComponent (efecto glassmorphism)
│   │
│   └── styles/
│       └── _responsive.scss       # Breakpoints y mixins de responsive design
│
├── assets/
│   ├── i18n/
│   │   ├── es.json                # Strings en español (~82KB)
│   │   └── en.json                # Strings en inglés (~85KB)
│   └── [imágenes y SVGs del sistema]
│
├── styles.scss                    # Estilos globales + CSS custom properties del tema
├── index.html                     # HTML raíz de la SPA
└── main.ts                        # Bootstrap de la aplicación
```

---

## Capas de la Aplicación

La aplicación se organiza en capas con responsabilidades bien definidas:

```
┌─────────────────────────────────────────────┐
│                  Templates                  │  Presentación HTML
├─────────────────────────────────────────────┤
│                 Componentes                 │  Lógica de UI y estado local
├──────────────────────┬──────────────────────┤
│       Guards         │     Interceptores    │  Seguridad y HTTP transversal
├──────────────────────┴──────────────────────┤
│                  Servicios                  │  Lógica de negocio + API calls
├─────────────────────────────────────────────┤
│                   Modelos                   │  Tipos e interfaces TypeScript
└─────────────────────────────────────────────┘
```

| Capa | Responsabilidad | Patrón |
|------|----------------|--------|
| **Componentes** | Presentación, manejo de eventos, estado local de UI | Standalone, OnPush |
| **Servicios** | Comunicación con la API REST, transformación de datos, estado global | `providedIn: 'root'`, Signals |
| **Guards** | Protección de rutas según estado de autenticación y roles | `CanActivateFn` funcional |
| **Interceptores** | Comportamiento transversal a todas las peticiones HTTP | `HttpInterceptorFn` funcional |
| **Modelos** | Contratos de datos compartidos entre servicios y componentes | Interfaces TypeScript |
| **Shared** | Componentes visuales reutilizables sin lógica de dominio | Standalone puro |
| **Features** | Funcionalidad vertical autocontenida (inbox) con sus propios servicios y modelos | Feature module sin NgModule |

---

## Configuración Global (`app.config.ts`)

Todos los providers de la aplicación se registran en un único punto:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    // Optimización de change detection (agrupa eventos del browser)
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Router con árbol de rutas completo (lazy loading)
    provideRouter(routes),

    // HttpClient con interceptor funcional de autenticación
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),

    // ECharts registrado con solo los módulos necesarios (tree-shaking)
    provideEchartsCore({ echarts }),

    // ngx-translate con español como idioma por defecto
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'es',
        loader: { provide: TranslateLoader, useFactory: createTranslateLoader, deps: [HttpClient] }
      })
    )
  ]
};
```

El registro selectivo de módulos de ECharts (`LineChart`, `BarChart`, `PieChart`, etc.) evita incluir la librería completa en el bundle, reduciendo significativamente el tamaño del artefacto final.

---

## Lazy Loading de Componentes

El router carga cada componente de forma deferida mediante importaciones dinámicas:

```typescript
{
  path: 'admin',
  loadComponent: () =>
    import('./components/admin/admin.js').then(m => m.AdminComponent),
  canActivate: [authGuard, roleGuard([Role.ADMIN])]
}
```

Angular genera un chunk separado por cada `loadComponent()`. El navegador descarga ese chunk únicamente cuando el usuario navega a esa ruta por primera vez. Las rutas frecuentes (home, store, mi-cuenta) tienen prioridad natural al ser las primeras visitadas.

---

## Estado Reactivo con Angular Signals

Los servicios que manejan estado global —`AuthService` y `CartService`— utilizan el sistema de Signals de Angular en lugar de `BehaviorSubject` de RxJS. Esto simplifica el consumo en los componentes al eliminar suscripciones manuales y la necesidad de `async pipe` en todos los casos:

```typescript
// En el servicio: estado privado mutable
private readonly userSignal = signal<User | null>(null);

// Expuesto como Signal de solo lectura
readonly user = this.userSignal.asReadonly();

// Valores derivados: se recalculan automáticamente cuando user cambia
readonly isAuthenticated = computed(() => this.userSignal() !== null);
readonly currentRoles    = computed(() => this.userSignal()?.roles ?? []);

// En el componente: consumo directo sin subscribe()
if (this.authService.isAuthenticated()) { ... }
```

---

## Inyección de Dependencias

Todos los servicios siguen el patrón moderno de inyección con `inject()` en lugar del constructor:

```typescript
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly auth   = inject(AuthService);
}
```

`providedIn: 'root'` hace que el servicio sea un singleton accesible en toda la aplicación sin necesidad de registrarlo en ningún módulo ni en `app.config.ts`.
