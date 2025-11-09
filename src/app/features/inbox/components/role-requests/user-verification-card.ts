import { Component, Input, Output, EventEmitter,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserVerification, UserVerificationStatus } from '../../models/user-verification.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-user-verification-card',
  standalone: true,
  imports: [CommonModule,TranslateModule],
  templateUrl: './user-verification-card.html',
  styleUrls: ['./user-verification.scss']
})
export class UserVerificationCardComponent {
  @Input() verification!: UserVerification;
  @Input() isAdmin: boolean = false;
  @Output() review = new EventEmitter<void>();

  isExpanded: boolean = false;
  UserVerificationStatus = UserVerificationStatus;
  private t = inject(TranslateService);

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
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
    [UserVerificationStatus.PENDING]: this.t.instant('status.PENDING'),
    [UserVerificationStatus.VERIFIED]: this.t.instant('status.APPROVED'),
    [UserVerificationStatus.EXPIRED]: this.t.instant('status.EXPIRED'),
    [UserVerificationStatus.CANCELLED]: this.t.instant('status.CANCELLED'),
  };
  return texts[status];
  }


  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onReview(event: Event): void {
    event.stopPropagation();
    this.review.emit();
  }
}