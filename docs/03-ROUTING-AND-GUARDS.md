# 03 — Routing y Control de Acceso

## Arquitectura de Rutas

Todas las rutas de la aplicación están definidas en `src/app/app.routes.ts` y se dividen en cinco grupos lógicos. El archivo exporta el array `routes` que consume `provideRouter()` en `app.config.ts`.

El orden de definición es crítico: las rutas más específicas (como `/verify-email`) deben preceder a las más generales, y el wildcard `**` siempre va al final como fallback.

---

## Mapa de Rutas

### Rutas Públicas

Accesibles sin autenticación. No tienen guards asociados.

| Path | Componente | Título de Página |
|------|-----------|-----------------|
| `/` | `HomeComponent` | — |
| `/sobre-nosotros` | `AboutComponent` | — |
| `/faqs` | `FaqsComponent` | — |
| `/contactanos` | `ContactComponent` | — |
| `/terminos` | `TermsComponent` | Términos y Condiciones |
| `/privacidad` | `PrivacyComponent` | Política de Privacidad |
| `/cookies` | `CookiesComponent` | Política de Cookies |
| `/forbidden` | `ForbiddenComponent` | — |
| `/verify-email` | `EmailVerificationComponent` | Verificar Email |
| `/verify-email/:token` | `EmailVerificationComponent` | Verificar Email |
| `/forgot-password` | `ForgotPasswordComponent` | Recuperar Contraseña |
| `/reset-password/:token` | `ResetPasswordComponent` | Restablecer Contraseña |

> `/login` y `/register` redirigen a `/` mediante `redirectTo`. El formulario de autenticación está integrado directamente en la landing page.

---

### Rutas Privadas — Cuenta del Usuario

Requieren sesión activa (`authGuard`). Sin restricción de rol.

| Path | Componente | Descripción |
|------|-----------|-------------|
| `/mi-cuenta` | `AccountComponent` | Perfil, datos personales y configuración |
| `/mis-compras` | `MyPurchasesComponent` | Historial de órdenes de compra |
| `/inbox` | `InboxPageComponent` | Notificaciones y solicitudes de rol |
| `/tienda` | `StoreComponent` | Catálogo de productos (CLIENT, ADMIN, PARTNER, DISTRIBUTOR, USER) |
| `/checkout` | `CheckoutComponent` | Proceso de pago |

---

### Rutas Privadas — Gestión de Negocio

Requieren autenticación y roles operativos específicos.

| Path | Roles con Acceso | Descripción |
|------|-----------------|-------------|
| `/producto` | ADMIN, PARTNER, DISTRIBUTOR | Alta, edición y baja de productos |
| `/cliente` | ADMIN, DISTRIBUTOR | Gestión del padrón de clientes |
| `/venta` | ADMIN, DISTRIBUTOR, AUTHORITY | Registro y seguimiento de ventas |
| `/zona` | ADMIN, PARTNER, DISTRIBUTOR | Gestión de zonas geográficas |
| `/autoridad` | ADMIN, PARTNER | Alta y gestión de autoridades |
| `/sobornos` | ADMIN, PARTNER, AUTHORITY | Gestión de sobornos registrados |
| `/distribuidor` | ADMIN, PARTNER | Gestión de distribuidores |

---

### Rutas Privadas — Gestión Societaria

Reservadas a los niveles más altos de la organización.

| Path | Roles con Acceso | Descripción |
|------|-----------------|-------------|
| `/decision` | ADMIN, PARTNER | Registro de decisiones del consejo |
| `/socio` | ADMIN, PARTNER | Gestión del padrón de socios |
| `/consejo-shelby` | ADMIN, PARTNER | Panel del Consejo Shelby |
| `/acuerdos-clandestinos` | ADMIN, PARTNER, AUTHORITY | Acuerdos confidenciales |
| `/revisiones-mensuales` | ADMIN, PARTNER | Revisiones y balances mensuales |
| `/tematica` | ADMIN, PARTNER | Gestión de temáticas |

---

### Rutas Privadas — Administración del Sistema

Exclusivas del rol ADMIN.

| Path | Descripción |
|------|-------------|
| `/admin` | Panel general de administración del sistema |
| `/solicitudes-rol` | Inbox de solicitudes de cambio de rol |
| `/verificacion-mail` | Herramienta de verificación manual de emails |

---

## Guards

Todos los guards están definidos en `src/app/guards/auth.guard.ts` como funciones (`CanActivateFn`), siguiendo el estilo funcional de Angular moderno (sin clases que implementen `CanActivate`).

### `authGuard`

Guard base de autenticación. Verifica que exista una sesión activa antes de permitir el acceso a una ruta.

**Comportamiento**:
- Si la URL es una ruta de verificación de email pública → permite acceso sin verificar sesión.
- Si el usuario está autenticado → permite acceso.
- En cualquier otro caso → redirige a `/`.

```typescript
export const authGuard: CanActivateFn = (route, state) => {
  if (isPublicVerificationUrl(state.url)) return true;
  if (auth.isAuthenticated())             return true;
  return router.createUrlTree(['/']);
};
```

---

### `roleGuard`

Factory que genera un guard parametrizado con la lista de roles permitidos. Se compone siempre junto con `authGuard`.

```typescript
canActivate: [authGuard, roleGuard([Role.ADMIN, Role.PARTNER])]
```

Internamente llama a `auth.refreshIfStale(15000)` antes de evaluar los roles. Si los datos de sesión tienen más de 15 segundos de antigüedad, lanza un refresh silencioso para garantizar que cambios recientes de rol (ej. una solicitud aprobada) se reflejen sin necesidad de re-login.

---

### `inboxGuard`

Variante de `authGuard` específica para la ruta `/inbox`. Requiere únicamente autenticación, sin verificación de roles.

---

### `guestGuard`

Inverso de `authGuard`. Redirige a `/` si el usuario ya tiene sesión activa. Previene que usuarios autenticados accedan a rutas exclusivas de sesión no iniciada.

---

## Comportamiento de Redirección

### Usuario no autenticado intenta acceder a ruta protegida

```
/admin  →  authGuard: isAuthenticated() = false  →  redirige a /
```

### Usuario autenticado sin el rol requerido

```
/admin  →  authGuard: ✓  →  roleGuard([ADMIN]): currentRoles = ['CLIENT']  →  redirige a /
```

### Token de verificación de email (caso especial)

```
/verify-email?token=abc  →  isPublicVerificationUrl() = true  →  acceso permitido
                              (sin importar el estado de sesión)
```

Este bypass es intencional: el link de verificación puede ser abierto desde un cliente de email donde el usuario no tiene sesión activa en el browser.

---

## Orden de Rutas y Caso Especial de `verify-email`

La ruta `/verify-email` **debe estar declarada al inicio del array de rutas y sin ningún guard**. Esto se debe a que Angular evalúa las rutas en orden secuencial, y si `/verify-email` apareciese después de un grupo con guard, podría ser bloqueada antes de que los guards de las rutas posteriores evalúen el bypass.

```typescript
// ⚠️ CRÍTICO: debe ser la primera ruta del array
{
  path: 'verify-email/:token',
  loadComponent: () =>
    import('./features/inbox/email-verification/email-verification')
      .then(m => m.EmailVerificationComponent),
  title: 'Verificar Email - GarrSYS'
}
```

El wildcard de fallback siempre va al final:

```typescript
{ path: '**', redirectTo: '' }
```

---

## Flag de Bypass para Desarrollo

Los guards incorporan una comprobación especial para facilitar el desarrollo de vistas protegidas sin necesidad de tener el backend activo:

```typescript
const bypass = localStorage.getItem('authBypass') === 'true';
return auth.isAuthenticated() || bypass;
```

Activar desde la consola del navegador:

```javascript
localStorage.setItem('authBypass', 'true')
```

Este flag no tiene ningún efecto en producción si no es activado deliberadamente. No representa un vector de seguridad real ya que opera únicamente en el cliente.
