import { inject } from '@angular/core';
import { Router, CanActivateFn, CanMatchFn, UrlSegment, Route } from '@angular/router';
import { AuthService } from '../services/auth/auth';
import { Role } from '../models/user/user.model';

function isPublicVerificationUrl(input: string): boolean {
  try {
    // Acepta tanto rutas absolutas como relativas del router
    const href = input.startsWith('http')
      ? input
      : (typeof window !== 'undefined'
          ? new URL(input, window.location.origin).href
          : input);

    const u = new URL(href);
    const pathOk = (u.pathname === '/verify-email') || u.pathname.startsWith('/verify-email/');
    const qOk = u.searchParams.has('token'); // /verify-email?token=...
    const hashOk = new URLSearchParams(u.hash.replace(/^#/, '')).has('token'); // /verify-email#token=...
    return pathOk || qOk || hashOk;
  } catch {
    // Fallback robusto si no se pudo parsear
    return input.startsWith('/verify-email');
  }
}

function isLoggedIn(auth: AuthService): boolean {
  return !!auth.isAuthenticated();
}
function segmentsToUrl(segments: UrlSegment[]): string {
  return '/' + segments.map(s => s.path).join('/');
}

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const url = state.url || '';
  if (isPublicVerificationUrl(url)) return true;
  if (isLoggedIn(auth)) return true;
  return router.createUrlTree(['/']);
};

export const authMatchGuard: CanMatchFn = (route: Route, segments: UrlSegment[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const url = segmentsToUrl(segments);
  if (isPublicVerificationUrl(url)) return true;
  if (isLoggedIn(auth)) return true;
  return router.createUrlTree(['/']);
};

export const roleGuard = (allowed: Role[]): CanActivateFn => {
  return (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const url = state.url || '';
    if (isPublicVerificationUrl(url)) return true;
    if (!isLoggedIn(auth)) return router.createUrlTree(['/']);

    // 🔄 Refresh roles if they're stale (older than 15 seconds)
    // This ensures role changes (like approved role requests) are reflected immediately
    auth.refreshIfStale(15000);

    const userRoles = auth.currentRoles();
    const ok = allowed.some(r => userRoles.includes(r));
    return ok ? true : router.createUrlTree(['/']);
  };
};

export const inboxGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const url = state.url || '';
  
  // Permitir URLs de verificación pública
  if (isPublicVerificationUrl(url)) return true;
  
  // Solo requiere estar autenticado
  if (isLoggedIn(auth)) {
    console.log('[InboxGuard] ✅ User authenticated, allowing access');
    return true;
  }
  
  console.log('[InboxGuard] ❌ User not authenticated, redirecting to login');
  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const url = state.url || '';
  if (isPublicVerificationUrl(url)) return true;
  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};
