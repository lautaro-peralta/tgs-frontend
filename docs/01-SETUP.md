# 01 — Entorno y Scripts

## Requisitos del Sistema

| Herramienta | Versión requerida | Notas |
|-------------|------------------|-------|
| Node.js | ≥ 20 | Motor de ejecución |
| pnpm | ≥ 9 | Gestor de paquetes preferido |
| Angular CLI | ≥ 20 | Toolchain de build y desarrollo |

El proyecto define un `pnpm-workspace.yaml` en la raíz, por lo que **pnpm** es el gestor estándar. `npm` también es compatible pero puede generar diferencias en el lockfile.

---

## Instalación

```bash
git clone https://github.com/Lau-prog/GarrSYS
cd GarrSYS/frontend

pnpm install
```

---

## Scripts Disponibles

| Script | Comando subyacente | Descripción |
|--------|--------------------|-------------|
| `pnpm start` | `ng serve --proxy-config proxy.conf.json` | Servidor de desarrollo con proxy hacia el backend |
| `pnpm build` | `ng build` | Build de producción optimizado |
| `pnpm watch` | `ng build --watch --configuration development` | Build incremental para desarrollo |
| `pnpm test` | `ng test` | Suite de tests unitarios con Karma + Jasmine |

El build de producción genera los artefactos en `dist/The-Garrison-System/browser/`, que es el directorio que Vercel sirve como sitio estático.

---

## Proxy de Desarrollo

Durante el desarrollo, el frontend corre en `localhost:4200` y el backend en `localhost:3000`. Para evitar problemas de CORS y poder usar rutas relativas `/api/*` sin cambiar la configuración según el entorno, Angular DevServer aplica un proxy definido en `proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

Cualquier petición del navegador a `/api/*` es interceptada por el DevServer y reenviada al backend local, manteniendo cookies y headers intactos. Esto replica exactamente el comportamiento del entorno de producción donde Vercel realiza la misma función mediante `rewrites`.

> El backend debe estar activo en `localhost:3000` antes de levantar el frontend. Consultar la documentación del backend para los pasos de inicialización.

---

## Configuración de TypeScript

El proyecto mantiene tres configuraciones de TypeScript para separar claramente los contextos de compilación:

| Archivo | Propósito |
|---------|-----------|
| `tsconfig.json` | Configuración base compartida (target, strict mode, paths) |
| `tsconfig.app.json` | Extiende la base; excluye archivos de test. Usado por `ng build` |
| `tsconfig.spec.json` | Extiende la base; incluye archivos `*.spec.ts`. Usado por `ng test` |

---

## Pipeline de Deploy (Vercel)

La configuración de deploy está centralizada en `vercel.json`. No se utilizan variables de entorno por entorno ni configuraciones separadas: el frontend siempre usa rutas relativas `/api/*` y Vercel se encarga de enrutarlas al destino correcto en producción.

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/The-Garrison-System/browser",
  "framework": "angular",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://tgs-backend-u5xz.onrender.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Decisiones de diseño

**Rewrite de API**: El primer rewrite redirige todas las peticiones a `/api/*` hacia el backend en Render, haciendo que el frontend sea completamente agnóstico al entorno. No hay archivos `environment.ts` con URLs distintas por entorno.

**SPA Fallback**: El segundo rewrite (`/(.*) → /index.html`) garantiza que Angular Router pueda manejar navegaciones directas a cualquier ruta (e.g., refrescar la página en `/mi-cuenta`). Sin este rewrite, Vercel devolvería un 404 al no encontrar el archivo estático.

**Cache Deshabilitado para Productos**: Los headers de `vercel.json` aplican `Cache-Control: no-store` específicamente en `/api/products*`, evitando que la CDN de Vercel sirva respuestas cacheadas del catálogo de productos.

### Flujo de red por entorno

```
Desarrollo local
  Browser (4200) ──► /api/products
                       │
                  [Angular DevServer proxy]
                       │
                  localhost:3000/api/products

Producción (Vercel)
  Browser ──► tgs-frontend.vercel.app/api/products
                       │
                  [Vercel Edge Rewrite]
                       │
                  tgs-backend-u5xz.onrender.com/api/products
```

---

## Punto de Entrada de la Aplicación

| Archivo | Rol |
|---------|-----|
| `src/main.ts` | Llama a `bootstrapApplication(AppComponent, appConfig)`. Punto de entrada del bundle. |
| `src/index.html` | HTML raíz de la SPA. El CLI inyecta los scripts del bundle en el build. |
| `src/app/app.ts` | Componente raíz. Únicamente renderiza el `<router-outlet>` para montar las vistas. |
| `src/app/app.config.ts` | Registra todos los providers globales: router, HttpClient, interceptores, ECharts, i18n. |
| `src/app/app.routes.ts` | Define el árbol completo de rutas con lazy loading. |
