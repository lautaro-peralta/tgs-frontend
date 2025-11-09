// src/app/services/auth/auth.service.ts
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { tap, catchError, switchMap, finalize, shareReplay } from 'rxjs/operators';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Estructura del usuario según el backend.
 * Mapea directamente con el DTO del endpoint /api/users/me
 */
export interface User {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  isActive: boolean;
  isVerified: boolean;
  emailVerified: boolean;
  profileCompleteness: number;
  hasPersonalInfo: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

/**
 * Roles disponibles en el sistema.
 * Debe coincidir con el enum Role del backend.
 */
export enum Role {
  ADMIN = 'ADMIN',
  PARTNER = 'PARTNER',
  DISTRIBUTOR = 'DISTRIBUTOR',
  CLIENT = 'CLIENT',
  AUTHORITY = 'AUTHORITY',
}

/**
 * Payload para login.
 */
export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Payload para registro.
 */
export interface RegisterPayload {
  email: string;
  password: string;
  username: string;
}

/**
 * Respuesta estándar del backend.
 */
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: {
    timestamp: string;
    statusCode: number;
  };
}

// ============================================================================
// SERVICIO DE AUTENTICACIÓN
// ============================================================================

@Injectable({ providedIn: 'root' })
export class AuthService {
  // --------------------------------------------------------------------------
  // DEPENDENCIAS
  // --------------------------------------------------------------------------
  private http = inject(HttpClient);
  private router = inject(Router);

  // --------------------------------------------------------------------------
  // ESTADO PRIVADO
  // --------------------------------------------------------------------------
  private userSignal = signal<User | null>(null);
  private loadingSignal = signal(false);
  private initializedSignal = signal(false);
  
  // Control de refresh token para evitar múltiples llamadas simultáneas
  private refreshingToken$ = new BehaviorSubject<boolean>(false);
  private refreshTokenRequest$: Observable<User> | null = null;

  // --------------------------------------------------------------------------
  // ESTADO PÚBLICO (READ-ONLY)
  // --------------------------------------------------------------------------
  
  /** Usuario autenticado actual (null si no hay sesión) */
  readonly user = this.userSignal.asReadonly();
  
  /** Indica si se está cargando información de autenticación */
  readonly loading = this.loadingSignal.asReadonly();
  
  /** Indica si el servicio ya intentó cargar la sesión inicial */
  readonly initialized = this.initializedSignal.asReadonly();

  // --------------------------------------------------------------------------
  // COMPUTADOS
  // --------------------------------------------------------------------------
  
  /** Usuario está autenticado */
  readonly isAuthenticated = computed(() => !!this.userSignal());
  
  /** Usuario tiene rol ADMIN */
  readonly isAdmin = computed(() => 
    this.userSignal()?.roles.includes(Role.ADMIN) ?? false
  );
  
  /** Usuario tiene rol PARTNER */
  readonly isPartner = computed(() => 
    this.userSignal()?.roles.includes(Role.PARTNER) ?? false
  );
  
  /** Usuario tiene rol DISTRIBUTOR */
  readonly isDistributor = computed(() => 
    this.userSignal()?.roles.includes(Role.DISTRIBUTOR) ?? false
  );
  
  /** Usuario tiene rol AUTHORITY */
  readonly isAuthority = computed(() => 
    this.userSignal()?.roles.includes(Role.AUTHORITY) ?? false
  );
  
  /** Usuario tiene rol CLIENT */
  readonly isClient = computed(() => 
    this.userSignal()?.roles.includes(Role.CLIENT) ?? false
  );
  
  /** Email del usuario está verificado */
  readonly emailVerified = computed(() => 
    this.userSignal()?.emailVerified ?? false
  );
  
  /** Usuario tiene información personal completa */
  readonly hasPersonalInfo = computed(() => 
    this.userSignal()?.hasPersonalInfo ?? false
  );
  
  /** Porcentaje de completitud del perfil (0-100) */
  readonly profileCompleteness = computed(() => 
    this.userSignal()?.profileCompleteness ?? 0
  );
  
  /** Usuario puede realizar compras (email verificado + datos personales) */
  readonly canPurchase = computed(() => {
    const u = this.userSignal();
    return u?.emailVerified && u?.hasPersonalInfo;
  });
  
  /** Usuario necesita completar su perfil */
  readonly needsProfileCompletion = computed(() => {
    const u = this.userSignal();
    return u && (!u.emailVerified || !u.hasPersonalInfo);
  });

  // --------------------------------------------------------------------------
  // CONSTRUCTOR
  // --------------------------------------------------------------------------
  constructor() {
    // Intentar restaurar sesión al iniciar la app
    this.initAuth();

    // Effect para debug en desarrollo (opcional)
    if (!this.isProduction()) {
      effect(() => {
        const user = this.userSignal();
        console.log('[AuthService] User state changed:', user);
      });
    }
  }

  // --------------------------------------------------------------------------
  // INICIALIZACIÓN
  // --------------------------------------------------------------------------

  /**
   * Intenta restaurar la sesión al iniciar la aplicación.
   * Se ejecuta automáticamente en el constructor.
   * 
   * Las cookies (access_token y refresh_token) se envían automáticamente
   * con cada request gracias a withCredentials:true en el interceptor.
   */
  private initAuth(): void {
    this.loadingSignal.set(true);

    this.me().subscribe({
      next: (user) => {
        this.userSignal.set(user);
        this.loadingSignal.set(false);
        this.initializedSignal.set(true);
        console.log('[AuthService] Session restored successfully');
      },
      error: (err) => {
        // No hay sesión válida, esto es normal
        this.userSignal.set(null);
        this.loadingSignal.set(false);
        this.initializedSignal.set(true);
        console.log('[AuthService] No active session found');
      }
    });
  }

  // --------------------------------------------------------------------------
  // AUTENTICACIÓN
  // --------------------------------------------------------------------------

  /**
   * Inicia sesión con email y contraseña.
   * 
   * El backend establece cookies HTTP-only con:
   * - access_token (válido 15 minutos)
   * - refresh_token (válido 7 días)
   * 
   * @param payload - Credenciales de usuario
   * @returns Observable con datos del usuario
   * 
   * @example
   * this.auth.login({ email: 'user@example.com', password: '123456' })
   *   .subscribe({
   *     next: (user) => console.log('Logged in:', user),
   *     error: (err) => console.error('Login failed:', err)
   *   });
   */
  login(payload: LoginPayload): Observable<User> {
    this.loadingSignal.set(true);

    return this.http.post<ApiResponse<User>>(
      '/api/auth/login',
      payload,
      { withCredentials: true }
    ).pipe(
      tap(res => {
        console.log('[AuthService] Login successful');
        this.userSignal.set(res.data);
      }),
      switchMap(res => of(res.data)),
      catchError(err => {
        console.error('[AuthService] Login failed:', err);
        this.userSignal.set(null);
        return throwError(() => err);
      }),
      finalize(() => this.loadingSignal.set(false))
    );
  }

  /**
   * Registra un nuevo usuario.
   * 
   * Nota: El registro NO inicia sesión automáticamente.
   * El usuario debe verificar su email y luego hacer login.
   * 
   * @param payload - Datos de registro
   * @returns Observable con datos del usuario creado
   * 
   * @example
   * this.auth.register({
   *   email: 'user@example.com',
   *   password: '123456',
   *   username: 'johndoe'
   * }).subscribe({
   *   next: (user) => console.log('Registered:', user),
   *   error: (err) => console.error('Registration failed:', err)
   * });
   */
  register(payload: RegisterPayload): Observable<User> {
    return this.http.post<ApiResponse<User>>(
      '/api/auth/register',
      payload,
      { withCredentials: true }
    ).pipe(
      tap(res => console.log('[AuthService] Registration successful')),
      switchMap(res => of(res.data)),
      catchError(err => {
        console.error('[AuthService] Registration failed:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Cierra la sesión del usuario.
   * 
   * El backend revoca el refresh_token y limpia las cookies.
   * 
   * @param redirectToLogin - Si debe redirigir a /login (default: true)
   * @returns Observable del resultado
   * 
   * @example
   * this.auth.logout().subscribe(() => {
   *   console.log('Logged out successfully');
   * });
   */
  logout(redirectToLogin: boolean = true): Observable<void> {
    return this.http.post<ApiResponse<void>>(
      '/api/auth/logout',
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => {
        console.log('[AuthService] Logout successful');
        this.userSignal.set(null);
        if (redirectToLogin) {
          this.router.navigate(['/login']);
        }
      }),
      switchMap(() => of(void 0)),
      catchError(err => {
        // Aunque el logout falle en el backend, limpiar estado local
        console.warn('[AuthService] Logout request failed, clearing local state');
        this.userSignal.set(null);
        if (redirectToLogin) {
          this.router.navigate(['/login']);
        }
        return of(void 0); // No propagar el error
      })
    );
  }

  // --------------------------------------------------------------------------
  // PERFIL DE USUARIO
  // --------------------------------------------------------------------------

  /**
   * Obtiene los datos del usuario autenticado actual.
   * 
   * Este endpoint requiere que las cookies (access_token) sean válidas.
   * Si el token expiró, el interceptor intentará refrescarlo automáticamente.
   * 
   * @returns Observable con datos del usuario
   * 
   * @example
   * this.auth.me().subscribe({
   *   next: (user) => console.log('Current user:', user),
   *   error: (err) => console.error('Not authenticated')
   * });
   */
  me(): Observable<User> {
    return this.http.get<ApiResponse<User>>(
      '/api/users/me',
      { withCredentials: true }
    ).pipe(
      tap(res => this.userSignal.set(res.data)),
      switchMap(res => of(res.data)),
      catchError(err => {
        console.error('[AuthService] Failed to fetch user profile:', err);
        if (err.status === 401) {
          this.userSignal.set(null);
        }
        return throwError(() => err);
      })
    );
  }


  
  /**
   * Refresca el perfil del usuario desde el backend.
   * Útil después de actualizar datos del usuario.
   * 
   * @returns Observable con datos actualizados
   */
  refreshProfile(): Observable<User> {
    return this.me();
  }

  // --------------------------------------------------------------------------
  // REFRESH TOKEN
  // --------------------------------------------------------------------------

  /**
   * Refresca el access_token usando el refresh_token.
   * 
   * Este método implementa:
   * - Prevención de llamadas simultáneas (solo 1 refresh a la vez)
   * - Compartir el resultado entre múltiples suscriptores
   * - Manejo de errores y limpieza de estado
   * 
   * Normalmente NO necesitas llamar esto manualmente, el interceptor
   * lo hace automáticamente cuando detecta un 401.
   * 
   * @returns Observable con datos del usuario refrescados
   */
  refreshToken(): Observable<User> {
    // Si ya hay un refresh en proceso, retornar el mismo observable
    if (this.refreshingToken$.value && this.refreshTokenRequest$) {
      console.log('[AuthService] Refresh token already in progress, reusing request');
      return this.refreshTokenRequest$;
    }

    console.log('[AuthService] Starting token refresh');
    this.refreshingToken$.next(true);

    // Crear y cachear el request
    this.refreshTokenRequest$ = this.http.post<ApiResponse<User>>(
      '/api/auth/refresh',
      {},
      { withCredentials: true }
    ).pipe(
      tap(res => {
        console.log('[AuthService] Token refreshed successfully');
        this.userSignal.set(res.data);
      }),
      switchMap(res => of(res.data)),
      catchError(err => {
        console.error('[AuthService] Token refresh failed:', err);
        this.userSignal.set(null);
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: this.router.url, reason: 'session_expired' }
        });
        return throwError(() => err);
      }),
      finalize(() => {
        this.refreshingToken$.next(false);
        this.refreshTokenRequest$ = null;
      }),
      shareReplay(1) // Compartir el resultado con múltiples suscriptores
    );

    return this.refreshTokenRequest$;
  }

  /**
   * Verifica si hay un refresh token en proceso.
   */
  isRefreshingToken(): boolean {
    return this.refreshingToken$.value;
  }

  // --------------------------------------------------------------------------
  // AUTORIZACIÓN
  // --------------------------------------------------------------------------

  /**
   * Verifica si el usuario tiene un rol específico.
   * 
   * @param role - Rol a verificar
   * @returns true si el usuario tiene el rol
   * 
   * @example
   * if (this.auth.hasRole(Role.ADMIN)) {
   *   console.log('User is admin');
   * }
   */
  hasRole(role: Role): boolean {
    return this.userSignal()?.roles.includes(role) ?? false;
  }

  /**
   * Verifica si el usuario tiene al menos uno de los roles especificados.
   * 
   * @param roles - Array de roles a verificar
   * @returns true si el usuario tiene alguno de los roles
   * 
   * @example
   * if (this.auth.hasAnyRole([Role.ADMIN, Role.PARTNER])) {
   *   console.log('User is admin or partner');
   * }
   */
  hasAnyRole(roles: Role[]): boolean {
    const userRoles = this.userSignal()?.roles ?? [];
    return roles.some(role => userRoles.includes(role));
  }

  /**
   * Verifica si el usuario tiene todos los roles especificados.
   * 
   * @param roles - Array de roles requeridos
   * @returns true si el usuario tiene todos los roles
   * 
   * @example
   * if (this.auth.hasAllRoles([Role.CLIENT, Role.PARTNER])) {
   *   console.log('User is both client and partner');
   * }
   */
  hasAllRoles(roles: Role[]): boolean {
    const userRoles = this.userSignal()?.roles ?? [];
    return roles.every(role => userRoles.includes(role));
  }

  /**
   * Verifica si el usuario puede realizar una acción específica.
   * 
   * @param action - Acción a verificar
   * @returns true si el usuario puede realizar la acción
   * 
   * @example
   * if (this.auth.can('purchase')) {
   *   console.log('User can make purchases');
   * }
   */
  can(action: 'purchase' | 'admin' | 'manage_users'): boolean {
    const user = this.userSignal();
    if (!user) return false;

    switch (action) {
      case 'purchase':
        return user.emailVerified && user.hasPersonalInfo;
      
      case 'admin':
        return user.roles.includes(Role.ADMIN);
      
      case 'manage_users':
        return user.roles.includes(Role.ADMIN);
      
      default:
        return false;
    }
  }

  // --------------------------------------------------------------------------
  // UTILIDADES
  // --------------------------------------------------------------------------

  /**
   * Obtiene el nombre de display del usuario.
   * Retorna el username o email si no hay username.
   */
  getDisplayName(): string {
    const user = this.userSignal();
    return user?.username || user?.email || 'Usuario';
  }

  /**
   * Obtiene las iniciales del usuario para avatares.
   * 
   * @example
   * "John Doe" → "JD"
   * "john@example.com" → "J"
   */
  getInitials(): string {
    const user = this.userSignal();
    if (!user) return '?';

    if (user.username) {
      const parts = user.username.split(/[\s_-]/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.username.substring(0, 2).toUpperCase();
    }

    return user.email[0].toUpperCase();
  }

  /**
   * Verifica si está en modo producción.
   */
  private isProduction(): boolean {
    return typeof window !== 'undefined' && 
           window.location.hostname !== 'localhost';
  }

  /**
   * Obtiene sugerencias para mejorar el perfil del usuario.
   * 
   * @returns Array de mensajes sugeridos
   */
  getProfileSuggestions(): string[] {
    const user = this.userSignal();
    if (!user) return [];

    const suggestions: string[] = [];

    if (!user.emailVerified) {
      suggestions.push('Verifica tu email para habilitar todas las funciones');
    }

    if (!user.hasPersonalInfo) {
      suggestions.push('Completa tu información personal para poder realizar compras');
    }

    if (user.profileCompleteness < 100) {
      suggestions.push(`Tu perfil está ${user.profileCompleteness}% completo`);
    }

    return suggestions;
  }

  /**
   * Obtiene todos los usuarios verificados elegibles para conversión de roles.
   * 
   * Criterios:
   * - isVerified = true (verificado por admin)
   * - profileCompleteness = 100 (datos personales completos)
   * - hasPersonalInfo = true (todos los campos de person completados)
   * 
   * Puede filtrar por rol objetivo para asegurar compatibilidad:
   * - AUTHORITY: excluye usuarios con roles PARTNER, DISTRIBUTOR, ADMIN
   * - PARTNER: excluye usuarios con rol AUTHORITY
   * - DISTRIBUTOR: excluye usuarios con rol AUTHORITY
   * 
   * @param targetRole - Rol objetivo opcional para filtrar por compatibilidad
   * @returns Observable con array de usuarios verificados
   * 
   * @example
   * // Sin filtro
   * this.authSrv.getAllVerifiedUsers().subscribe({
   *   next: (users) => console.log('Verified users:', users),
   *   error: (err) => console.error('Failed to load users')
   * });
   * 
   * // Con filtro por rol
   * this.authSrv.getAllVerifiedUsers('AUTHORITY').subscribe({
   *   next: (users) => console.log('Users eligible for AUTHORITY:', users)
   * });
   */
  getAllVerifiedUsers(targetRole?: 'AUTHORITY' | 'PARTNER' | 'DISTRIBUTOR'): Observable<User[]> {
    const url = targetRole
      ? `/api/users/verified?targetRole=${targetRole}`
      : '/api/users/verified';

    console.log(`[AuthService] Requesting verified users from: ${url}`);

    return this.http.get<ApiResponse<User[]>>(
      url,
      { withCredentials: true }
    ).pipe(
      switchMap(res => {
        const verified = res.data || [];
        console.log(`[AuthService] Response received:`, res);
        console.log(`[AuthService] Loaded ${verified.length} verified users${targetRole ? ` eligible for ${targetRole}` : ''}`);
        return of(verified);
      }),
      catchError(err => {
        console.error('[AuthService] ❌ Error fetching verified users:', err);
        console.error('[AuthService] ❌ Status:', err?.status);
        console.error('[AuthService] ❌ Error body:', err?.error);
        console.error('[AuthService] ❌ This is likely a backend permission issue - Partner role may not have access to this endpoint');
        return of([]);  // Retornar array vacío en caso de error
      })
    );
  }
}
