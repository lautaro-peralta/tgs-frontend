// src/app/features/inbox/components/user-verification/user-verification-status.component.ts

import { Component, OnInit, Input,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserVerificationService } from '../../services/user-verification';
import { UserVerificationStatusResponse, UserVerificationStatus } from '../../models/user-verification.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-user-verification-status',
  standalone: true,
  imports: [CommonModule,TranslateModule],
  templateUrl: './user-verification-status.html',
  styleUrls: ['./user-verification.scss']
})
export class UserVerificationStatusComponent implements OnInit {
  @Input() userEmail!: string;
  @Input() isVerified: boolean = false;
  @Input() hasCompleteProfile: boolean = false;

  verificationStatus: UserVerificationStatusResponse | null = null;
  loading: boolean = false;
  error: string | null = null;
  requesting: boolean = false;
  resending: boolean = false;


  UserVerificationStatus = UserVerificationStatus;
  private t = inject(TranslateService);

  constructor(private userVerificationService: UserVerificationService) {}

  ngOnInit(): void {
    if (!this.isVerified) {
      this.loadVerificationStatus();
    }
  }

  async loadVerificationStatus(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      this.verificationStatus = await this.userVerificationService.getVerificationStatus(this.userEmail);
    } catch (err: any) {
      // Si no hay verificación, no mostrar error
      if (err.status === 404) {
        this.verificationStatus = null;
      } else {
        this.error = err.error?.message || 'Error al cargar el estado de verificación';
      }
    } finally {
      this.loading = false;
    }
  }

// user-verification-status.ts - REEMPLAZAR el método requestVerification
// user-verification-status.ts - REEMPLAZAR el método requestVerification

async requestVerification(): Promise<void> {
  // ✅ Validación estricta antes de hacer la petición
  if (!this.hasCompleteProfile) {
    this.error = 'Debes completar tu perfil al 100% antes de solicitar la verificación. Ve a "Mi Cuenta" para completar tus datos personales.';
    return;
  }

  try {
    this.requesting = true;
    this.error = null;
    
    console.log('[UserVerificationStatus] 📤 Requesting verification:', {
      email: this.userEmail,
      hasCompleteProfile: this.hasCompleteProfile
    });
    
    await this.userVerificationService.requestVerification({ email: this.userEmail });
    
    console.log('[UserVerificationStatus] ✅ Verification requested successfully');
    
    // Recargar el estado
    await this.loadVerificationStatus();
    
  } catch (err: any) {
    console.error('[UserVerificationStatus] ❌ Error requesting verification:', err);
    
    // Manejo detallado de errores
    if (err.status === 500) {
      this.error = 'Error en el servidor. Por favor, verifica que hayas completado tu perfil correctamente y contacta al administrador si el problema persiste.';
    } else if (err.status === 404) {
      this.error = 'No se encontró tu información personal. Por favor, ve a "Mi Cuenta" y completa tu perfil con todos tus datos (DNI, nombre, teléfono y dirección).';
    } else if (err.error?.message) {
      this.error = err.error.message;
    } else if (err.status === 409) {
      this.error = 'Ya existe una solicitud de verificación pendiente para este email.';
    } else if (err.status === 0) {
      this.error = 'No se pudo conectar con el servidor. Verifica tu conexión.';
    } else {
      this.error = `Error al solicitar la verificación (${err.status}). Por favor, intenta nuevamente o contacta al administrador.`;
    }
  } finally {
    this.requesting = false;
  }
}

  async resendVerification(): Promise<void> {
    try {
      this.resending = true;
      this.error = null;
      await this.userVerificationService.resendVerification({ email: this.userEmail });
      await this.loadVerificationStatus();
    } catch (err: any) {
      this.error = err.error?.message || 'Error al reenviar la solicitud';
    } finally {
      this.resending = false;
    }
  }

  getStatusBadgeClass(status: UserVerificationStatus): string {
    const classes: Record<UserVerificationStatus, string> = {
      [UserVerificationStatus.PENDING]: 'status-badge pending',
      [UserVerificationStatus.VERIFIED]: 'status-badge verified',
      [UserVerificationStatus.EXPIRED]: 'status-badge expired',
      [UserVerificationStatus.CANCELLED]: 'status-badge cancelled',
    };
    return classes[status];
  }

  getStatusIcon(status: UserVerificationStatus): string {
    const icons: Record<UserVerificationStatus, string> = {
      [UserVerificationStatus.PENDING]: '⏳',
      [UserVerificationStatus.VERIFIED]: '✅',
      [UserVerificationStatus.EXPIRED]: '⏰',
      [UserVerificationStatus.CANCELLED]: '❌',
    };
    return icons[status];
  }

  getStatusText(status: UserVerificationStatus): string {
    const texts: Record<UserVerificationStatus, string> = {
      [UserVerificationStatus.PENDING]: 'Pendiente de Aprobación',
      [UserVerificationStatus.VERIFIED]: 'Verificado',
      [UserVerificationStatus.EXPIRED]: 'Expirado',
      [UserVerificationStatus.CANCELLED]: 'Rechazado',
    };
    return texts[status];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}