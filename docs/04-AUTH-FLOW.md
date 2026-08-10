# 04 — Sistema de Autenticación

## Estrategia de Sesión

La autenticación se basa en **HTTP-only cookies** gestionadas por el backend. El cliente JavaScript nunca accede directamente a los tokens JWT; el navegador los envía automáticamente en cada petición gracias a `withCredentials: true`. Esto protege contra ataques XSS que intenten robar tokens del almacenamiento del navegador.

El estado de sesión del lado del cliente se mantiene en `AuthService` mediante **Angular Signals**, sin persistencia local. Al recargar la página, el servicio consulta al backend para restaurar la sesión a partir de la cookie existente.

---

## AuthService

**Ubicación**: `src/app/services/auth/auth.ts`

`AuthService` es el único punto de verdad del estado de autenticación en el frontend. Es un singleton (`providedIn: 'root'`) que expone el estado como Signals de solo lectura.

### Signals y Valores Derivados

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `user` | `Signal<User \| null>` | Usuario autenticado. `null` si no hay sesión. |
| `isAuthenticated` | `computed<boolean>` | Derivado de `user !== null`. |
| `currentRoles` | `computed<Role[]>` | Roles del usuario activo. Array vacío si no hay sesión. |
| `profileCompleteness` | `computed<number>` | Porcentaje de completitud del perfil (0–100). |
| `emailVerified` | `computed<boolean>` | Si el usuario confirmó su dirección de email. |
| `isVerified` | `computed<boolean>` | Si un administrador verificó manualmente al usuario. |
| `hasPersonalInfo` | `computed<boolean>` | Si el usuario completó sus datos personales (DNI, teléfono, dirección). |
| `canRequestVerification` | `computed<boolean>` | Si cumple los requisitos para solicitar verificación administrativa. |

### Cálculo de `profileCompleteness`

El porcentaje se obtiene prioritariamente del backend. Si no está disponible, se calcula localmente con la misma lógica:

```
 25%  →  Cuenta creada (valor base)
+25%  →  Email verificado (emailVerified = true)
+50%  →  Datos personales completos (hasPersonalInfo = true)
────
100%  →  Perfil completo
```

### Métodos de la API del Servicio

```typescript
login(credentials: LoginRequest): Observable<User>
// POST /api/auth/login — Inicia sesión y actualiza el estado interno.

register(data: RegisterRequest): Observable<User>
// POST /api/auth/register — Registra un usuario y lo deja autenticado.

logout(): Observable<void>
// DELETE /api/auth/logout — Invalida la cookie en el servidor y limpia el estado local.

refresh(): Observable<User>
// POST /api/auth/refresh — Solicita un nuevo access token usando el refresh token de la cookie.
// Actualiza el estado interno con los datos del usuario renovados.

refreshIfStale(maxAgeMs: number): void
// Ejecuta refresh() solo si el último sync con el backend supera el umbral de antigüedad.
// Usado por roleGuard para mantener roles actualizados sin forzar re-login.
```

---

## Interceptor HTTP de Autenticación

**Ubicación**: `src/app/interceptors/auth.interceptor.ts`

El interceptor se registra globalmente como `HttpInterceptorFn` en `app.config.ts`. Su responsabilidad principal es gestionar los errores `401 Unauthorized` de forma transparente, intentando renovar el token antes de fallar definitivamente.

### Árbol de Decisión ante un Error 401

```
Request HTTP → responde 401
        │
        ├─► ¿URL de verificación de email?    → Sí  → Propagar error (ruta pública)
        │
        ├─► ¿Primera navegación sin completar? → Sí  → Propagar error (estado inicial)
        │
        ├─► ¿Endpoint de auth propio?          → Sí  → Propagar error (evita bucle)
        │   (/login, /register, /refresh, /logout)
        │
        ├─► ¿Refresh ya en curso?              → Sí  → Encolar request y esperar resultado
        │
        └─► Iniciar refresh
                │
                ├─► Éxito → Reintentar el request original con la nueva sesión
                │
                └─► Error → Limpiar sesión + redirigir a /
```

### Gestión de Requests Concurrentes

Si varios requests fallan con 401 simultáneamente, solo uno inicia el proceso de refresh. Los demás se encolan mediante un array de callbacks:

```typescript
let isRefreshing = false;
let pendingRequests: Array<() => void> = [];
```

Una vez que el refresh completa exitosamente, `processPendingRequests()` ejecuta todos los callbacks encolados, reintentando cada request original. Este mecanismo evita múltiples llamadas a `/api/auth/refresh` en paralelo y garantiza que todos los requests fallidos se recuperen de forma ordenada.

---

## Ciclos de Vida de Autenticación

### Login

```
Usuario envía credenciales
    ↓
AuthService.login({ email, password })
    ↓
POST /api/auth/login
    ↓
Backend: valida credenciales, genera tokens, setea HTTP-only cookies
    ↓
Respuesta: datos del usuario (sin tokens en el body)
    ↓
AuthService: userSignal.set(responseData.user)
    ↓
Signals derivados se recalculan automáticamente
    ↓
Router navega según los roles del usuario
```

### Registro

```
Usuario completa el formulario de registro
    ↓
AuthService.register({ username, email, password })
    ↓
POST /api/auth/register
    ↓
Backend: crea usuario, envía email de verificación, genera tokens
    ↓
AuthService: actualiza userSignal (usuario queda autenticado)
    ↓
UI muestra indicación para verificar el email
```

### Verificación de Email

```
Usuario recibe email → hace clic en el link
    ↓
Navegador abre /verify-email?token=<jwt>
    ↓
EmailVerificationComponent extrae el token de la URL
(soporta path param, query param y hash)
    ↓
EmailVerificationService.verify(token)
    ↓
POST /api/auth/verify-email/:token
    ↓
Backend: valida token, marca emailVerified = true en la base de datos
    ↓
Componente muestra resultado (éxito / error / token expirado)
```

### Recuperación de Contraseña

```
1. Usuario accede a /forgot-password
   → POST /api/auth/forgot-password  (envía email con link)

2. Usuario hace clic en el link del email → /reset-password/:token
   → ResetPasswordComponent valida y envía nueva contraseña
   → POST /api/auth/reset-password/:token

3. Backend invalida el token y actualiza la contraseña
4. Usuario es redirigido a / para iniciar sesión
```

### Logout

```
AuthService.logout()
    ↓
DELETE /api/auth/logout
    ↓
Backend invalida el refresh token y limpia las cookies
    ↓
AuthService: userSignal.set(null)
    ↓
Guards redirigen automáticamente las rutas protegidas a /
```

---

## Modelo de Datos: Usuario

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  isActive: boolean;
  isVerified: boolean;       // Verificación manual por administrador
  emailVerified: boolean;    // Confirmación del email por el usuario
  profileCompleteness: number;
  hasPersonalInfo: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  person?: PersonInfo | null;
}

interface PersonInfo {
  dni: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

enum Role {
  ADMIN       = 'ADMIN',
  PARTNER     = 'PARTNER',
  DISTRIBUTOR = 'DISTRIBUTOR',
  CLIENT      = 'CLIENT',
  USER        = 'USER',
  AUTHORITY   = 'AUTHORITY',
}
```

---

## Consideraciones de Seguridad

**HTTP-only cookies**: Los tokens nunca son accesibles desde JavaScript, eliminando el riesgo de robo por XSS. El navegador los gestiona y envía automáticamente.

**`withCredentials: true`**: Todas las peticiones al backend incluyen este flag para que el navegador adjunte las cookies de dominio cruzado (aplica en desarrollo donde frontend y backend están en puertos distintos).

**Exclusión del refresh en endpoints de auth**: El interceptor identifica y excluye los endpoints `/login`, `/register`, `/refresh` y `/logout` del ciclo de refresh automático para evitar bucles infinitos.

**Bypass de desarrollo**: La comprobación `localStorage.getItem('authBypass')` existe únicamente para facilitar el desarrollo frontend sin backend. No representa un riesgo en producción dado que opera únicamente en la capa de guards del cliente, sin saltear ninguna validación del servidor.
