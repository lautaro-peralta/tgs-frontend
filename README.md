# TGS Frontend - The Garrison System

Este repositorio contiene el **frontend** del sistema **The Garrison System**, desarrollado con **Angular 20** (standalone components) utilizando **signals**, **reactive forms**, **guards** y **ngx-translate** para internacionalización.

---

## ⚡ Inicio Rápido

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Tsplivalo/TGS-Frontend.git
cd TGS-Frontend

# Instalar dependencias
npm install
# o con pnpm
pnpm install
```

### Ejecución en modo desarrollo

```bash
npm start
# o
pnpm start
```

La aplicación se abrirá en `http://localhost:4200` con proxy automático hacia el backend en Render.

### Build de producción

```bash
npm run build
# o
pnpm build
```

Los archivos estáticos se generan en `dist/The-Garrison-System/browser/`.

---

## 📖 Sobre el Proyecto

Este es el frontend de **The Garrison System** (GarrSYS), una aplicación Angular 20 que se conecta a un backend REST API desplegado en Render.

---

## 🧰 Tecnologías Frontend

- **Angular 20** con standalone components
- **TypeScript 5.8**
- **RxJS 7.8** para programación reactiva
- **Signals** para estado reactivo
- **@ngx-translate/core** para i18n (ES/EN)
- **Reactive Forms** para formularios complejos
- **Guards** para protección de rutas
- **Interceptors** para manejo de tokens JWT
- **ECharts** para visualizaciones
- **SCSS** con diseño glass-dark personalizado
- **Karma + Jasmine** para testing

---

## 🗂️ Estructura del Proyecto

```
TGS-Frontend/
├── src/
│   ├── app/
│   │   ├── components/           # Componentes de la aplicación
│   │   │   ├── auth/            # Login, registro, verificación
│   │   │   ├── store/           # Tienda y catálogo
│   │   │   ├── product/         # Gestión de productos
│   │   │   ├── client/          # Gestión de clientes
│   │   │   ├── partner/         # Gestión de socios
│   │   │   ├── distributor/     # Gestión de distribuidores
│   │   │   ├── zone/            # Gestión de zonas
│   │   │   ├── authority/       # Gestión de autoridades
│   │   │   ├── bribe/           # Gestión de sobornos
│   │   │   ├── sale/            # Gestión de ventas
│   │   │   ├── shelby-council/  # Consejo Shelby
│   │   │   ├── decision/        # Decisiones del consejo
│   │   │   ├── topic/           # Temáticas
│   │   │   ├── clandestine-agreement/ # Acuerdos clandestinos
│   │   │   ├── monthly-review/  # Revisiones mensuales
│   │   │   ├── navbar/          # Navegación principal
│   │   │   ├── home/            # Página de inicio
│   │   │   ├── account/         # Gestión de cuenta
│   │   │   ├── admin/           # Panel de administración
│   │   │   ├── my-purchases/    # Historial de compras
│   │   │   ├── pages/           # About, contact, FAQs
│   │   │   ├── purchase-success-modal/ # Modal de compra exitosa
│   │   │   ├── legal/           # Páginas legales
│   │   │   └── errors/          # Páginas de error
│   │   │
│   │   ├── features/             # Módulos de features
│   │   │   └── inbox/           # Bandeja de entrada (solicitudes de rol)
│   │   │
│   │   ├── services/             # Servicios de la aplicación
│   │   │   ├── auth/            # Autenticación
│   │   │   ├── product/         # API de productos
│   │   │   ├── client/          # API de clientes
│   │   │   ├── partner/         # API de socios
│   │   │   ├── distributor/     # API de distribuidores
│   │   │   ├── zone/            # API de zonas
│   │   │   ├── authority/       # API de autoridades
│   │   │   ├── bribe/           # API de sobornos
│   │   │   ├── sale/            # API de ventas
│   │   │   ├── decision/        # API de decisiones
│   │   │   ├── topic/           # API de temáticas
│   │   │   ├── cart/            # Carrito de compras
│   │   │   ├── user/            # Gestión de usuarios
│   │   │   ├── stats/           # Estadísticas
│   │   │   ├── i18n/            # Internacionalización
│   │   │   ├── ui/              # Servicios de UI
│   │   │   └── password-reset/  # Recuperación de contraseña
│   │   │
│   │   ├── models/               # Modelos TypeScript
│   │   │   ├── auth/
│   │   │   ├── product/
│   │   │   ├── client/
│   │   │   ├── user/
│   │   │   └── ...              # Uno por cada entidad
│   │   │
│   │   ├── guards/               # Guards de rutas
│   │   │   └── auth.guard.ts     # Protecciones de vistas y roles
│   │   │
│   │   ├── interceptors/         # Interceptors HTTP
│   │   │   └── auth.interceptor.ts
│   │   │
│   │   ├── i18n/                 # Archivos de traducción
│   │   │   ├── es.json          # Español
│   │   │   └── en.json          # Inglés
│   │   │
│   │   ├── shared/               # Componentes compartidos
│   │   │   ├── footer/
│   │   │   └── ui/
│   │   │
│   │   ├── app.routes.ts         # Configuración de rutas
│   │   ├── app.config.ts         # Configuración de la app
│   │   └── app.ts                # Componente raíz
│   │
│   ├── assets/                   # Recursos estáticos
│   ├── styles.scss               # Estilos globales
│   ├── index.html                # HTML principal
│   └── main.ts                   # Punto de entrada
│
├── proxy.conf.json               # Configuración del proxy
├── vercel.json                   # Configuración de Vercel
├── angular.json                  # Configuración de Angular
├── tsconfig.json                 # Configuración de TypeScript
└── package.json                  # Dependencias y scripts
```

## 🌍 Internacionalización (i18n)

La aplicación soporta **español** e **inglés** mediante **@ngx-translate**.

### Archivos de traducción

- [src/app/i18n/es.json](src/app/i18n/es.json) - Español
- [src/app/i18n/en.json](src/app/i18n/en.json) - Inglés

### Uso en componentes

```typescript
// En el template
<h2>{{ 'nav.management' | translate }}</h2>
<p>{{ 'store.product_added' | translate }}</p>

// En el código TypeScript
constructor(private translate: TranslateService) {}

this.translate.get('messages.success').subscribe(text => {
  console.log(text);
});
```

### Cambiar idioma

El idioma se puede cambiar desde la UI o programáticamente:

```typescript
this.translate.use("en"); // Cambiar a inglés
this.translate.use("es"); // Cambiar a español
```

---

## 🔐 Autenticación

- **JWT tokens** en `localStorage`
- **Auth interceptor** añade token a cada petición HTTP
- **Guards** protegen rutas según autenticación y roles
- Ruta pública para verificación de email: `/verify-email/:token`

---

## 🧩 Características Principales

- **Autenticación JWT** con guards y roles
- **Internacionalización** (ES/EN) con @ngx-translate
- **Routing** con lazy loading y guards de autorización
- **Reactive Forms** con validaciones
- **Estado reactivo** con signals
- **Visualizaciones** con Chart.js y ECharts
- **Diseño responsivo** con SCSS personalizado
- **Proxy configurado** para desarrollo local

---

## 🧪 Testing

### Ejecutar tests

```bash
npm test
# o
pnpm test
```

Esto ejecuta los tests con **Karma** y **Jasmine**.

### Estructura de tests

Los archivos de test tienen extensión `.spec.ts` y están junto a sus componentes:

```
component.ts
component.html
component.scss
component.spec.ts
```

---

## 🚀 Deployment

### Vercel (Actual)

El proyecto está configurado para desplegarse en **Vercel**:

```bash
# Build automático en cada push a main
# Configuración en vercel.json
```

Variables de entorno en Vercel (si aplica):

- `BACKEND_URL` (opcional, ya configurado en vercel.json)

### Build manual para otros servicios

```bash
npm run build

# Los archivos están en:
# dist/The-Garrison-System/browser/
```

Puedes servir estos archivos con cualquier servidor estático (nginx, Apache, etc.).

---

## 🛠️ Troubleshooting

### ❌ Error: CORS / Blocked by CORS policy

**Problema**: El navegador bloquea las peticiones al backend.

**Solución**:

1. Verifica que el backend tenga configurado CORS correctamente
2. En desarrollo local, usa el proxy: `npm start` (ya incluye `--proxy-config`)
3. Verifica que `proxy.conf.json` apunte al backend correcto

### ❌ Error: 401 Unauthorized en todas las peticiones

**Problema**: El token JWT no se está enviando o es inválido.

**Solución**:

1. Verifica que el token esté en `localStorage`: `localStorage.getItem('token')`
2. Cierra sesión y vuelve a iniciar sesión
3. Verifica que el interceptor esté configurado en `app.config.ts`
4. Revisa la consola del navegador para ver el header `Authorization`

### ❌ Error: No se ven los cambios después de hacer build

**Problema**: El navegador está cacheando la versión anterior.

**Solución**:

1. Limpia el cache del navegador (Ctrl + Shift + Delete)
2. Prueba en modo incógnito
3. Verifica que `outputHashing: 'all'` esté en `angular.json` (producción)

### ❌ Error: Cannot find module '@ngx-translate/core'

**Problema**: Dependencias no instaladas.

**Solución**:

```bash
rm -rf node_modules package-lock.json
npm install
```

### ❌ Error: El menú no muestra las opciones según mi rol

**Problema**: El frontend no está recibiendo los roles correctos del backend.

**Solución**:

1. Verifica el token JWT: `jwt.io` y pega tu token para ver el payload
2. Asegúrate de que el backend incluya `roles` en el payload del JWT
3. Revisa el `AuthService` para ver cómo se extraen los roles
4. Cierra sesión y vuelve a iniciar sesión

### ❌ Error: Las traducciones no funcionan / texto aparece como claves

**Problema**: Archivos de traducción no cargados o `TranslateModule` mal configurado.

**Solución**:

1. Verifica que existan `src/app/i18n/es.json` y `src/app/i18n/en.json`
2. Verifica que `TranslateModule` esté importado en `app.config.ts`
3. Revisa la configuración de `TranslateHttpLoader`
4. Abre la consola y busca errores 404 en `/assets/i18n/`

### ❌ Error: Proxy no funciona en desarrollo

**Problema**: Las peticiones `/api/*` no se redirigen al backend.

**Solución**:

1. Verifica que estés usando `npm start` (no `ng serve` solo)
2. Revisa `proxy.conf.json` - debe apuntar al backend correcto
3. Si el backend está en HTTPS, ajusta `"secure": true`
4. Revisa logs del terminal para errores de proxy

### ❌ Error: Cannot read property 'xxx' of undefined

**Problema**: Datos llegando con estructura diferente a la esperada.

**Solución**:

1. Verifica los DTOs en el backend
2. Usa optional chaining: `data?.property`
3. Revisa la respuesta en Network tab (DevTools)
4. Asegúrate de que los modelos TypeScript coincidan con la API

---

## 📋 Scripts Disponibles

```bash
# Desarrollo con proxy
npm start

# Build de producción
npm run build

# Build en modo watch
npm run watch

# Tests
npm test

# Angular CLI
npm run ng -- <comando>
```

---

## 🔁 Flujo de Desarrollo

1. **Crear rama feature**: `git checkout -b feat/<modulo>-<descripcion>`
2. **Desarrollar** el componente/servicio/feature
3. **Ajustar traducciones** en `i18n/*.json`
4. **Agregar tests** si aplica
5. **Commit** siguiendo Conventional Commits:
   ```
   feat: Add product filter by category
   fix: Resolve auth token expiration issue
   ```
6. **Push** y crear **Pull Request**
7. **Code Review** → Merge a `main`

## 📄 Licencia

Este proyecto es parte de un trabajo académico para la materia **Desarrollo de Software**.
