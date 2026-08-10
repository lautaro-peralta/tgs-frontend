# 07 — Sistema de Diseño

## Fundamentos

El sistema de diseño de TGS está construido sobre **SCSS** como lenguaje de estilos y **CSS Custom Properties** (variables nativas del navegador) como mecanismo de theming en runtime. Esta combinación permite aprovechar la potencia de SCSS (mixins, funciones, nesting, partials) durante la compilación y la flexibilidad de las variables CSS (heredables, sobreescribibles en tiempo de ejecución) para el tema visual. No se utiliza ningún framework de UI externo (Bootstrap, Material, etc.); todo el sistema está desarrollado a medida.

La paleta y los valores base del tema se declaran en `:root` dentro de `src/styles.scss`, y los mixins y breakpoints del sistema responsive están centralizados en el partial `src/app/styles/_responsive.scss`, importado desde `styles.scss` y disponible en cualquier componente que lo importe explícitamente.

---

## Tokens de Diseño

### Paleta de Color

El sistema de color está inspirado en la estética de Peaky Blinders: fondos en carbón profundo, texto en tonos marfil y pergamino, y el color de acento en latón/dorado que recorre la identidad visual del sistema.

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#0b0e11` | Fondo base de la aplicación |
| `--bg-elev` | `#11161b` | Superficies elevadas (cards, modals) |
| `--bg-panel` | `#0f1419` | Inputs, paneles internos |
| `--text` | `#f2f0ec` | Texto principal |
| `--muted` | `#d8cebc` | Texto secundario, placeholders, hints |
| `--accent` | `#c3a462` | Color de acento principal (dorado/latón) |
| `--accent-700` | `#a4884f` | Variante oscurecida del acento (hover states) |
| `--accent-900` | `#6e5a32` | Variante más oscura (estados activos) |
| `--danger` | `#8b2e2e` | Errores, acciones destructivas |
| `--success` | `#3f7d63` | Confirmaciones, estados exitosos |
| `--border` | `rgba(255, 245, 225, .12)` | Bordes sutiles sobre fondos oscuros |
| `--shadow` | `0 18px 40px rgba(0, 0, 0, .45)` | Sombras de paneles flotantes |
| `--radius` | `14px` | Radio de borde estándar |

### Tipografía

La escala tipográfica usa `clamp()` para adaptarse fluidamente al viewport sin necesidad de media queries específicas para cada tamaño.

| Token | Valor | Uso |
|-------|-------|-----|
| `--h1` | `clamp(28px, 3.2vw, 40px)` | Títulos principales |
| `--h2` | `clamp(22px, 2.4vw, 28px)` | Subtítulos de sección |
| `--h3` | `clamp(18px, 2vw, 22px)` | Encabezados de componente |

La familia tipográfica base es `'Google Sans Code'` con fallback a la pila del sistema (`system-ui, -apple-system, Segoe UI, Roboto, Arial`).

### Espaciado

Sistema de escala de 8pt con un slot adicional en 4px para micro-espacios:

| Token | Valor |
|-------|-------|
| `--sp-1` | `4px` |
| `--sp-2` | `8px` |
| `--sp-3` | `12px` |
| `--sp-4` | `16px` |
| `--sp-5` | `24px` |
| `--sp-6` | `32px` |

### Navbar

```scss
:root { --nav-h: 72px; }
```

La altura de la navbar se expone como token para que cualquier componente pueda calcular offsets de contenido de forma coherente (ej. `padding-top: var(--nav-h)`).

---

## Componente GlassPanel

**Archivo**: `src/app/shared/ui/glass-panel/glass-panel.component.ts`  
**Selector**: `<app-glass-panel>`

`GlassPanelComponent` encapsula el efecto glassmorphism en un componente standalone reutilizable. Combina `backdrop-filter: blur()` con un fondo semi-transparente para crear superficies translúcidas sobre el fondo oscuro de la aplicación.

### Inputs

| Input | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `blurPx` | `number` | `12` | Intensidad del desenfoque de fondo en píxeles |
| `alpha` | `number` | `0.12` | Opacidad del fondo (0 = completamente transparente) |
| `padding` | `string` | `'1rem'` | Padding interno del panel |
| `radius` | `string` | `'16px'` | Radio de borde del panel |

### Estilos del Componente

Los estilos están definidos inline en el decorador `@Component` usando SCSS. Al ser un componente standalone con encapsulación de vista, Angular los scopes automáticamente para que no afecten al resto del DOM.

```scss
.glass {
  border-radius:    var(--glass-radius, 16px);
  border:           1px solid rgba(255, 255, 255, 0.18);
  background:       rgba(255, 255, 255, var(--glass-alpha, 0.12));
  box-shadow:       0 8px 32px rgba(2, 8, 20, 0.18);
  backdrop-filter:  blur(var(--glass-blur, 12px)) saturate(1.2);
  -webkit-backdrop-filter: blur(var(--glass-blur, 12px)) saturate(1.2);
}
```

El componente incluye un fallback para navegadores sin soporte a `backdrop-filter` (ej. versiones antiguas de Firefox), usando la directiva `@supports` de SCSS/CSS:

```scss
@supports not (backdrop-filter: blur(4px)) {
  .glass {
    background: rgba(245, 245, 245, 0.90);
    color: #0b1220;
  }
}
```

### Uso

```html
<app-glass-panel [blurPx]="16" [alpha]="0.15" padding="2rem" radius="20px">
  <!-- Contenido del panel -->
</app-glass-panel>
```

---

## Sistema Responsive

**Archivo**: `src/app/styles/_responsive.scss`

El sistema responsive sigue un enfoque **mobile-first**: los estilos base apuntan a pantallas pequeñas y se van sobreescribiendo hacia viewports más grandes mediante `min-width`.

### Breakpoints

| Alias | Valor | Dispositivo objetivo |
|-------|-------|---------------------|
| `xs` | `375px` | Mobile compacto |
| `sm` | `640px` | Mobile estándar |
| `md` | `768px` | Tablet |
| `lg` | `1024px` | Desktop |
| `xl` | `1280px` | Desktop grande |
| `2xl` | `1536px` | Pantallas extra anchas |

### Mixins Disponibles

Los mixins se importan con `@import 'app/styles/responsive'` desde el `styles.scss` del componente.

**Media queries**:
```scss
@include min-width(md) { ... }      // min-width: 768px
@include max-width(sm) { ... }      // max-width: 639px
@include between(sm, lg) { ... }    // 640px ≤ viewport < 1024px
```

**Layout**:
```scss
@include stack-to-row(md, 1rem) { ... }  // Column en mobile, row en md+
@include container(1200px) { ... }       // Max-width con padding clamp()
@include grid(3, 1.5rem) { ... }         // Grid de N columnas iguales
```

**Tipografía fluida**:
```scss
@include fluid-type(16px, 24px) { ... }  // Font-size adaptable entre 375px y 1200px
```

**Texto**:
```scss
@include truncate { ... }        // Trunca en una línea con ellipsis
@include line-clamp(2) { ... }   // Trunca en N líneas (line-clamp)
```

**Accesibilidad táctil**:
```scss
@include touch-target { ... }    // Área mínima de 44×44px (WCAG 2.5.5)
```

### Clases Utilitarias Globales

| Clase | Comportamiento |
|-------|---------------|
| `.hide-mobile` | `display: none` en mobile, visible en `md+` |
| `.show-mobile` | Visible en mobile, `display: none` en `md+` |
| `.text-center-mobile` | Centrado en mobile, left-aligned en `md+` |
| `.pad-edge` | Padding lateral `clamp(12px, 3vw, 32px)` |
| `.edge-to-edge` | Rompe el container y ocupa el 100% del viewport |
| `.no-scroll` | Bloquea el scroll del body (usado cuando el panel de login está abierto) |

---

## Estilos Globales

**Archivo**: `src/styles.scss`

Archivo SCSS de entrada global de la aplicación. Define el reset, los tokens del tema (como CSS Custom Properties en `:root`) y estilos de base. Angular encapsula los estilos de cada componente en su propio scope, por lo que este archivo es el único punto donde los estilos tienen alcance global sin encapsulación.

Las CSS Custom Properties declaradas en `:root` sí son accesibles desde los estilos de cualquier componente, ya que operan a nivel del DOM y no están sujetas a la encapsulación de Angular.

### Scrollbar Personalizada

La scrollbar del sistema está estilizada para mantener coherencia con el tema oscuro:

```scss
// Firefox
* { scrollbar-width: thin; scrollbar-color: rgba(100, 200, 255, 0.25) #0a0e27; }

// Chromium / Safari
::-webkit-scrollbar        { width: 10px; }
::-webkit-scrollbar-track  { background: #0a0e27; border-radius: 5px; }
::-webkit-scrollbar-thumb  { background: rgba(100, 200, 255, 0.25); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: rgba(100, 200, 255, 0.4); }
```

---

## Animaciones

Todas las animaciones de la aplicación están implementadas en **SCSS puro**, mediante `@keyframes` definidos en los archivos de estilos de cada componente y el partial dedicado `src/app/features/inbox/components/role-requests/styles/_animations.scss`.

### Keyframes Globales Más Utilizados

| Keyframe | Efecto | Uso típico |
|----------|--------|-----------|
| `fadeIn` | Aparición con desplazamiento vertical sutil | Entrada de cards y paneles |
| `slideDown` | Expansión de `max-height` con fade | Acordeones y secciones colapsables |
| `slideUp` | Entrada desde abajo con fade | Modales y overlays |
| `slideInDown` / `slideOutUp` | Entrada/salida con escala y traslación vertical | Navbar, notificaciones |
| `fall` | Caída continua con rotación | Partículas decorativas del fondo de la home |
| `layoutFadeIn` | Aparición suave de la vista completa | Transición entre rutas |
| `shake` | Vibración horizontal | Feedback de error en formularios |
| `spin` | Rotación continua | Indicadores de carga (spinner) |
| `progressBar` | Reducción de ancho de 100% a 0% | Barras de progreso temporizadas |

### `AuthTransitionService`

**Archivo**: `src/app/services/ui/auth-transition.ts`

Este servicio no realiza animaciones por sí mismo. Su responsabilidad es gestionar el **estado de la transición de autenticación** mediante Angular Signals, exponiendo fases (`loading` / `success`) y modos (`login` / `logout`) que los componentes leen para aplicar las clases SCSS correctas en cada momento:

```typescript
readonly transitioning = signal(false);
readonly phase         = signal<'loading' | 'success'>('loading');
readonly mode          = signal<'login' | 'logout'>('login');
```

Los componentes consumen estas señales y añaden o quitan clases CSS que activan los `@keyframes` correspondientes, manteniendo la lógica de coordinación separada de la definición visual de las animaciones.
