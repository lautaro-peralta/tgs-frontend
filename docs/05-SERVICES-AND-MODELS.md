# 05 — Servicios y Modelos de Datos

## Convenciones de los Servicios

Todos los servicios del dominio siguen un conjunto de convenciones consistentes:

**Singleton global**: `@Injectable({ providedIn: 'root' })` asegura una única instancia compartida en toda la aplicación.

**Inyección funcional**: las dependencias se declaran con `inject()` como propiedades de clase, siguiendo el estilo moderno de Angular.

**Rutas relativas**: las peticiones usan siempre `/api/...` sin hostname. El proxy de desarrollo y los rewrites de Vercel se encargan de resolver el destino real según el entorno.

**Cookies en cada petición**: todas las llamadas incluyen `withCredentials: true` para que el navegador adjunte las cookies de sesión en requests cross-origin.

**Respuesta envuelta**: el backend retorna `{ success, message, data, meta }`. Los servicios mapean el campo `data` antes de emitir el resultado al componente.

---

## Servicios de Dominio

### AuthService
**Archivo**: `src/app/services/auth/auth.ts`

Servicio central de autenticación. Gestiona el estado de sesión con Angular Signals y expone las operaciones del ciclo de vida de autenticación. Documentado en profundidad en [04-AUTH-FLOW.md](04-AUTH-FLOW.md).

| Método | Endpoint | Descripción |
|--------|---------|-------------|
| `login(credentials)` | `POST /api/auth/login` | Inicia sesión |
| `register(data)` | `POST /api/auth/register` | Registra y autentica al usuario |
| `logout()` | `DELETE /api/auth/logout` | Cierra sesión e invalida cookies |
| `refresh()` | `POST /api/auth/refresh` | Renueva el access token |
| `refreshIfStale(ms)` | — | Refresh condicional por antigüedad del estado |

---

### ProductService
**Archivo**: `src/app/services/product/product.ts`  
**Base URL**: `/api/products`

| Método | Verbo + Ruta | Descripción |
|--------|-------------|-------------|
| `getAllProducts()` | `GET /api/products` | Lista completa de productos |
| `getProduct(id)` | `GET /api/products/:id` | Producto por ID |
| `createProduct(payload)` | `POST /api/products` | Alta de producto |
| `updateProduct(id, payload)` | `PATCH /api/products/:id` | Actualización parcial |
| `deleteProduct(id)` | `DELETE /api/products/:id` | Baja de producto |
| `searchProducts(params)` | `GET /api/products/search` | Búsqueda con filtros |

Las peticiones de listado incluyen un timestamp y un string aleatorio como query params (`?_t=...&_r=...`) y headers `Cache-Control: no-cache` para prevenir respuestas cacheadas en todos los niveles de la cadena (browser, CDN, proxy).

**Parámetros de búsqueda**:
```typescript
interface ProductSearchParams {
  q?:     string;                    // Término libre
  by?:    'description' | 'legal';  // Campo de búsqueda
  min?:   number;                    // Precio mínimo
  max?:   number;                    // Precio máximo
  page?:  number;
  limit?: number;
}
```

---

### SaleService
**Archivo**: `src/app/services/sale/sale.ts`  
**Base URL**: `/api/sales`

| Método | Verbo + Ruta | Descripción |
|--------|-------------|-------------|
| `getAllSales()` | `GET /api/sales` | Todas las ventas del sistema |
| `getMyPurchases()` | `GET /api/sales/my-purchases` | Compras del usuario autenticado |
| `createSale(payload)` | `POST /api/sales` | Registra una nueva venta |
| `getSaleById(id)` | `GET /api/sales/:id` | Detalle de una venta |

Al crear una venta, el backend puede actualizar el rol del comprador (e.g., `USER → CLIENT` en la primera compra). La respuesta extiende la estructura estándar:

```typescript
interface CreateSaleResponse {
  saleId:          number;
  total:           number;
  userRoleUpdated: boolean;         // true si el rol del usuario cambió
  distributor?: {
    name:  string;
    phone: string;
    email: string;
    zone?: { id: number; name: string; isHeadquarters: boolean };
  };
}
```

---

### CartService
**Archivo**: `src/app/services/cart/cart.ts`

El `CartService` es el único servicio **sin comunicación HTTP**. Gestiona el estado del carrito de compras en memoria y lo persiste en `localStorage` bajo la clave `cart.v1`.

El estado se expone como Signals reactivos:

```typescript
readonly items = signal<CartItem[]>(this.load()); // Carga inicial desde localStorage
readonly count = computed(() => items().reduce((n, it) => n + it.qty, 0));
readonly total = computed(() => items().reduce((s, it) => s + it.price * it.qty, 0));
```

| Método | Descripción |
|--------|-------------|
| `add(product)` | Agrega al carrito. Si ya existe, incrementa la cantidad. |
| `inc(id)` | Incrementa en 1 la cantidad de un ítem. |
| `dec(id)` | Decrementa en 1. Elimina el ítem si la cantidad llega a 0. |
| `remove(id)` | Elimina un ítem directamente. |
| `clear()` | Vacía el carrito completo. |

Toda mutación llama internamente a `persist()`, que serializa el estado actual a `localStorage`.

---

### Servicios de Entidades de Negocio

Los siguientes servicios implementan operaciones CRUD estándar sobre sus respectivos recursos. Todos siguen el mismo patrón de `ProductService`.

| Servicio | Archivo | Base URL |
|---------|---------|---------|
| `ClientService` | `services/client/client.ts` | `/api/clients` |
| `DistributorService` | `services/distributor/distributor.ts` | `/api/distributors` |
| `AuthorityService` | `services/authority/authority.ts` | `/api/authorities` |
| `BribeService` | `services/bribe/bribe.ts` | `/api/bribes` |
| `ZoneService` | `services/zone/zone.ts` | `/api/zones` |
| `PartnerService` | `services/partner/partner.ts` | `/api/partners` |
| `MonthlyReviewService` | `services/monthly-review/monthly-review.ts` | `/api/monthly-reviews` |
| `ClandestineAgreementService` | `services/clandestine-agreement/clandestine-agreement.ts` | `/api/clandestine-agreements` |
| `DecisionService` | `services/decision/decision.ts` | `/api/decisions` |
| `ShelbyCouncilService` | `services/shelby-council/shelby-council.ts` | `/api/shelby-council` |
| `TopicService` | `services/topic/topic.ts` | `/api/topics` |

---

### StatsService
**Archivo**: `src/app/services/stats/stats.ts`  
**Base URL**: `/api/stats`

Provee los datos para los gráficos del panel de administración. Actualmente opera con `USE_MOCK_DATA = true`, retornando datos de muestra en lugar de consultar la API real.

```typescript
interface SalesStats {
  totalSales:          number;
  totalRevenue:        number;
  averageTicket:       number;
  salesByMonth:        { month: string; amount: number }[];
  topProducts:         { productId: number; productName: string; quantity: number }[];
  salesByDistributor:  { distributorName: string; totalSales: number }[];
}
```

---

### Servicios Auxiliares

| Servicio | Archivo | Responsabilidad |
|---------|---------|----------------|
| `AdminService` | `services/admin/admin.ts` | Operaciones exclusivas del rol ADMIN |
| `UserService` | `services/user/user.ts` | Perfil de usuario y actualización de datos personales |
| `ProductImageService` | `services/product-image/product-image.ts` | Upload y gestión de imágenes de productos |
| `PasswordResetService` | `services/password-reset/password-reset.service.ts` | Flujo de recuperación de contraseña |
| `I18nService` | `services/i18n/i18n.ts` | Wrapper de `TranslateService` con persistencia en `localStorage` |
| `AuthTransitionService` | `services/ui/auth-transition.ts` | Animaciones de transición en login/logout via GSAP |
| `EmailVerificationSyncService` | `services/email-verification-sync.service.ts` | Sincronización del estado de verificación entre pestañas del navegador |

---

## Modelos de Datos Principales

### User / PersonInfo / Role

```typescript
interface User {
  id:                   string;
  username:             string;
  email:                string;
  roles:                Role[];
  isActive:             boolean;
  isVerified:           boolean;      // Verificado por administrador
  emailVerified:        boolean;      // Email confirmado por el usuario
  profileCompleteness:  number;       // 0–100
  hasPersonalInfo:      boolean;
  createdAt:            string;
  updatedAt:            string;
  lastLoginAt?:         string;
  person?:              PersonInfo | null;
}

interface PersonInfo {
  dni:      string;
  name:     string;
  email:    string;
  phone:    string;
  address:  string;
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

### ProductDTO

```typescript
interface ProductDTO {
  id:               number;
  description:      string;
  legalDescription?: string;
  price:            number;
  stock?:           number;
  imageUrl?:        string | null;
  distributorId?:   number;
}
```

### CartItem

```typescript
interface CartItem {
  id:          number;
  description: string;
  price:       number;
  imageUrl?:   string | null;
  qty:         number;
}
```

### Respuesta estándar de la API

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data:    T;
  meta: {
    timestamp:  string;
    statusCode: number;
  };
}
```

Todos los servicios que retornan `Observable<EntidadDTO>` extraen internamente el campo `data` usando `.pipe(map(res => res.data))`, de modo que los componentes consumen directamente la entidad sin necesidad de conocer el envelope de la respuesta.
