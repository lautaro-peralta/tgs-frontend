import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleRequest } from '../../models/role-request.model';
import { RoleRequestService } from '../../services/role-request';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { logger } from '../../../../core/logger';
import { DialogDirective } from '../../../../shared/a11y/dialog.directive';

@Component({
  selector: 'app-role-request-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DialogDirective],
  templateUrl: './role-request-review-modal.html',
  styleUrls: ['./role-requests.scss']
})
export class RoleRequestReviewModalComponent {
  @Input() request!: RoleRequest;
  @Output() close = new EventEmitter<void>();
  @Output() reviewComplete = new EventEmitter<string | undefined>();

  action: 'approve' | 'reject' | null = null;
  comments: string = '';
  isSubmitting: boolean = false;
  error: string | null = null;

  private t = inject(TranslateService);
  private roleRequestService = inject(RoleRequestService);

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      PARTNER: 'Socio',
      DISTRIBUTOR: 'Distribuidor',
      AUTHORITY: 'Autoridad',
    };
    return labels[role] || role;
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
  
  getRankLabel(rank: string): string {
    const labels: Record<string, string> = {
      '0': 'Rango 0 - Ejecutivo',
      '1': 'Rango 1 - Senior',
      '2': 'Rango 2 - Intermedio',
      '3': 'Rango 3 - Base'
    };
    return labels[rank] || `Rango ${rank}`;
  }

  async onSubmit(): Promise<void> {
    this.error = null;

    if (!this.action) {
      this.error = 'Debes seleccionar una acción (Aprobar o Rechazar)';
      return;
    }

    if (this.comments.length > 500) {
      this.error = 'Los comentarios no pueden exceder 500 caracteres';
      return;
    }

    // ✅ VALIDACIÓN CRÍTICA: Verificar additionalData antes de aprobar
    
    if (this.action === 'approve') {
      const role = this.request.requestedRole;
      const data = this.request.additionalData;

      if (role === 'DISTRIBUTOR') {
        if (!data || !data.zoneId || !data.address) {
          this.error = '❌ Esta solicitud no tiene los datos adicionales requeridos (zona y dirección). No se puede aprobar. Por favor, pide al usuario que cree una nueva solicitud.';
          logger.error('❌ Cannot approve DISTRIBUTOR without additionalData:', data);
          return;
        }
      } else if (role === 'AUTHORITY') {
        if (!data || !data.rank || !data.zoneId) {
          this.error = '❌ Esta solicitud no tiene los datos adicionales requeridos (rango y zona). No se puede aprobar. Por favor, pide al usuario que cree una nueva solicitud.';
          logger.error('❌ Cannot approve AUTHORITY without additionalData:', data);
          return;
        }
      }
    }

    this.isSubmitting = true;

    try {
      logger.debug('🔍 [ReviewModal] REQUEST DEBUG');
      logger.debug('📋 Request Object:', this.request);
      logger.debug('🎯 Request ID:', this.request.id);
      logger.debug('👤 User ID:', this.request.user?.id);
      logger.debug('🎭 Requested Role:', this.request.requestedRole);
      logger.debug('📦 Additional Data:', this.request.additionalData);
      logger.debug('✅ Action:', this.action);
      logger.debug('💬 Comments:', this.comments || '(empty)');
      
      const payload = {
        action: this.action,
        comments: this.comments || undefined,
      };
      
      logger.debug('📤 Payload a enviar:', JSON.stringify(payload, null, 2));
      logger.debug();

      if (!this.request.id) {
        throw new Error('Request ID is missing');
      }

      if (!this.request.user?.id) {
        throw new Error('User ID is missing from request');
      }

      logger.debug('🚀 Calling reviewRequest API...');
      
      const response = await this.roleRequestService.reviewRequest(this.request.id, payload);
      
      logger.debug('✅ [ReviewModal] Review completed successfully:', response);

      this.reviewComplete.emit(this.action === 'approve' ? this.request.user.id : undefined);
      
    } catch (err: any) {
      logger.debug('❌ [ReviewModal] ERROR DETAILS');
      logger.error('Error object:', err);
      logger.error('Status:', err.status);
      logger.error('Status text:', err.statusText);
      logger.error('Error body:', err.error);
      logger.debug();
      
      let errorMessage = 'Error desconocido';

      if (err.error?.errors && Array.isArray(err.error.errors)) {
        errorMessage = err.error.errors.map((e: any) => {
          return `${e.field || 'Campo'}: ${e.message}`;
        }).join('\n');
      } else if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.status === 400) {
        errorMessage = 'Solicitud inválida. Los datos adicionales pueden estar incompletos o ser incorrectos.';
      } else if (err.status === 404) {
        errorMessage = 'No se encontró la solicitud. Puede que ya haya sido procesada.';
      } else if (err.status === 500) {
        errorMessage = 'Error interno del servidor. Por favor contacta al administrador.';
      } else if (err.status === 0) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
      } else {
        errorMessage = `Error ${err.status}: ${err.statusText || 'Desconocido'}`;
      }

      this.error = errorMessage;
      logger.error('📢 User-facing error:', errorMessage);
      
    } finally {
      this.isSubmitting = false;
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}