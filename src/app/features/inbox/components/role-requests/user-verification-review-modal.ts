import { Component, Input, Output, EventEmitter,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserVerification } from '../../models/user-verification.model';
import { UserVerificationService } from '../../services/user-verification';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-user-verification-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule,TranslateModule],
  templateUrl: './user-verification-review-modal.html',
  styleUrls: ['./user-verification.scss']
})
export class UserVerificationReviewModalComponent {
  @Input() verification!: UserVerification;
  @Output() close = new EventEmitter<void>();
  @Output() reviewComplete = new EventEmitter<'approve' | 'reject'>();

  action: 'approve' | 'reject' = 'approve';
  reason: string = '';
  isSubmitting: boolean = false;
  error: string | null = null;

  readonly t = inject(TranslateService);

  constructor(private userVerificationService: UserVerificationService) {}

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async onSubmit(): Promise<void> {
    this.error = null;

    if (this.action === 'reject' && this.reason.length > 0 && this.reason.length < 3) {
      this.error = 'El motivo debe tener al menos 3 caracteres';
      return;
    }

    if (this.reason.length > 500) {
      this.error = 'El motivo no puede exceder 500 caracteres';
      return;
    }

    this.isSubmitting = true;

    try {
      if (this.action === 'approve') {
        await this.userVerificationService.approveVerification(this.verification.email);
      } else {
        await this.userVerificationService.rejectVerification(
          this.verification.email,
          this.reason ? { reason: this.reason } : undefined
        );
      }

      this.reviewComplete.emit(this.action);
    } catch (err: any) {
      this.error = err.error?.message || err.error?.errors?.[0]?.message || 'Error al procesar la verificación';
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
