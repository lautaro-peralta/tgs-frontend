// src/app/interceptors/auth.interceptor.ts
import { inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpRequest,
  HttpEvent,
} from '@angular/common/http';
import { catchError, filter, switchMap } from 'rxjs/operators';
import { throwError, Observable } from 'rxjs';
import { AuthService } from '../services/auth/auth';

// ============================================================================
// FLAGS Y ESTADO GLOBAL
// ============================================================================

/** Flag para saber si ya terminó la primera navegación real */
let hasNavigatedOnce = false;

/** Flag para evitar múltiples refresh simultáneos */
let isRefreshing = false;

/** Cola de requests que esperan a que termine el refresh */
let pendingRequests: Array<() => void> = [];

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Verifica si la URL es de verificación de email (pública)
 */
function isPublicVerificationHref(href: string): boolean {
  try {
    const u = href.startsWith('http')
      ? new URL(href)
      : new URL(href, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    
    const pathOk = (u.pathname === '/verify-email') || u.pathname.startsWith('/verify-email/');
    const qOk = u.searchParams.has('token');
    const hashOk = new URLSearchParams(u.hash.replace(/^#/, '')).has('token');
    
    return pathOk || qOk || hashOk;
  } catch {
    return href.includes('/verify-email');
  }
}

/**
 * Verifica si la URL es un endpoint de autenticación que no debe ser interceptado
 */
function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/auth/login') || 
         url.includes('/api/auth/register') || 
         url.includes('/api/auth/refresh') ||
         url.includes('/api/auth/logout');
}

/**
 * Procesa las requests pendientes en la cola
 */
function processPendingRequests(): void {
  pendingRequests.forEach(callback => callback());
  pendingRequests = [];
}

/**
 * Rechaza todas las requests pendientes
 */
function rejectPendingRequests(error: any): void {
  pendingRequests.forEach(callback => callback());
  pendingRequests = [];
}

// ============================================================================
// INTERCEPTOR PRINCIPAL
// ============================================================================

/**
 * Interceptor de autenticación con soporte para refresh token automático
 *
 * Características:
 * - No redirige en 401 si estás en verificación de email
 * - No redirige durante la primera navegación
 * - Refresca automáticamente el access token cuando expira (401)
 * - Evita múltiples refresh simultáneos (cola de requests)
 * - Reintenta requests fallidos después de refrescar
 */
export const authInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Marcar cuando finalice la primera navegación real
  router.events
    .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
    .subscribe(() => { hasNavigatedOnce = true; });

  return next(req).pipe(
    catchError((error: HttpErrorResponse): Observable<HttpEvent<unknown>> => {
      // ======================================================================
      // MANEJO DE ERRORES 401 (No Autorizado)
      // ======================================================================
      
      if (error?.status === 401) {
        const href = typeof window !== 'undefined' && window.location?.href
          ? window.location.href
          : (router.url || '/');

        // 1) No interferir en verificación de email
        if (isPublicVerificationHref(href)) {
          console.log('[AuthInterceptor] 📧 Verification page - passing through 401');
          return throwError(() => error);
        }

        // 2) No interferir durante la primera navegación
        if (!hasNavigatedOnce) {
          console.log('[AuthInterceptor] 🚀 Initial navigation - passing through 401');
          return throwError(() => error);
        }

        // 3) No intentar refresh en endpoints de autenticación
        if (isAuthEndpoint(req.url)) {
          console.log('[AuthInterceptor] 🔐 Auth endpoint - passing through 401');
          return throwError(() => error);
        }

        // 4) Intentar refresh del token
        console.log('[AuthInterceptor] 🔄 401 detected - attempting token refresh');

        // Si ya hay un refresh en curso, agregar a la cola
        if (isRefreshing) {
          console.log('[AuthInterceptor] ⏳ Refresh in progress - queuing request');
          
          return new Observable(observer => {
            pendingRequests.push(() => {
              // Reintentar el request original
              next(req).subscribe({
                next: (event) => observer.next(event),
                error: (err) => observer.error(err),
                complete: () => observer.complete()
              });
            });
          });
        }

        // Marcar que estamos refrescando
        isRefreshing = true;
        console.log('[AuthInterceptor] 🔄 Starting token refresh...');

        // Intentar refrescar el token
        return authService.refresh().pipe(
          switchMap((user) => {
            console.log('[AuthInterceptor] ✅ Token refreshed successfully:', user.username);
            isRefreshing = false;
            
            // Procesar todos los requests que estaban en cola
            processPendingRequests();
            
            // Reintentar el request original
            console.log('[AuthInterceptor] 🔁 Retrying original request');
            return next(req);
          }),
          catchError((refreshError) => {
            console.error('[AuthInterceptor] ❌ Token refresh failed:', refreshError);
            isRefreshing = false;
            
            // Rechazar todos los requests pendientes
            rejectPendingRequests(refreshError);
            
            // Limpiar sesión y redirigir al login
            console.log('[AuthInterceptor] 🚪 Logging out and redirecting to home');
            authService.logout().subscribe({
              error: () => {
                // Asegurar redirección incluso si el logout falla
                router.navigateByUrl('/');
              }
            });
            
            return throwError(() => refreshError);
          })
        );
      }

      // ======================================================================
      // OTROS ERRORES HTTP
      // ======================================================================
      
      // Para otros errores, simplemente pasar al siguiente handler
      return throwError(() => error) as Observable<HttpEvent<unknown>>;
    })
  ) as Observable<HttpEvent<unknown>>;
};