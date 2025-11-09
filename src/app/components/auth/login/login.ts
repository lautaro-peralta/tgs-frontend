// src/app/pages/login/login.component.ts
import { Component, inject, signal, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth/auth.js';
import { EmailVerificationService } from '../../../features/inbox/services/email.verification.js';
import { EmailVerificationSyncService } from '../../../services/email-verification-sync.service.js';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly emailVerificationService = inject(EmailVerificationService);
  private readonly syncService = inject(EmailVerificationSyncService);
  private readonly destroy$ = new Subject<void>();

  // Estado del formulario
  email = signal('');
  password = signal('');
  loading = signal(false);
  error = signal<string | null>(null);

  // Estado de verificación de email
  needsEmailVerification = signal(false);
  resendingEmail = signal(false);
  emailSent = signal(false);
  actualEmail = signal<string | null>(null); // Email real del usuario (cuando se loguea con username)

  // Estado de espera de verificación
  waitingForVerification = signal(false);

  // Mensaje de éxito (ej: después de registro)
  successMessage = signal<string | null>(null);

  // Cleanup functions para los listeners
  private stopPolling?: () => void;
  private removeStorageListener?: () => void;

  constructor() {
    // Verificar si hay mensajes de éxito en query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['message']) {
          this.successMessage.set(params['message']);
          // Limpiar después de 5 segundos
          setTimeout(() => this.successMessage.set(null), 5000);
        }
        if (params['verified'] === 'true') {
          this.successMessage.set('¡Email verificado correctamente! Ahora puedes iniciar sesión.');
          setTimeout(() => this.successMessage.set(null), 5000);
        }
      });

    // Effect para detectar cuando el email fue verificado desde otra pestaña
    effect(() => {
      const verificationEvent = this.syncService.emailVerified();
      console.log('[Login] Effect ejecutado. Verification event:', verificationEvent, 'Waiting:', this.waitingForVerification());

      if (verificationEvent) {
        console.log('[Login] ✅ Email verificado detectado!', verificationEvent);
        if (this.waitingForVerification()) {
          console.log('[Login] Procediendo con auto-login para:', verificationEvent.email);
          this.handleEmailVerifiedFromAnotherTab(verificationEvent.email);
        } else {
          console.log('[Login] No estamos esperando verificación, ignorando evento');
        }
      }
    });

    // Escuchar cambios en localStorage como fallback
    this.removeStorageListener = this.syncService.listenToStorageEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Limpiar polling si está activo
    if (this.stopPolling) {
      this.stopPolling();
    }

    // Remover listener de storage
    if (this.removeStorageListener) {
      this.removeStorageListener();
    }

    // Limpiar el servicio de sincronización
    this.syncService.reset();
  }

  /**
   * Maneja el envío del formulario de login
   */
  onSubmit(): void {
    // Limpiar estados previos
    this.error.set(null);
    this.needsEmailVerification.set(false);
    this.emailSent.set(false);

    // Validar campos
    if (!this.email() || !this.password()) {
      this.error.set('Por favor completa todos los campos');
      return;
    }

    // No validar formato específico - acepta email o username
    if (this.email().trim().length < 3) {
      this.error.set('El email o usuario debe tener al menos 3 caracteres');
      return;
    }

    this.loading.set(true);

    this.auth.login({
      email: this.email(),
      password: this.password()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (user) => {
        this.loading.set(false);
        console.log('[Login] Success:', user);
        
        // Redirigir al home o a la ruta anterior
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.handleLoginError(err);
      }
    });
  }

  /**
   * Maneja errores de login con caso especial para verificación de email
   */
  private handleLoginError(error: HttpErrorResponse): void {
    console.error('[Login] Error:', error);

    // ✅ Detectar error de email no verificado usando el servicio
    if (this.emailVerificationService.isEmailVerificationError(error)) {
      this.needsEmailVerification.set(true);
      this.error.set('Debes verificar tu email antes de iniciar sesión.');

      // Extraer el email real de la respuesta (útil cuando se loguea con username)
      let emailToVerify = this.email();
      if (error.error?.email) {
        this.actualEmail.set(error.error.email);
        emailToVerify = error.error.email;
      }

      // Guardar credenciales para auto-login después de verificación
      localStorage.setItem('pendingAuth', JSON.stringify({
        email: emailToVerify,
        password: this.password()
      }));

      // Activar estado de espera de verificación
      this.waitingForVerification.set(true);

      // Iniciar polling para verificar el estado del email
      console.log('[Login] Iniciando polling para verificar email:', emailToVerify);
      this.stopPolling = this.syncService.startPollingVerification(emailToVerify, 3000);

      return;
    }

    // Otros errores comunes
    if (error.status === 401) {
      this.error.set('Email o contraseña incorrectos');
    } else if (error.status === 404) {
      this.error.set('No existe una cuenta con este email');
    } else if (error.status === 429) {
      this.error.set('Demasiados intentos de login. Por favor espera unos minutos.');
    } else if (error.error?.message) {
      this.error.set(error.error.message);
    } else if (error.status === 0) {
      this.error.set('No se pudo conectar con el servidor. Verifica tu conexión.');
    } else {
      this.error.set('Error al iniciar sesión. Intenta nuevamente.');
    }
  }

  /**
   * Reenvía el email de verificación para usuario no verificado
   */
  resendVerificationEmail(): void {
    // Usar el email real si está disponible (cuando se loguea con username)
    // De lo contrario, usar el campo email (que puede ser email o username)
    const emailToUse = this.actualEmail() || this.email();

    if (!emailToUse) {
      this.error.set('Por favor ingresa tu email');
      return;
    }

    this.resendingEmail.set(true);
    this.error.set(null);
    this.emailSent.set(false);

    // Usar endpoint público para usuarios no autenticados
    this.emailVerificationService.resendForUnverified(emailToUse)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.resendingEmail.set(false);
          if (response.success) {
            this.emailSent.set(true);
            this.error.set(null);
            console.log('[Login] Email de verificación enviado');

            // Activar estado de espera si no está activo
            if (!this.waitingForVerification()) {
              this.waitingForVerification.set(true);

              // Iniciar polling si no está activo
              if (!this.stopPolling) {
                console.log('[Login] Iniciando polling para verificar email:', emailToUse);
                this.stopPolling = this.syncService.startPollingVerification(emailToUse, 3000);
              }
            }
          } else {
            this.error.set(response.message || 'No se pudo enviar el email.');
          }
        },
        error: (err: HttpErrorResponse) => {
          this.resendingEmail.set(false);

          // Usar helpers del servicio para detectar errores específicos
          if (this.emailVerificationService.isCooldownError(err)) {
            this.error.set('Por favor espera 2 minutos antes de reenviar el email.');
          } else if (this.emailVerificationService.isAlreadyVerifiedError(err)) {
            this.error.set('Tu email ya está verificado. Intenta iniciar sesión.');
            this.needsEmailVerification.set(false);
          } else if (err.status === 404) {
            this.error.set('No se encontró una cuenta con este email.');
          } else {
            this.error.set(err.error?.message || 'Error al enviar el email de verificación.');
          }
        }
      });
  }

  /**
   * Maneja cuando el email fue verificado desde otra pestaña
   */
  private handleEmailVerifiedFromAnotherTab(email: string): void {
    console.log('[Login] Intentando auto-login después de verificación:', email);

    // Obtener credenciales de pendingAuth
    const raw = localStorage.getItem('pendingAuth');
    if (!raw) {
      console.warn('[Login] No hay credenciales pendientes para auto-login');
      this.waitingForVerification.set(false);
      this.successMessage.set('Email verificado correctamente. Por favor inicia sesión.');
      return;
    }

    try {
      const { email: savedEmail, password } = JSON.parse(raw);

      // Verificar que el email coincida
      if (savedEmail.toLowerCase() !== email.toLowerCase()) {
        console.warn('[Login] El email verificado no coincide con las credenciales guardadas');
        this.waitingForVerification.set(false);
        return;
      }

      // Hacer auto-login
      this.loading.set(true);
      this.auth.login({ email: savedEmail, password })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (user) => {
            this.loading.set(false);
            this.waitingForVerification.set(false);
            console.log('[Login] Auto-login exitoso:', user);

            // Limpiar credenciales pendientes
            localStorage.removeItem('pendingAuth');

            // Detener polling si está activo
            if (this.stopPolling) {
              this.stopPolling();
              this.stopPolling = undefined;
            }

            // Mostrar animación de éxito
            this.successMessage.set('¡Email verificado! Iniciando sesión...');

            // Redirigir
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
            setTimeout(() => {
              this.router.navigateByUrl(returnUrl);
            }, 1000);
          },
          error: (err) => {
            this.loading.set(false);
            this.waitingForVerification.set(false);
            console.error('[Login] Error en auto-login:', err);
            this.error.set('Email verificado, pero ocurrió un error al iniciar sesión. Por favor intenta nuevamente.');
            localStorage.removeItem('pendingAuth');
          }
        });
    } catch (e) {
      console.error('[Login] Error parseando pendingAuth:', e);
      this.waitingForVerification.set(false);
    }
  }

  /**
   * Limpia los mensajes de error y estados
   */
  clearError(): void {
    this.error.set(null);
    this.needsEmailVerification.set(false);
    this.emailSent.set(false);
    this.actualEmail.set(null);
  }

  /**
   * Limpia el mensaje de éxito
   */
  clearSuccess(): void {
    this.successMessage.set(null);
  }
}