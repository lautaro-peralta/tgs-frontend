# 06 — Feature: Inbox y Notificaciones

## Descripción General

El **Inbox** es un módulo funcional autocontenido (`features/inbox/`) que centraliza la comunicación interna del sistema. Agrupa tres flujos diferenciados:

- **Solicitudes de rol**: los usuarios pueden solicitar un ascenso de rol; los administradores las revisan y aprueban o rechazan.
- **Verificación de usuarios**: proceso de habilitación manual que realiza un administrador sobre los usuarios que completaron su perfil.
- **Notificaciones**: mensajes generados automáticamente por el sistema ante eventos relevantes (aprobaciones, rechazos).

La ruta `/inbox` está protegida por `inboxGuard`, que únicamente requiere autenticación activa, sin restricción de rol.

---

## Estructura del Feature

```
src/app/features/inbox/
│
├── pages/
│   └── inbox-page.ts              # Componente orquestador de la vista principal
│
├── components/
│   ├── notifications/
│   │   ├── notification-card      # Representación visual de una notificación individual
│   │   └── notifications-inbox    # Lista paginada de notificaciones del usuario
│   │
│   └── role-requests/
│       ├── admin-role-requests-inbox      # Vista de administrador: revisión de solicitudes
│       ├── admin-user-verification-inbox  # Vista de administrador: verificación de usuarios
│       ├── user-role-requests-inbox       # Vista de usuario: seguimiento de sus solicitudes
│       ├── user-verification-status       # Vista de usuario: estado de su verificación
│       ├── role-request-card              # Tarjeta individual de solicitud de rol
│       ├── role-request-modal             # Modal de creación de solicitud (usuario)
│       ├── role-request-review-modal      # Modal de revisión de solicitud (administrador)
│       ├── user-verification-card         # Tarjeta de usuario pendiente de verificación
│       ├── user-verification-review-modal # Modal de revisión de verificación (administrador)
│       └── user-verification-status       # Estado de verificación personal del usuario
│
├── email-verification/
│   └── email-verification         # Procesamiento de tokens de verificación de email
│
├── models/
│   ├── role-request.model.ts      # Tipos del flujo de solicitudes de rol
│   ├── user-verification.model.ts # Tipos del flujo de verificación de usuarios
│   └── notification.model.ts      # Tipos del sistema de notificaciones
│
└── services/
    ├── role-request.ts            # RoleRequestService
    ├── user-verification.ts       # UserVerificationService
    ├── notification.service.ts    # NotificationService
    └── email.verification.ts      # EmailVerificationService
```

---

## InboxPageComponent — Orquestador

`InboxPageComponent` actúa como orquestador de la vista: determina qué sub-vistas renderizar según el rol del usuario autenticado y gestiona la navegación entre secciones mediante una señal de estado:

```typescript
activeSection = signal<'notifications' | 'role-requests' | 'user-verification'>('notifications');
```

### Composición de Vistas por Rol

**Usuario con rol ADMIN**:
- Tab *Verificación de Usuarios* → `AdminUserVerificationInboxComponent`
- Tab *Solicitudes de Rol* → `AdminRoleRequestsInboxComponent`
- Tab *Notificaciones* → `NotificationsInboxComponent`

**Cualquier otro usuario autenticado**:
- Tab *Mi Verificación* → `UserVerificationStatusComponent`
- Tab *Mis Solicitudes* → `UserRoleRequestsInboxComponent`
- Tab *Notificaciones* → `NotificationsInboxComponent`

---

## Solicitudes de Rol

### Flujo desde el Lado del Usuario

```
1. El usuario navega al Inbox y abre el modal de solicitud de rol
2. Selecciona el rol deseado, ingresa su justificación
   y, si aplica, datos adicionales (zona, rango, productos)
3. RoleRequestService.createRequest(data)
   → POST /api/role-requests
4. La solicitud queda en estado PENDING y aparece en el inbox del administrador
5. El usuario puede ver el estado actualizado desde UserRoleRequestsInboxComponent
```

### Flujo desde el Lado del Administrador

```
1. El administrador accede al Inbox → sección "Solicitudes de Rol"
2. Ve el listado de solicitudes pendientes (AdminRoleRequestsInboxComponent)
3. Abre el modal de revisión (RoleRequestReviewModal) para ver el detalle
4. Aprueba o rechaza con comentarios opcionales
5. RoleRequestService.reviewRequest(id, { action, comments })
   → PATCH /api/role-requests/:id/review
6. El backend actualiza el rol del usuario (si fue aprobado)
   y genera una notificación automática
7. El usuario ve el resultado en su próxima visita al Inbox
   o cuando el roleGuard refresque el estado de sesión
```

### Modelo de Solicitud de Rol

```typescript
interface RoleRequest {
  id:             string;
  user:           { id: string; username: string; email: string };
  requestedRole:  Role;
  roleToRemove:   Role | null;      // Rol a remover en cambios de rol (ej. CLIENT → DISTRIBUTOR)
  isRoleChange:   boolean;
  status:         RequestStatus;    // PENDING | APPROVED | REJECTED
  justification?: string;
  additionalData?: {
    // Para DISTRIBUTOR
    zoneId?:      number;
    address?:     string;
    productsIds?: number[];
    // Para AUTHORITY
    rank?:        '0' | '1' | '2' | '3';
  };
  reviewedBy:     { id: string; username: string } | null;
  adminComments?: string;
  createdAt:      string;
  reviewedAt?:    string;
}
```

---

## Verificación de Usuarios

La verificación es un proceso de habilitación en dos etapas:

| Etapa | Actor | Acción | Campo resultante |
|-------|-------|--------|-----------------|
| 1. Verificación de email | Usuario | Confirma su dirección haciendo clic en el link del email | `emailVerified = true` |
| 2. Verificación administrativa | Administrador | Revisa el perfil y habilita manualmente al usuario | `isVerified = true` |

Un usuario con `isVerified = true` puede solicitar roles avanzados (PARTNER, DISTRIBUTOR, etc.). Sin esta verificación, el sistema limita los roles disponibles.

### Flujo Administrativo

```
AdminUserVerificationInboxComponent muestra usuarios con perfil completo
y emailVerified = true, pendientes de verificación administrativa
        ↓
Administrador selecciona un usuario → UserVerificationReviewModal
        ↓
Aprueba o rechaza con comentarios
        ↓
UserVerificationService.reviewVerification(userId, { action, comments })
→ PATCH /api/users/:id/verify
        ↓
Backend actualiza isVerified y emite notificación al usuario
```

---

## Sistema de Notificaciones

Las notificaciones son generadas por el backend ante eventos del sistema. El frontend las consume para informar al usuario del resultado de sus acciones.

### Tipos de Notificaciones

| Tipo | Evento que la genera |
|------|---------------------|
| `ROLE_REQUEST_APPROVED` | Un administrador aprobó una solicitud de rol |
| `ROLE_REQUEST_REJECTED` | Un administrador rechazó una solicitud de rol |
| `USER_VERIFICATION_APPROVED` | Un administrador aprobó la verificación del usuario |
| `USER_VERIFICATION_REJECTED` | Un administrador rechazó la verificación del usuario |
| `SYSTEM` | Comunicaciones generales del sistema |

### Modelo de Notificación

```typescript
interface Notification {
  id:                  string;
  userId:              string;
  type:                NotificationType;
  title:               string;
  message:             string;
  status:              NotificationStatus;   // UNREAD | READ
  createdAt:           string;
  readAt?:             string;
  relatedEntityId?:    string;
  relatedEntityType?:  'role-request' | 'user-verification' | 'system';
  metadata?:           Record<string, any>;
}
```

La cantidad de notificaciones no leídas se muestra en un badge en la navbar. El `NotificationService` expone endpoints para listar notificaciones y marcarlas como leídas.

---

## Verificación de Email

**Componente**: `features/inbox/email-verification/email-verification`  
**Rutas**: `/verify-email` y `/verify-email/:token`

Este componente procesa el token que llega en el email de verificación. Dado que el link puede ser abierto desde cualquier cliente de email (potencialmente en una sesión nueva del navegador), la ruta es completamente pública y está excluida del interceptor de refresh automático.

El componente extrae el token de forma flexible, soportando los tres formatos posibles de URL:

| Formato | Ejemplo |
|---------|---------|
| Path segment | `/verify-email/abc123` |
| Query param | `/verify-email?token=abc123` |
| Hash fragment | `/verify-email#token=abc123` |

Tras extraer el token, llama a `EmailVerificationService.verify(token)` y renderiza el estado resultante (éxito, error o token expirado).

---

## Servicios del Feature

| Servicio | Archivo | Endpoint base | Uso |
|---------|---------|--------------|-----|
| `RoleRequestService` | `services/role-request.ts` | `/api/role-requests` | CRUD de solicitudes de rol |
| `UserVerificationService` | `services/user-verification.ts` | `/api/users` | Revisión de verificaciones administrativas |
| `NotificationService` | `services/notification.service.ts` | `/api/notifications` | Listado y marcado de notificaciones |
| `EmailVerificationService` | `services/email.verification.ts` | `/api/auth/verify-email` | Procesamiento del token de verificación |

Todos los servicios del feature usan `firstValueFrom()` para convertir Observables a Promises, habilitando el uso de `async/await` en los componentes del inbox en lugar de suscripciones explícitas.
