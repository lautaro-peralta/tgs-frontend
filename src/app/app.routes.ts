/**
 * Configuración de rutas de la aplicación
 */
import { Routes } from '@angular/router';
import {
  authGuard,
  guestGuard,
  inboxGuard,
  roleGuard,
} from './guards/auth.guard';
import { Role } from './models/user/user.model';

export const routes: Routes = [
  // ═══════════════════════════════════════════════════════════════════════
  // ⚠️ CRÍTICO: verify-email DEBE estar PRIMERO y SIN guards
  // ═══════════════════════════════════════════════════════════════════════
  
  // ✅ Verificación de email (PÚBLICA - sin guards)
  {
  path: 'verify-email',
  loadComponent: () =>
    import('./features/inbox/email-verification/email-verification')
      .then(m => m.EmailVerificationComponent),
  title: 'Verificar Email - GarrSYS'
},
  
  {
    path: 'verify-email/:token',
    loadComponent: () => import('./features/inbox/email-verification/email-verification').then(m => m.EmailVerificationComponent),
    title: 'Verificar Email - GarrSYS'
  },


  // ═══════════════════════════════════════════════════════════════════════
  // RUTAS PÚBLICAS
  // ═══════════════════════════════════════════════════════════════════════

  // Página principal
  {
    path: '', 
    loadComponent: () => import('./components/home/home').then(m => m.HomeComponent) 
  },
  
  // Páginas informativas
  {
    path: 'sobre-nosotros',
    loadComponent: () => import('./components/pages/about/about').then(m => m.AboutComponent)
  },
  {
    path: 'faqs',
    loadComponent: () => import('./components/pages/faqs/faqs').then(m => m.FaqsComponent)
  },
  {
    path: 'contactanos',
    loadComponent: () => import('./components/pages/contact/contact').then(m => m.ContactComponent)
  },

  // Páginas legales
  {
    path: 'terminos',
    loadComponent: () => import('./components/legal/terms').then(m => m.TermsComponent),
    title: 'Términos y Condiciones - GarrSYS'
  },
  {
    path: 'privacidad',
    loadComponent: () => import('./components/legal/privacy').then(m => m.PrivacyComponent),
    title: 'Política de Privacidad - GarrSYS'
  },
  {
    path: 'cookies',
    loadComponent: () => import('./components/legal/cookies').then(m => m.CookiesComponent),
    title: 'Política de Cookies - GarrSYS'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // RUTAS DE AUTENTICACIÓN (redirigen a home que tiene el panel integrado)
  // ═══════════════════════════════════════════════════════════════════════

  {
    path: 'login',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'register',
    redirectTo: '',
    pathMatch: 'full'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TIENDA
  // ═══════════════════════════════════════════════════════════════════════

  {
    path: 'tienda',
    loadComponent: () => import('./components/store/store').then(m => m.StoreComponent),
    canActivate: [
      authGuard,
      roleGuard([Role.CLIENT, Role.ADMIN, Role.PARTNER, Role.DISTRIBUTOR, Role.USER]),
    ]
  },

  {
  path: 'checkout',
  loadComponent: () => import('./components/checkout/checkout').then(m => m.CheckoutComponent),
  canActivate: [authGuard] // Si tienes guards de autenticación
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GESTIÓN DE CUENTA
  // ═══════════════════════════════════════════════════════════════════════

  {
    path: 'mi-cuenta',
    loadComponent: () => import('./components/account/account.js').then(m => m.AccountComponent),
    canActivate: [authGuard]
  },

  {
    path: 'mis-compras',
    loadComponent: () => import('./components/my-purchases/my-purchases').then(m => m.MyPurchasesComponent),
    canActivate: [authGuard],
    title: 'Mis Compras - GarrSYS'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // INBOX
  // ═══════════════════════════════════════════════════════════════════════

  {
    path: 'inbox',
    loadComponent: () => import('./features/inbox/pages/inbox-page').then(m => m.InboxPageComponent),
    canActivate: [inboxGuard]
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GESTIÓN DE NEGOCIO
  // ═══════════════════════════════════════════════════════════════════════

  {
    path: 'producto',
    loadComponent: () => import('./components/product/product.js').then(m => m.ProductComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.PARTNER, Role.DISTRIBUTOR])]
  },
  {
    path: 'cliente',
    loadComponent: () => import('./components/client/client.js').then(m => m.ClientComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.DISTRIBUTOR])]
  },
  {
    path: 'venta',
    loadComponent: () => import('./components/sale/sale.js').then(m => m.SaleComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.DISTRIBUTOR, Role.AUTHORITY])] // ✅ AGREGADO AUTHORITY
  },
  {
    path: 'zona',
    loadComponent: () => import('./components/zone/zone.js').then(m => m.ZoneComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.PARTNER, Role.DISTRIBUTOR])]
  },
  {
    path: 'autoridad',
    loadComponent: () => import('./components/authority/authority.js').then(m => m.AuthorityComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.PARTNER])]
  },
  {
    path: 'sobornos',
    loadComponent: () => import('./components/bribe/bribe.js').then(m => m.BribeComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.PARTNER, Role.AUTHORITY])] // ✅ AGREGADO AUTHORITY
  },
  {
    path: 'distribuidor',
    loadComponent: () => import('./components/distributor/distributor.js').then(m => m.DistributorComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.PARTNER])]
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GESTIÓN DE SOCIEDAD
  // ═══════════════════════════════════════════════════════════════════════

  {
    path: 'decision',
    loadComponent: () => import('./components/decision/decision.js').then(m => m.DecisionComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.PARTNER])]
  },
  {
    path: 'socio',
    loadComponent: () => import('./components/partner/partner.js').then(m => m.PartnerComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.PARTNER])]
  },
  {
    path: 'consejo-shelby',
    loadComponent: () => import('./components/shelby-council/shelby-council.js').then(m => m.ShelbyCouncilComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.PARTNER])]
  },
  {
    path: 'acuerdos-clandestinos',
    loadComponent: () => import('./components/clandestine-agreement/clandestine-agreement.js').then(m => m.ClandestineAgreementComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.PARTNER, Role.AUTHORITY])]
  },
  {
    path: 'revisiones-mensuales',
    loadComponent: () => import('./components/monthly-review/monthly-review.js').then(m => m.MonthlyReviewComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.PARTNER])]
  },
  {
    path: 'tematica',
    loadComponent: () => import('./components/topic/topic.js').then(m => m.TopicComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN, Role.PARTNER])]
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ADMINISTRACIÓN DEL SISTEMA
  // ═══════════════════════════════════════════════════════════════════════

  {
    path: 'admin',
    loadComponent: () => import('./components/admin/admin.js').then(m => m.AdminComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN])]
  },
  {
    path: 'solicitudes-rol',
    loadComponent: () => import('./features/inbox/components/role-requests/admin-role-requests-inbox.js').then(m => m.AdminRoleRequestsInboxComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN])]
  },
  {
    path: 'verificacion-mail',
    loadComponent: () => import('./features/inbox/email-verification/email-verification').then(m => m.EmailVerificationComponent),
    canActivate: [authGuard, roleGuard([Role.ADMIN])]
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PÁGINAS DE ERROR
  // ═══════════════════════════════════════════════════════════════════════

  {
    path: 'forbidden',
    loadComponent: () => import('./components/errors/forbidden/forbidden').then(m => m.ForbiddenComponent)
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FALLBACK (DEBE ESTAR AL FINAL)
  // ═══════════════════════════════════════════════════════════════════════

  {
    path: '**', 
    redirectTo: '' 
  }
];