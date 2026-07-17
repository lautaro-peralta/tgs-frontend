/**
 * Servicio de autenticación con soporte completo para refresh token
 * 
 * ✅ CARACTERÍSTICAS:
 * - Señales reactivas mejoradas para roles
 * - Refresh automático de tokens via interceptor
 * - Sincronización correcta de estado
 * - Cálculo de profileCompleteness sincronizado con backend
 * - Manejo robusto de errores y sesiones
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of, timer } from 'rxjs';
import { tap, catchError, map, take, timeout } from 'rxjs/operators';
import { Role, User } from '../../models/user/user.model';
import { logger } from '../../core/logger';

const API_URL = '';

export interface AuthResponse {
  success: boolean;
  message: string;
  data: User;
  meta: {
    timestamp: string;
    statusCode: number;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // ============================================================================
  // PROPIEDADES PRIVADAS
  // ============================================================================
  
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  
  /** Marca temporal del último sync exitoso con el backend */
  private _lastSyncAt = 0;
  
  /** Timer para auto-refresh del token */
  private _refreshTimer?: any;

  // ============================================================================
  // SEÑALES Y ESTADO REACTIVO
  // ============================================================================
  
  /** Estado del usuario usando Angular Signals */
  private readonly userSignal = signal<User | null>(null);

  /** Usuario en modo solo lectura */
  readonly user = this.userSignal.asReadonly();
  
  /** Verifica si el usuario está autenticado */
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  
  /** Roles actuales del usuario */
  readonly currentRoles = computed(() => this.userSignal()?.roles ?? []);

  /** Completitud del perfil sincronizada con el backend */
  readonly profileCompleteness = computed(() => {
    const user = this.userSignal();
    if (!user) return 0;

    // PRIORIDAD 1: Usar el valor del backend si existe
    if ((user as any).profileCompleteness !== undefined) {
      return (user as any).profileCompleteness;
    }

    // FALLBACK: Calcular manualmente (coincide con backend)
    let completeness = 25; // Base por tener una cuenta
    if ((user as any).isVerified) completeness += 25;      // +25% verificación del admin
    if ((user as any).hasPersonalInfo) completeness += 50; // +50% datos personales completos
    return Math.min(completeness, 100);
  });

  /** Indica si tiene información personal completa */
  readonly hasPersonalInfo = computed(() => (this.userSignal() as any)?.hasPersonalInfo ?? false);

  /** Indica si el email está verificado */
  readonly emailVerified = computed(() => this.userSignal()?.emailVerified ?? false);

  /** Indica si está verificado por un admin */
  readonly isVerified = computed(() => (this.userSignal() as any)?.isVerified ?? false);

  /** Indica si puede solicitar verificación */
  readonly canRequestVerification = computed(() => {
    const user = this.userSignal();
    if (!user) return false;

    const hasEmail = !!user.emailVerified;
    const hasPersonal = !!(user as any).hasPersonalInfo;
    const notVerified = !(user as any).isVerified;
    return hasEmail && hasPersonal && notVerified;
  });

  // BehaviorSubject para compatibilidad con código legacy
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  // ============================================================================
  // MÉTODOS PÚBLICOS - INICIALIZACIÓN
  // ============================================================================
  
  /**
   * Inicializa el estado de autenticación al cargar la aplicación
   * Intenta restaurar la sesión usando el refresh token existente
   */
  public initialize(): void {
    logger.debug('[AuthService] 🔄 Initializing auth state...');
    this.me().subscribe({
      next: (user) => {
        logger.debug('[AuthService] ✅ Session restored:', user);
        this.scheduleTokenRefresh();
      },
      error: (err) => {
        logger.debug('[AuthService] ℹ️ No active session:', err?.message || err);
      }
    });
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS - AUTENTICACIÓN
  // ============================================================================
  
  /**
   * Inicia sesión con credenciales
   */
  login(credentials: LoginRequest): Observable<User> {
    logger.debug('[AuthService] \uD83D\uDD10 Login attempt for:', credentials.email);

    return this.http.post<AuthResponse>(
      `${API_URL}/api/auth/login`,
      credentials,
      { withCredentials: true }
    ).pipe(
      map(response => {
        logger.debug('[AuthService] 📥 Login response:', response);
        return response.data;
      }),
      tap(user => {
        logger.debug('[AuthService] ✅ Login successful, setting user:', user);
        this.setUser(user);
        this.scheduleTokenRefresh();
        this.forceRefresh();
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Registra un nuevo usuario
   */
  register(data: RegisterRequest): Observable<any> {
    logger.debug('[AuthService] 🔐 Register attempt for:', data.email);

    return this.http.post<any>(
      `${API_URL}/api/auth/register`,
      data,
      { withCredentials: true }
    ).pipe(
      map(response => {
        logger.debug('[AuthService] 📥 Register response:', response);
        return response.data || response;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Cierra la sesión del usuario
   * OPTIMIZADO: Limpia el estado local inmediatamente sin esperar al backend
   */
  logout(): Observable<void> {
    logger.debug('[AuthService] 🚪 Logout - limpiando estado local inmediatamente');

    // ✅ OPTIMIZACIÓN 1: Cancelar el timer de refresh
    this.cancelTokenRefresh();

    // ✅ OPTIMIZACIÓN 2: Limpiar estado local INMEDIATAMENTE (sin esperar backend)
    this.clearUser();

    // ✅ OPTIMIZACIÓN 3: Redirigir inmediatamente
    this.router.navigate(['/']);

    // ✅ OPTIMIZACIÓN 4: Notificar al backend en segundo plano (con timeout)
    // Si el backend no responde en 5 segundos, ignorar el error
    this.http.post<void>(
      `${API_URL}/api/auth/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      timeout(5000), // Timeout de 5 segundos
      catchError(err => {
        // Ignorar errores del backend - ya limpiamos el estado local
        logger.warn('[AuthService] ⚠️ Logout backend falló o tardó, pero estado local ya fue limpiado:', err);
        return of(undefined as any);
      })
    ).subscribe(); // Fire and forget

    // Retornar observable completado inmediatamente
    return of(undefined as any);
  }

  /**
   * Refresca el access token usando el refresh token
   * NOTA: Este método es llamado automáticamente por el interceptor
   */
  refresh(): Observable<User> {
    logger.debug('[AuthService] 🔄 Refreshing token');

    return this.http.post<AuthResponse>(
      `${API_URL}/api/auth/refresh`,
      {},
      { withCredentials: true }
    ).pipe(
      map(response => response.data),
      tap(user => {
        logger.debug('[AuthService] ✅ Token refreshed, user:', user);
        this.setUser(user);
        this.scheduleTokenRefresh();
      }),
      catchError(err => {
        logger.error('[AuthService] ❌ Refresh failed:', err);
        this.clearUser();
        this.cancelTokenRefresh();
        return throwError(() => err);
      })
    );
  }
  
  /**
   * Obtiene el usuario actual desde el servidor
   */
  me(): Observable<User> {
    logger.debug('[AuthService] 👤 Fetching current user');

    return this.http.get<AuthResponse>(
      `${API_URL}/api/users/me`,
      { withCredentials: true }
    ).pipe(
      map(response => {
        logger.debug('[AuthService] 📥 Me response:', response);
        return response.data;
      }),
      tap(user => {
        logger.debug('[AuthService] ✅ Current user fetched:', user);
        this.setUser(user);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS - GESTIÓN DE PERFIL
  // ============================================================================
  
  /**
   * Completa el perfil del usuario con información personal
   */
  completeProfile(data: {
    dni: string;
    name: string;
    phone: string;
    address: string;
  }): Observable<User> {
    logger.debug('[AuthService] 📝 Completing profile with data:', {
      dni: data.dni,
      name: data.name,
      phone: data.phone,
      address: data.address
    });

    return this.http.put<AuthResponse>(
      `${API_URL}/api/users/me/complete-profile`,
      data,
      { withCredentials: true }
    ).pipe(
      map(response => {
        logger.debug('[AuthService] 📥 Profile completion response:', response);
        return response.data;
      }),
      tap(user => {
        logger.debug('[AuthService] ✅ Profile completed successfully:', {
          hasPersonalInfo: (user as any).hasPersonalInfo,
          profileCompleteness: (user as any).profileCompleteness
        });
        this.setUser(user);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Actualiza información personal del usuario (teléfono, dirección)
   */
  updatePersonalInfo(data: { phone?: string; address?: string }): Observable<User> {
    logger.debug('[AuthService] ✏️ Updating personal info:', data);

    return this.http.patch<AuthResponse>(
      `${API_URL}/api/users/me/personal-info`,
      data,
      { withCredentials: true }
    ).pipe(
      map(response => response.data),
      tap(user => {
        logger.debug('[AuthService] ✅ Personal info updated successfully');
        this.setUser(user);
      }),
      catchError(this.handleError.bind(this))
    );
  }


  // ============================================================================
  // MÉTODOS PÚBLICOS - REFRESH MANUAL
  // ============================================================================
  
  /**
   * Fuerza un refresh de /api/users/me para obtener roles/flags actuales
   * No altera la estética ni el flujo; actualiza las señales en background
   */
  forceRefresh(): void {
    if (!this.isAuthenticated()) return;
    this.me().subscribe({ next: () => {}, error: () => {} });
  }

  /**
   * Refresca el usuario si pasó más de maxAgeMs desde el último sync
   * Útil para reflejar cambios de rol aprobados por un admin sin re-login
   */
  refreshIfStale(maxAgeMs: number = 15000): void {
    if (!this.isAuthenticated()) return;
    const now = Date.now();
    if (now - this._lastSyncAt < maxAgeMs) return;
    this._lastSyncAt = now;
    this.me().subscribe({ next: () => {}, error: () => {} });
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS - VERIFICACIÓN DE ROLES Y PERMISOS
  // ============================================================================
  
  hasRole(role: Role): boolean {
    const result = this.currentRoles().includes(role);
    logger.debug('[AuthService] 🔍 hasRole check:', { role, result, currentRoles: this.currentRoles() });
    return result;
  }

  hasAnyRole(roles: Role[]): boolean {
    const userRoles = this.currentRoles();
    return roles.some(role => userRoles.includes(role));
  }

  hasAllRoles(roles: Role[]): boolean {
    const userRoles = this.currentRoles();
    return roles.every(role => userRoles.includes(role));
  }

  isAdmin(): boolean {
    return this.hasRole(Role.ADMIN);
  }

  canPurchase(): boolean {
    const user = this.userSignal();
    if (!user) return false;

    // Los admins pueden comprar sin restricciones
    if ((user.roles ?? []).includes(Role.ADMIN)) {
      return true;
    }

    // Usuarios verificados con info personal completa pueden comprar
    const isVerified = !!(user as any).isVerified;
    const hasPersonalInfo = !!(user as any).hasPersonalInfo;

    logger.debug('[AuthService] 🛒 canPurchase check:', {
      isVerified,
      hasPersonalInfo,
      result: isVerified && hasPersonalInfo
    });

    return isVerified && hasPersonalInfo;
  }

  getPurchaseRequirements(): string[] {
    const user = this.userSignal();
    const requirements: string[] = [];

    if (!user) return requirements;

    if (!(user as any).isVerified) {
      requirements.push('✅ Verificar tu cuenta con un administrador');
    }

    if (!(user as any).hasPersonalInfo) {
      requirements.push('📝 Completar tu información personal (DNI, nombre, teléfono, dirección)');
    }

    return requirements;
  }

  getProfileSuggestions(): string[] {
    const user = this.userSignal();
    const suggestions: string[] = [];

    if (!user) return suggestions;

    if (!user.emailVerified) {
      suggestions.push('✉️ Verifica tu email haciendo clic en el enlace que te enviamos');
    }

    if (!(user as any).hasPersonalInfo) {
      suggestions.push('📝 Completa tu información personal (DNI, nombre, teléfono, dirección)');
    }

    if (!(user as any).isVerified && !(user.roles ?? []).includes(Role.ADMIN)) {
      suggestions.push('ℹ️ Solicita verificación de cuenta para habilitar todas las funciones');
    }

    if (!(user as any).isActive) {
      suggestions.push('⚠️ Tu cuenta está inactiva. Contacta al soporte');
    }

    return suggestions;
  }

  // ============================================================================
  // MÉTODOS PRIVADOS - GESTIÓN DE ESTADO
  // ============================================================================
  
  /**
   * Actualiza el estado del usuario en las señales
   */
  private setUser(user: User | null): void {
    logger.debug('[AuthService] 💾 Setting user signal:', user);
    
    // Forzar nueva referencia para trigger de señales
    const userCopy = user ? { ...user } : null;
    
    this.userSignal.set(userCopy);
    this.userSubject.next(userCopy);
    
    this._lastSyncAt = Date.now();
    
    if (userCopy) {
      logger.debug('[AuthService] ✅ User signal updated:', {
        roles: userCopy.roles,
        emailVerified: userCopy.emailVerified,
        hasPersonalInfo: (userCopy as any).hasPersonalInfo,
        isVerified: (userCopy as any).isVerified,
        profileCompleteness: (userCopy as any).profileCompleteness
      });
    }
  }

  /**
   * Limpia el estado del usuario
   */
  private clearUser(): void {
    logger.debug('[AuthService] 🗑️ Clearing user');
    this.setUser(null);
  }

  // ============================================================================
  // MÉTODOS PRIVADOS - AUTO-REFRESH DEL TOKEN
  // ============================================================================
  
  /**
   * Programa un refresh automático del token antes de que expire
   * El access token expira en 15 minutos, refrescamos a los 14 minutos
   */
  private scheduleTokenRefresh(): void {
    // Cancelar timer existente
    this.cancelTokenRefresh();
    
    // Programar nuevo refresh a los 14 minutos (840 segundos)
    // El token expira a los 15 minutos (900 segundos)
    const refreshTime = 14 * 60 * 1000; // 14 minutos en milisegundos
    
    logger.debug('[AuthService] ⏰ Scheduling token refresh in 14 minutes');
    
    this._refreshTimer = timer(refreshTime).pipe(take(1)).subscribe(() => {
      logger.debug('[AuthService] ⏰ Auto-refreshing token...');
      
      this.refresh().subscribe({
        next: (user) => {
          logger.debug('[AuthService] ✅ Auto-refresh successful:', user.username);
        },
        error: (err) => {
          logger.error('[AuthService] ❌ Auto-refresh failed:', err);
          // El interceptor manejará el error y hará logout si es necesario
        }
      });
    });
  }

  /**
   * Cancela el timer de refresh automático
   */
  private cancelTokenRefresh(): void {
    if (this._refreshTimer) {
      logger.debug('[AuthService] ⏰ Cancelling scheduled token refresh');
      this._refreshTimer.unsubscribe();
      this._refreshTimer = undefined;
    }
  }

  // ============================================================================
  // MÉTODOS PRIVADOS - MANEJO DE ERRORES
  // ============================================================================
  
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      logger.error('[AuthService] ❌ HTTP Error:', {
        status: error.status,
        statusText: error.statusText,
        error: error.error,
        url: error.url
      });

      if (error.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
      } else if (error.status === 401) {
        errorMessage = 'Credenciales inválidas o sesión expirada';
      } else if (error.status === 403) {
        const code = error.error?.errors?.[0]?.code || error.error?.code;
        if (code === 'EMAIL_VERIFICATION_REQUIRED') {
          errorMessage = 'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.';
        } else {
          errorMessage = error.error?.message || 'No tienes permisos para realizar esta acción';
        }
      } else if (error.status === 409) {
        errorMessage = error.error?.message || 'Conflicto: el recurso ya existe';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `Error ${error.status}: ${error.statusText}`;
      }
    }

    const normalized: any = {
      status: error.status,
      code: error.error?.errors?.[0]?.code || error.error?.code,
      message: errorMessage
    };

    // ✅ Preservar el email del backend cuando está presente (importante para verificación)
    if (error.error?.email) {
      normalized.email = error.error.email;
      logger.debug('[AuthService] 📧 Email preservado en error normalizado:', normalized.email);
    }

    // ✅ Preservar la estructura completa del error para casos especiales
    normalized.error = {
      ...error.error,
      code: normalized.code,
      message: errorMessage
    };

    logger.error('[AuthService] ❌ Error normalized:', normalized);
    return throwError(() => normalized);
  }
}

