// src/app/pages/auth/register/register.component.ts
import { Component, inject, signal, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../services/auth/auth';
import { EmailVerificationService } from '../../../features/inbox/services/email.verification';
import { EmailVerificationSyncService } from '../../../services/email-verification-sync.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslateModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly emailVerificationService = inject(EmailVerificationService);
  private readonly syncService = inject(EmailVerificationSyncService);
  private readonly destroy$ = new Subject<void>();

  // Signals para el estado
  loading = signal(false);
  error = signal<string | null>(null);

  // Estado de verificación de email
  needsEmailVerification = signal(false);
  waitingForVerification = signal(false);
  registrationSuccess = signal(false);

  // Cleanup functions
  private stopPolling?: () => void;
  private removeStorageListener?: () => void;

  form = this.fb.group({
    username: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(100)
    ]],
    email: ['', [
      Validators.required,
      Validators.email
    ]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      this.passwordValidator
    ]],
  });

  constructor() {
    // Effect para detectar cuando el email fue verificado desde otra pestaña
    effect(() => {
      const verificationEvent = this.syncService.emailVerified();
      console.log('[Register] Effect ejecutado. Verification event:', verificationEvent, 'Waiting:', this.waitingForVerification());

      if (verificationEvent) {
        console.log('[Register] ✅ Email verificado detectado!', verificationEvent);
        if (this.waitingForVerification()) {
          console.log('[Register] Procediendo con auto-login para:', verificationEvent.email);
          this.handleEmailVerifiedFromAnotherTab(verificationEvent.email);
        } else {
          console.log('[Register] No estamos esperando verificación, ignorando evento');
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
   * Validador personalizado para la contraseña
   * Debe contener: mayúscula, minúscula, número y carácter especial
   */
  private passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[@$!%*?&]/.test(value);

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;

    if (!passwordValid) {
      return {
        passwordStrength: {
          message: 'La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)'
        }
      };
    }

    return null;
  }

  submit(): void {
    // Validar formulario
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.showValidationErrors();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { username, email, password } = this.form.getRawValue();

    this.auth.register({
      username: username!,
      email: email!,
      password: password!
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        console.log('[Register] ✅ Registro exitoso');
        this.loading.set(false);
        this.registrationSuccess.set(true);
        this.needsEmailVerification.set(true);
        this.waitingForVerification.set(true);

        // Guardar credenciales para auto-login después de verificación
        console.log('[Register] Guardando credenciales para auto-login posterior');
        localStorage.setItem('pendingAuth', JSON.stringify({
          email: email!,
          password: password!
        }));

        // NO intentar auto-login - solo esperar la verificación
        console.log('[Register] Esperando verificación de email para:', email);

        // Iniciar polling para detectar cuando el email sea verificado
        this.stopPolling = this.syncService.startPollingVerification(email!, 3000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'No se pudo registrar');
        console.error('[Register] Error en registro:', err);
      }
    });
  }

  /**
   * Maneja cuando el email fue verificado desde otra pestaña
   */
  private handleEmailVerifiedFromAnotherTab(email: string): void {
    console.log('[Register] Intentando auto-login después de verificación:', email);

    // Obtener credenciales de pendingAuth
    const raw = localStorage.getItem('pendingAuth');
    if (!raw) {
      console.warn('[Register] No hay credenciales pendientes para auto-login');
      this.waitingForVerification.set(false);
      this.router.navigate(['/login'], {
        queryParams: { verified: 'true' }
      });
      return;
    }

    try {
      const { email: savedEmail, password } = JSON.parse(raw);

      // Verificar que el email coincida
      if (savedEmail.toLowerCase() !== email.toLowerCase()) {
        console.warn('[Register] El email verificado no coincide con las credenciales guardadas');
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
            console.log('[Register] Auto-login exitoso:', user);

            // Limpiar credenciales pendientes
            localStorage.removeItem('pendingAuth');

            // Detener polling si está activo
            if (this.stopPolling) {
              this.stopPolling();
              this.stopPolling = undefined;
            }

            // Redirigir
            setTimeout(() => {
              this.router.navigateByUrl('/');
            }, 500);
          },
          error: (err) => {
            this.loading.set(false);
            this.waitingForVerification.set(false);
            console.error('[Register] Error en auto-login:', err);
            this.error.set('Email verificado, pero ocurrió un error al iniciar sesión.');
            localStorage.removeItem('pendingAuth');
          }
        });
    } catch (e) {
      console.error('[Register] Error parseando pendingAuth:', e);
      this.waitingForVerification.set(false);
    }
  }

  /**
   * Muestra errores de validación específicos
   */
  private showValidationErrors(): void {
    const usernameControl = this.form.get('username');
    const emailControl = this.form.get('email');
    const passwordControl = this.form.get('password');

    if (usernameControl?.errors) {
      if (usernameControl.errors['required']) {
        this.error.set('El nombre de usuario es requerido');
      } else if (usernameControl.errors['minlength']) {
        this.error.set('El nombre de usuario debe tener al menos 2 caracteres');
      }
      return;
    }

    if (emailControl?.errors) {
      if (emailControl.errors['required']) {
        this.error.set('El email es requerido');
      } else if (emailControl.errors['email']) {
        this.error.set('El email no es válido');
      }
      return;
    }

    if (passwordControl?.errors) {
      if (passwordControl.errors['required']) {
        this.error.set('La contraseña es requerida');
      } else if (passwordControl.errors['minlength']) {
        this.error.set('La contraseña debe tener al menos 8 caracteres');
      } else if (passwordControl.errors['passwordStrength']) {
        this.error.set(passwordControl.errors['passwordStrength'].message);
      }
      return;
    }
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getFieldError(fieldName: string): string | null {
    const control = this.form.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return null;
    }

    const errors = control.errors;
    if (errors['required']) return 'Este campo es requerido';
    if (errors['email']) return 'Email inválido';
    if (errors['minlength']) {
      return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    }
    if (errors['passwordStrength']) {
      return errors['passwordStrength'].message;
    }

    return 'Campo inválido';
  }

  /**
   * Limpia el mensaje de error
   */
  clearError(): void {
    this.error.set(null);
    this.needsEmailVerification.set(false);
    this.waitingForVerification.set(false);
  }
}