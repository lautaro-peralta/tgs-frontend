import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EmailVerificationService } from '../services/email.verification';
import { AuthService } from '../../../services/auth/auth';
import { EmailVerificationSyncService } from '../../../services/email-verification-sync.service';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-email-verification',
  imports: [CommonModule],
  template: `
  <div class="verification-container">
    <div class="verification-shell">
      
      <!-- Estado: Verificando -->
      <div *ngIf="state() === 'verifying'" class="state-box">
        <div class="spinner"></div>
        <h2 class="state-title">Verificando tu email</h2>
        <p class="state-text muted">Esto solo tomará un momento...</p>
      </div>

      <!-- Estado: Éxito -->
      <div *ngIf="state() === 'ok'" class="state-box">
        <div class="success-icon">✓</div>
        <h2 class="state-title">¡Email verificado!</h2>
        <div style="margin: 0; background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important; color: #e5e7eb; font-size: 0.95rem; line-height: 1.5; text-align: center;">
          Tu dirección de email ha sido verificada correctamente.
        </div>
        <div style="margin: 1rem 0; background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important; color: #e5e7eb; font-size: 0.95rem; line-height: 1.5; text-align: center;">
          Vuelve a la pestaña anterior para continuar.
          <br>
          <span style="color: #9aa0a6; font-size: 0.85rem; background: transparent !important;">Tu sesión se iniciará automáticamente.</span>
        </div>
        <div style="margin-top: 1rem; background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important; color: #9aa0a6; font-size: 0.75rem; text-align: center;">
          Puedes cerrar esta pestaña de forma segura.
        </div>
      </div>

      <!-- Estado: Error -->
      <div *ngIf="state() === 'error'" class="state-box">
        <div class="error-icon">✕</div>
        <h2 class="state-title">Error de verificación</h2>
        <div class="error-message">{{ message() }}</div>
        <button class="btn btn-primary" (click)="goHome()">
          🏠 Ir al inicio
        </button>
      </div>

    </div>
  </div>
  `,
  styles: [`
    /* ===== VARIABLES (heredadas del sistema) ===== */
    :host {
      --text: #e5e7eb;
      --text-strong: #ffffff;
      --muted: #9aa0a6;
      --bg-elev: #141414;
      --bg-panel: #0e0f11;
      --border: #2c2c2c;
      --accent: #c3a462;
      --success: #4a8d72;
      --danger: #a94545;
      --radius: 12px;
      --shadow: 0 10px 28px rgba(0, 0, 0, .45);
    }

    /* ===== CONTAINER ===== */
    .verification-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      //background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }

    /* ===== SHELL (Glass Dark) ===== */
    .verification-shell {
      max-width: 500px;
      width: 100%;
      background: rgba(0, 0, 0, .408);
      border: 1px solid rgba(255, 255, 255, .247);
      border-radius: 12px;
      backdrop-filter: blur(18px) saturate(120%);
      -webkit-backdrop-filter: blur(18px) saturate(120%);
      padding: 2rem 1.5rem;
      color: var(--text-strong);
      box-shadow:
        inset 1px 1px 2px rgba(21, 45, 83, 0.71),
        inset -1px -1px 2px rgba(0, 0, 0, .4),
        0 10px 28px rgba(0, 0, 0, .645);
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ===== STATE BOX ===== */
    .state-box {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      background: transparent !important;
    }

    /* ===== SPINNER ===== */
    .spinner {
      margin: 0 auto;
      width: 48px;
      height: 48px;
      border: 4px solid rgba(195, 164, 98, 0.2);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ===== ICONS ===== */
    .success-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(74, 141, 114, 0.2);
      border: 2px solid var(--success);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: var(--success);
      animation: scaleIn 0.4s cubic-bezier(0.25, 0.6, 0.3, 1);
    }

    .error-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(169, 69, 69, 0.2);
      border: 2px solid var(--danger);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: var(--danger);
      animation: scaleIn 0.4s cubic-bezier(0.25, 0.6, 0.3, 1);
    }

    @keyframes scaleIn {
      from {
        transform: scale(0);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    /* ===== TYPOGRAPHY ===== */
    .state-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--text-strong);
      font-family: 'Google Sans Code', sans-serif;
      letter-spacing: 0.2px;
    }

    .state-text {
      margin: 0;
      color: var(--text);
      font-size: 0.95rem;
      line-height: 1.5;
      background: transparent !important;
      border: none !important;
      padding: 0 !important;
      box-shadow: none !important;
    }

    .state-text.muted {
      color: var(--muted);
      font-size: 0.85rem;
      background: transparent !important;
    }

    /* ===== ERROR MESSAGE ===== */
    .error-message {
      padding: 0.75rem 1rem;
      border: 1px solid color-mix(in srgb, var(--danger), transparent 40%);
      background: color-mix(in srgb, var(--danger), transparent 88%);
      color: #ffeaea;
      border-radius: 10px;
      font-size: 0.9rem;
      width: 100%;
      text-align: center;
    }

    .small-text {
      font-size: 0.75rem;
      margin-top: 1rem;
    }

    /* ===== BADGE ===== */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
    }

    .badge-success {
      background: rgba(63, 125, 99, .15);
      border-color: rgba(63, 125, 99, .5);
      color: #b8e6d3;
    }

    /* ===== BUTTON ===== */
    .btn {
      display: inline-flex;
      font-family: 'Google Sans Code';
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 16px;
      height: 40px;
      border-radius: 10px;
      cursor: pointer;
      border: none;
      font-size: 14px;
      text-decoration: none;
      background: #a68b4f;
      color: #1a1308;
      box-shadow: 0 4px 12px rgba(166, 139, 79, .45),
        inset 0 1px 0 rgba(255, 255, 255, .15);
      transition: transform .1s ease, box-shadow .2s ease, background .2s ease;
      position: relative;
      white-space: nowrap;
      font-weight: 700;
      margin-top: 0.5rem;
    }

    .btn::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 10px;
      background: linear-gradient(180deg, rgba(255, 255, 255, .12), transparent 50%);
      pointer-events: none;
    }

    .btn:hover {
      transform: translateY(-2px);
      background: #b89a5e;
      box-shadow: 0 6px 18px rgba(166, 139, 79, .55),
        inset 0 1px 0 rgba(255, 255, 255, .2);
    }

    .btn:active {
      transform: translateY(0);
      background: #8f7440;
      box-shadow: 0 2px 8px rgba(166, 139, 79, .4),
        inset 0 1px 0 rgba(255, 255, 255, .1);
    }

    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(37, 99, 235, .45),
        inset 0 1px 0 rgba(255, 255, 255, .2);
    }

    .btn-primary::before {
      background: linear-gradient(180deg, rgba(255, 255, 255, .15), transparent 50%);
    }

    .btn-primary:hover {
      background: #3b82f6;
      box-shadow: 0 6px 18px rgba(37, 99, 235, .55),
        inset 0 1px 0 rgba(255, 255, 255, .25);
    }

    .btn-primary:active {
      background: #1d4ed8;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 640px) {
      .verification-shell {
        padding: 1.5rem 1rem;
      }

      .state-title {
        font-size: 1.25rem;
      }
    }
  `]
})
export class EmailVerificationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ev = inject(EmailVerificationService);
  private auth = inject(AuthService);
  private syncService = inject(EmailVerificationSyncService);

  state = signal<'verifying' | 'ok' | 'error'>('verifying');
  message = signal<string>('');

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token') || '';
    console.log('[EmailVerification] Token recibido:', token);

    if (token) {
      this.run(token);
    } else {
      this.state.set('error');
      this.message.set('Token no proporcionado en la URL');
    }
  }

  async run(token: string) {
    try {
      console.log('[EmailVerification] Verificando token...');

      // 1️⃣ Verificar token
      const verifyRes = await firstValueFrom(this.ev.verifyToken(token));
      console.log('[EmailVerification] Respuesta:', verifyRes);

      // ✅ Verificar si fue exitosa
      const isSuccess = verifyRes?.success === true || verifyRes?.data?.success === true;

      if (!isSuccess) {
        throw {
          message: verifyRes?.message || 'Verificación fallida',
          code: verifyRes?.code || verifyRes?.errors?.[0]?.code,
          status: verifyRes?.statusCode || 400
        };
      }

      console.log('[EmailVerification] ✅ Email verificado en el backend');

      // 2️⃣ Obtener email del usuario para notificar a la pestaña original
      let userEmail = verifyRes?.email || verifyRes?.data?.email;

      // Si no viene en la respuesta, intentar obtenerlo de pendingAuth
      if (!userEmail) {
        const raw = localStorage.getItem('pendingAuth');
        if (raw) {
          try {
            const { email } = JSON.parse(raw);
            userEmail = email;
          } catch (e) {
            console.warn('[EmailVerification] No se pudo obtener email de pendingAuth');
          }
        }
      }

      // 3️⃣ Notificar a la pestaña original que el email fue verificado
      if (userEmail) {
        console.log('[EmailVerification] Notificando a otras pestañas que el email fue verificado:', userEmail);
        this.syncService.notifyEmailVerified(userEmail);
      } else {
        console.warn('[EmailVerification] No se pudo obtener el email para notificar');
      }

      // 4️⃣ Mostrar mensaje de éxito (sin auto-login ni redirección)
      this.state.set('ok');
      console.log('[EmailVerification] ✅ Verificación completa. El usuario debe volver a la pestaña anterior.');

    } catch (e: any) {
      console.error('[EmailVerification] Error:', e);

      let errorMsg = e?.message || 'Token inválido o expirado';

      // ✅ Detectar "ya verificado" - tratarlo como éxito
      const alreadyVerified =
        e?.message?.toLowerCase().includes('already verified') ||
        e?.message?.toLowerCase().includes('ya verificado') ||
        e?.message?.toLowerCase().includes('ya está verificado') ||
        e?.code === 'EMAIL_ALREADY_VERIFIED';

      if (alreadyVerified) {
        console.log('[EmailVerification] Email ya verificado - tratando como éxito');

        // Intentar obtener email de pendingAuth para notificar
        const raw = localStorage.getItem('pendingAuth');
        if (raw) {
          try {
            const { email } = JSON.parse(raw);
            this.syncService.notifyEmailVerified(email);
          } catch {}
        }

        this.state.set('ok');
        return;
      }

      // Otros errores
      if (e?.status === 400) {
        if (e?.message?.includes('expired') || e?.message?.includes('expirado')) {
          errorMsg = 'Este enlace ha expirado. Solicita uno nuevo desde el login.';
        }
      } else if (e?.status === 404) {
        errorMsg = 'Token no encontrado. Solicita uno nuevo desde el login.';
      }

      this.message.set(errorMsg);
      this.state.set('error');
    }
  }

  goHome() { 
    this.router.navigateByUrl('/'); 
  }
}