import { Component, OnInit,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleRequestService } from '../../services/role-request';
import { RoleRequest, RequestStatus } from '../../models/role-request.model';
import { Role } from '../../../../models/user/user.model';
import { RoleRequestCardComponent } from './role-request-card';
import { RoleRequestReviewModalComponent } from './role-request-review-modal';
import { AuthService } from '../../../../services/auth/auth';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-role-requests-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RoleRequestCardComponent, RoleRequestReviewModalComponent,TranslateModule],
  templateUrl: './admin-role-requests-inbox.html',
  styleUrls: ['./role-requests.scss']
})
export class AdminRoleRequestsInboxComponent implements OnInit {
  requests: RoleRequest[] = [];
  filteredRequests: RoleRequest[] = [];
  loading: boolean = true;
  error: string | null = null;
  successKey: string | null = null;

  statusFilter: RequestStatus | 'ALL' = RequestStatus.PENDING;
  roleFilter: Role | 'ALL' = 'ALL';
  reviewingRequest: RoleRequest | null = null;

  private t = inject(TranslateService);

  RequestStatus = RequestStatus;
  Role = Role;

  constructor(
    private auth: AuthService,
    private roleRequestService: RoleRequestService
  ) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  async loadRequests(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;

      const response = await this.roleRequestService.searchRequests({
        page: 1,
        limit: 100,
      });

      this.requests = response.data;
      this.applyFilters();
    } catch (err: any) {
      this.error = err.error?.message || 'Error al cargar las solicitudes';
    } finally {
      this.loading = false;
    }
  }

  applyFilters(): void {
    let filtered = [...this.requests];

    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter((req) => req.status === this.statusFilter);
    }

    if (this.roleFilter !== 'ALL') {
      filtered = filtered.filter((req) => req.requestedRole === this.roleFilter);
    }

    this.filteredRequests = filtered;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  openReviewModal(request: RoleRequest): void {
    this.reviewingRequest = request;
  }

  closeReviewModal(): void {
    this.reviewingRequest = null;
  }

  async handleReviewComplete(approvedUserId?: string): Promise<void> {
    this.closeReviewModal();
    await this.loadRequests();

    // 🔄 Si se aprobó la solicitud Y el usuario aprobado es el usuario actual logueado,
    // refrescar el perfil para actualizar los roles sin necesidad de desloguearse
    if (approvedUserId) {
      const currentUser = this.auth.user();
      if (currentUser && currentUser.id === approvedUserId) {
        console.log('🔄 [AdminRoleRequestsInbox] Role request approved for current user, refreshing profile...');
        try {
          // Esperar un momento para que el backend termine de actualizar los roles
          await new Promise(resolve => setTimeout(resolve, 500));
          await this.auth.me().toPromise();
          console.log('✅ [AdminRoleRequestsInbox] Profile refreshed successfully, roles updated');
        } catch (err) {
          console.error('❌ [AdminRoleRequestsInbox] Failed to refresh profile:', err);
        }
      }
    }

    this.successKey = approvedUserId
      ? 'notifications.roleRequestApproved'
      : 'notifications.roleRequestRejected';
    setTimeout(() => (this.successKey = null), 3000);
  }

  get pendingCount(): number {
    return this.requests.filter((r) => r.status === RequestStatus.PENDING).length;
  }
}
