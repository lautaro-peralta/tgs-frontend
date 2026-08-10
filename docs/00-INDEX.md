# The Garrison System — Documentación Frontend

Esta documentación cubre la arquitectura, patrones de diseño y decisiones técnicas del cliente web de **The Garrison System (TGS)**. La aplicación está construida sobre **Angular 20** con un enfoque completamente standalone y lazy-loaded, consumiendo la API REST del backend TGS a través de HTTP-only cookies para la gestión de sesión.

---

## Documentos

### Fundamentos

| # | Documento | Descripción |
|---|-----------|-------------|
| 1 | [Entorno y Scripts](01-SETUP.md) | Instalación, comandos de desarrollo, configuración de proxy y pipeline de deploy |
| 2 | [Arquitectura de la Aplicación](02-ARCHITECTURE.md) | Estructura de módulos, patrones de componentes standalone, inyección de dependencias y separación de capas |

### Navegación y Seguridad

| # | Documento | Descripción |
|---|-----------|-------------|
| 3 | [Routing y Control de Acceso](03-ROUTING-AND-GUARDS.md) | Mapa de rutas, guards por rol, flujos de redirección y casos especiales |
| 4 | [Sistema de Autenticación](04-AUTH-FLOW.md) | AuthService con Angular Signals, interceptor HTTP, ciclos de vida de sesión |

### Datos y Lógica de Negocio

| # | Documento | Descripción |
|---|-----------|-------------|
| 5 | [Servicios y Modelos de Datos](05-SERVICES-AND-MODELS.md) | Catálogo de servicios, contratos de API, interfaces TypeScript y estado del carrito |
| 6 | [Feature: Inbox y Notificaciones](06-INBOX.md) | Sistema de solicitudes de rol, verificación de usuarios, notificaciones y verificación de email |

### Interfaz de Usuario

| # | Documento | Descripción |
|---|-----------|-------------|
| 7 | [Sistema de Diseño](07-DESIGN-SYSTEM.md) | Design tokens, tema Garrison, componente glassmorphism, sistema responsive y SCSS |
| 8 | [Internacionalización](08-I18N.md) | Configuración de ngx-translate, estructura de claves, loader personalizado y guía de contribución |

---

## Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | Angular | 20 |
| Lenguaje | TypeScript | 5.8 |
| Estilos | SCSS + CSS Custom Properties | — |
| Estado | Angular Signals + computed | — |
| HTTP | Angular HttpClient + Interceptores funcionales | — |
| Gráficos | ECharts (ngx-echarts) + Chart.js | 6 / 4 |
| Animaciones | SCSS puro | - |
| i18n | @ngx-translate/core | 17 |
| Deploy | Vercel → Render | — |

---

## Repositorio y Recursos

- **Repositorio**: [github.com/Lau-prog/GarrSYS](https://github.com/Lau-prog/GarrSYS)
- **Backend (producción)**: `https://tgs-backend-u5xz.onrender.com`
- **Documentación del Backend**: ver carpeta `/docs` del backend


