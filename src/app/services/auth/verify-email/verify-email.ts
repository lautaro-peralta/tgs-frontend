// src/app/pages/auth/verify-email/verify-email.component.ts
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth/auth';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="verify-email-container">
      <div class="card">
        <div class="icon">📧</div>
        <h1>Verifica tu email</h1>
        
        <p class="message">
          Hemos enviado un correo de verificación a <strong>{{ email() }}</strong>.
          Por favor, revisa tu bandeja de entrada y sigue las instrucciones.
        </p>

        <div class="info-box">
          <h3>¿Por qué necesitas verificar tu email?</h3>
          <ul>
            <li>Aumenta la seguridad de tu cuenta</li>
            <li>Te permite realizar compras</li>
            <li>Incrementa tu perfil al 50%</li>
            <li>Habilita notificaciones importantes</li>
          </ul>
        </div>

        <div class="actions">
          <button class="btn btn-primary" (click)="resendEmail()" [disabled]="loading">
            {{ loading ? 'Enviando...' : 'Reenviar email' }}
          </button>
          <button class="btn btn-secondary" (click)="goBack()">
            Volver
          </button>
        </div>

        <div class="error" *ngIf="error">{{ error }}</div>
        <div class="success" *ngIf="success">{{ success }}</div>

        <p class="help-text">
          ¿No recibiste el email? Revisa tu carpeta de spam o
          <a (click)="resendEmail()" class="link">reenvía el correo</a>.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .verify-email-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 2rem;
    }

    .card {
      max-width: 500px;
      width: 100%;
      padding: 2rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 16px;
      text-align: center;
    }

    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    h1 {
      margin: 0 0 1rem 0;
      font-size: 2rem;
      color: var(--text);
    }

    .message {
      color: var(--muted);
      line-height: 1.6;
      margin-bottom: 2rem;
    }

    .message strong {
      color: var(--accent);
    }

    .info-box {
      background: rgba(var(--accent-rgb), 0.1);
      border-left: 3px solid var(--accent);
      padding: 1rem;
      margin-bottom: 2rem;
      text-align: left;
      border-radius: 8px;
    }

    .info-box h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1rem;
      color: var(--text);
    }

    .info-box ul {
      margin: 0;
      padding-left: 1.5rem;
    }

    .info-box li {
      color: var(--muted);
      margin-bottom: 0.5rem;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--accent);
      color: white;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-2px);
      opacity: 0.9;
    }

    .error {
      color: var(--error);
      background: rgba(var(--error-rgb), 0.1);
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .success {
      color: var(--success);
      background: rgba(var(--success-rgb), 0.1);
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .help-text {
      color: var(--muted);
      font-size: 0.875rem;
      margin-top: 1rem;
    }

    .link {
      color: var(--accent);
      cursor: pointer;
      text-decoration: underline;
    }

    .link:hover {
      opacity: 0.8;
    }
  `]
})
export class VerifyEmailComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loading = false;
  error: string | null = null;
  success: string | null = null;

  // ✅ Computed signal (reactivo)
  email = computed(() => this.auth.user()?.email ?? 'tu email');

  resendEmail(): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    // Simular reenvío de email (implementa esto en tu backend)
    setTimeout(() => {
      this.loading = false;
      this.success = '✓ Email reenviado exitosamente. Por favor, revisa tu bandeja.';
      
      setTimeout(() => {
        this.success = null;
      }, 5000);
    }, 1000);

    // TODO: Implementar llamada real al backend
    // this.http.post('/api/auth/resend-verification', {}).subscribe({
    //   next: () => {
    //     this.loading = false;
    //     this.success = '✓ Email reenviado exitosamente';
    //   },
    //   error: (err) => {
    //     this.loading = false;
    //     this.error = err.message;
    //   }
    // });
  }

  goBack(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/']);
    }
  }
}