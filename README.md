# The Garrison System (GarrSYS)

> Frontend Angular 20 + Backend Node.js (Express + MikroORM + MySQL) con Docker.  
> RBAC completo (ADMIN, CLIENTE, SOCIO, DISTRIBUIDOR), gestión, tienda, bandeja/inbox y verificación de email.

---

## 📌 Tabla de contenidos
- [Visión general](#-visión-general)
- [Arquitectura](#-arquitectura)
- [Tecnologías](#-tecnologías)
- [Módulos y funcionalidades](#-módulos-y-funcionalidades)
- [Requisitos](#-requisitos)
- [Configuración rápida](#-configuración-rápida)
- [Ejecución con Docker Compose](#-ejecución-con-docker-compose)
- [Ejecución local (sin Docker)](#-ejecución-local-sin-docker)
- [Estructura de carpetas](#-estructura-de-carpetas)
- [i18n](#-i18n)
- [Autenticación y roles](#-autenticación-y-roles)
- [Modelo de datos (resumen)](#-modelo-de-datos-resumen)
- [Contratos API](#-contratos-api)
- [Pruebas, Lint y Estilo](#-pruebas-lint-y-estilo)
- [Flujo de desarrollo](#-flujo-de-desarrollo)
- [Preguntas frecuentes](#-preguntas-frecuentes)


---

## 🛰️ Visión general

**GarrSYS** (The Garrison System) es una plataforma full‑stack para gestionar productos, ventas y operaciones de un sistema de distribución inspirado en *Peaky Blinders*.  
Incluye tienda, panel de gestión, bandeja de entrada, verificación de email y control de acceso por **roles**:

- **ADMIN**
- **CLIENTE**
- **SOCIO**
- **DISTRIBUIDOR**

El **frontend** (Angular 20, standalone) emplea **signals**, **Reactive Forms**, **guards**, y **ngx‑translate**.  
El **backend** (Node.js + Express) usa **MikroORM** con **MySQL**, **JWT** para autenticación, y soporte de correo (p. ej. **Mailtrap**) para verificación de email.

---

## 🧱 Arquitectura

```
apps/
  backend/         API REST (Node.js, Express, MikroORM, MySQL, JWT)
  frontend/        SPA Angular 20 (standalone components, signals, i18n)
docker/            Archivos de soporte (p. ej. MySQL init, conf)
mysql-data/        Volumen de datos (persistencia local)
docker-compose.yml Orquestación de servicios (api + db + web opcional)
```

**Servicios típicos en `docker-compose.yml`:**
- **db**: MySQL (con volumen `mysql-data/`)
- **api**: backend Node.js (ESM), expuesto en `http://localhost:3000`
- **web**: frontend Angular servido (dev o build estático), p. ej. `http://localhost:4200`

---

## 🧰 Tecnologías

**Frontend**
- Angular **20** (standalone, signals, reactive forms)
- **@ngx-translate/core** (i18n)
- Tailwind / SCSS (glass‑dark, cards, etc.)
- Guards, interceptors y routing con reglas por rol

**Backend**
- Node.js (ES Modules) + **Express**
- **MikroORM** (MySQL)
- **JWT** Auth (Access/Refresh opcional)
- **Mailer** (p. ej. Mailtrap) para verificación de email

**Infra**
- **Docker** + **Docker Compose**
- **pnpm**/**npm** workspaces (según repo)
- Volúmenes para persistencia MySQL

---

## 🧩 Módulos y funcionalidades

- **Tienda / Store**: catálogo, detalle, compra/venta (contra API).
- **Gestión**:
  - **Productos**
  - **Clientes**
  - **Socios (Partners)**
  - **Distribuidores**
  - **Zonas**
  - **Autoridades**
  - **Sobornos**
  - **Consejo Shelby** (Decisiones, Temáticas)
  - **Ventas** (estadísticas por `product | distributor | client | day | zone`)
- **Bandeja/Inbox**: solicitudes de rol (aprobación/rechazo), notificaciones.
- **Autenticación**: login/registro, **verificación de email** con ruta pública `/verify-email/:token`.
- **Menú dinámico por rol**: visibilidad de secciones según permisos.
- **i18n** completo (ES/EN), con **pipe `translate`** en plantillas.
- **Accesibilidad y UX**: animaciones suaves, placeholders controlados (sin “glitches”).

---

## ✅ Requisitos

- Node.js **>= 18**
- pnpm **>= 9** (o npm/yarn)
- Docker **>= 24** y Docker Compose **>= 2**
- MySQL **8.x** (si corres sin Docker)

---

## ⚡ Configuración rápida

```bash
# Clonar
git clone https://github.com/<tu-org>/<tu-repo>.git
cd <tu-repo>

# Variables de entorno
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env   # si aplica

# Instalar dependencias
pnpm install  # o npm install
```

---

## 🐳 Ejecución con Docker Compose

### Comandos básicos
```bash
# Levantar todo (foreground)
docker compose up

# Levantar en background (detached)
docker compose up -d

# Ver logs
docker compose logs -f

# Reiniciar servicios
docker compose restart

# Apagar
docker compose down

# Apagar y borrar volúmenes (¡borra datos de MySQL!)
docker compose down -v
```

### Primer inicio
1. Crea los `.env` (ver sección Variables de entorno).
2. `docker compose up -d`
3. Ejecuta migraciones de MikroORM si no se corren automáticamente (ver más abajo).
4. Accede a:
   - Frontend: `http://localhost:4200`
   - API: `http://localhost:3000/health` (según implementación)

---

## 💻 Ejecución local (sin Docker)

### Backend
```bash
cd apps/backend
pnpm install

# Generar/actualizar esquema o correr migraciones
pnpm mikro-orm migration:up     # o pnpm mikro-orm schema:update -f

# Desarrollo
pnpm dev

# Producción (ejemplo)
pnpm build && pnpm start
```

### Frontend
```bash
cd apps/frontend
pnpm install

# Desarrollo
pnpm start    # o ng serve

# Producción
pnpm build    # genera dist/
```

---


## 🗂️ Estructura de carpetas

> La estructura exacta puede variar, pero en general:

```
apps/
  backend/
    src/
      entities/          # MikroORM entities
      migrations/        # migraciones
      modules/           # controladores/servicios (productos, ventas, etc.)
      middleware/        # auth, profile completeness, etc.
      routes/            # rutas express
      utils/             # helpers
    .env
    package.json
  frontend/
    src/
      app/
        modules/
          auth/
          store/
          management/
            product/
            client/
            sale/
            zone/
            authority/
            distributor/
            partner/
            bribe/
            shelby-council/
          inbox/
        services/
        models/
        guards/
        interceptors/
        i18n/
      assets/
      styles/
    .env
    package.json
docker-compose.yml
```

---

## 🌍 i18n

- Implementado con **@ngx-translate/core**.
- Archivos JSON de traducciones en `apps/frontend/src/app/i18n/` (p. ej. `es.json`, `en.json`).
- Uso en plantillas:
  ```html
  <h2>{{ 'nav.management' | translate }}</h2>
  ```
- Asegúrate de **importar `TranslateModule`** en los componentes/páginas que lo usan.

---

## 🔐 Autenticación y roles

- **JWT** en backend, con **interceptor** en frontend para manejar `401`.
- Ruta pública para verificación: **`/verify-email/:token`** (no debe redirigir al login).
- **Guards** y **canMatch / canActivate** para proteger rutas.
- **Menú dinámico**: la visibilidad de secciones depende de `roles` actuales del usuario.
- Flujo “solicitud de cambio de rol” → **ADMIN** aprueba/rechaza → UI se actualiza (Navbar, Gestión, etc.).

---

## 🧾 Modelo de datos (resumen)

Entidades principales (nombres orientativos, pueden variar):
- **Product**, **Sale**, **Client**, **Partner (Socio)**, **Distributor**, **Zone**
- **Authority**, **Bribe**, **Decision**, **Topic** (Consejo Shelby)
- **User**, **RoleRequest** (estado: `PENDING | APPROVED | REJECTED`)

> **Nota**: en algunas pantallas se referencian campos derivados (p. ej. estadísticas de ventas agrupadas por `product | distributor | client | day | zone`). Asegúrate de alinear **DTOs** frontend con **entities/DTOs** backend para evitar errores de tipo (TS).

---

## 🔌 Contratos API

> La API sigue un estilo REST. Rutas orientativas:

- `POST /auth/login` — login
- `POST /auth/register` — registro
- `POST /auth/verify-email` — envía correo con token
- `GET  /auth/verify-email/:token` — verifica token

- `GET  /products` / `POST /products` / `PATCH /products/:id` / `DELETE /products/:id`
- `GET  /sales` / `POST /sales` / `GET /sales/stats?groupBy=product|distributor|client|day|zone`
- `GET  /clients` / `POST /clients` / ...
- `GET  /distributors` / `POST /distributors` / ...
- `GET  /zones` / `POST /zones` / ...
- `GET  /authorities` / `POST /authorities` / ...
- `GET  /bribes` / `POST /bribes` / ...
- `GET  /shelby-council/decisions` / `POST /shelby-council/decisions` / ...
- `POST /roles/request` — solicita cambio de rol
- `POST /roles/:requestId/approve` — **ADMIN**
- `POST /roles/:requestId/reject` — **ADMIN**

> **Importante**: Mantener sincronía **DTO frontend ↔ DTO backend**. Si el backend **no** expone un campo (p. ej. `sale.client`), la plantilla **no** debe usarlo.

---

## 🧪 Pruebas, Lint y Estilo

```bash
# Frontend
pnpm -w lint
pnpm -w test

# Backend
pnpm -w lint
pnpm -w test
```

- Estilo recomendado: **ESLint** + **Prettier**.  
- Convenciones de commits: **Conventional Commits** (opcional).

---

## 🔁 Flujo de desarrollo

1. Crear rama feature: `feat/<módulo>-<breve>`
2. Implementar en **backend** (entities, service, controller, rutas).
3. Ajustar **DTOs** en frontend para calzar con API (no al revés).
4. Integrar vistas/components (Reactive Forms + signals).
5. Añadir traducciones a `i18n/*.json`.
6. Agregar pruebas si aplica.
7. PR + Code Review → Merge.

---



## ❓ Preguntas frecuentes

**¿Cómo reseteo la base en Docker?**  
```bash
docker compose down -v   # ¡destruye datos! quita el volumen mysql
docker compose up -d
```

**¿Comandos Docker Compose comunes?**  
```bash
docker compose up -d
docker compose down
docker compose logs -f
docker compose restart
```



