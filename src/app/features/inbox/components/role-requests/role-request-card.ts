import { Component, Input, Output, EventEmitter,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleRequest, RequestStatus } from '../../models/role-request.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-role-request-card',
  standalone: true,
  imports: [CommonModule,TranslateModule],
  templateUrl: './role-request-card.html',
  styleUrls: ['./role-requests.scss']
})
export class RoleRequestCardComponent {
  @Input() request!: RoleRequest;
  @Input() isAdmin: boolean = false;
  @Output() review = new EventEmitter<'approve' | 'reject'>();
  private t = inject(TranslateService);

  isExpanded: boolean = false;
  RequestStatus = RequestStatus;

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  getStatusBadgeClass(status: RequestStatus): string {
    const classes: Record<RequestStatus, string> = {
      [RequestStatus.PENDING]: 'status-badge pending',
      [RequestStatus.APPROVED]: 'status-badge approved',
      [RequestStatus.REJECTED]: 'status-badge rejected',
    };
    return classes[status];
  }

  getStatusIcon(status: RequestStatus): string {
    const icons: Record<RequestStatus, string> = {
      [RequestStatus.PENDING]: '⏳',
      [RequestStatus.APPROVED]: '✅',
      [RequestStatus.REJECTED]: '❌',
    };
    return icons[status];
  }

  getStatusText(status: RequestStatus): string {
    const texts: Record<RequestStatus, string> = {
      [RequestStatus.PENDING]: this.t.instant('status.PENDING'),
      [RequestStatus.APPROVED]: this.t.instant('status.APPROVED'),
      [RequestStatus.REJECTED]: this.t.instant('status.REJECTED'),
    };
    return texts[status];
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      PARTNER: this.t.instant('roles.PARTNER'),
      DISTRIBUTOR: this.t.instant('roles.DISTRIBUTOR'),
      AUTHORITY: this.t.instant('roles.AUTHORITY'),
    };
    return labels[role] || role;
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

  onReview(action: 'approve' | 'reject', event: Event): void {
    event.stopPropagation();
    this.review.emit(action);
  }
}