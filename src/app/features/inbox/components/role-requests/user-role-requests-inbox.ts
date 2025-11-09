import { Component, OnInit, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Role } from '../../../../models/user/user.model';
import { RoleRequestService } from '../../services/role-request';
import { RoleRequest } from '../../models/role-request.model';
import { RoleRequestModalComponent } from './role-request-modal';
import { RoleRequestCardComponent } from './role-request-card';
import { AuthService } from '../../../../services/auth/auth';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-user-role-requests-inbox',
  standalone: true,
  imports: [CommonModule, RoleRequestModalComponent, RoleRequestCardComponent, TranslateModule],
  templateUrl: './user-role-requests-inbox.html',
  styleUrls: ['./role-requests.scss']
})
export class UserRoleRequestsInboxComponent implements OnInit {
  private t = inject(TranslateService);
  
  constructor(
    private auth: AuthService,
    private roleRequestService: RoleRequestService
  ) {}

  @Input() currentRoles: Role[] = [];
  @Input() hasCompleteProfile: boolean = false;
  @Input() isVerified: boolean = false;
  @Input() userName: string = '';
  @Input() userEmail: string = '';

  requests: RoleRequest[] = [];
  loading: boolean = true;
  error: string | null = null;
  isModalOpen: boolean = false;
  showTooltip: boolean = false; // ✅ Control del tooltip

  ngOnInit(): void {
    this.loadRequests();
  }

  async loadRequests(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;
      const fetched = await this.roleRequestService.getMyRequests();

      // 1) Dedupe por id
      const byId = new Map<string, RoleRequest>();
      for (const r of fetched) {
        if (!byId.has(r.id)) byId.set(r.id, r);
      }

      // 2) Dedupe defensivo por "snapshot" de contenido (por si llegan duplicados con distinto id)
      const bySnapshot = new Map<string, RoleRequest>();
      const values = Array.from(byId.values());
      for (const r of values) {
        const snapshot = JSON.stringify({
          requestedRole: r.requestedRole,
          roleToRemove: r.roleToRemove || null,
          status: r.status,
          justification: r.justification || null,
          additionalData: r.additionalData || null,
        });
        const prev = bySnapshot.get(snapshot);
        if (!prev) {
          bySnapshot.set(snapshot, r);
        } else {
          // Mantener la ms reciente por fecha de creacin
          const newer = new Date(r.createdAt).getTime() >= new Date(prev.createdAt).getTime() ? r : prev;
          bySnapshot.set(snapshot, newer);
        }
      }

      // 3) Ordenar por fecha desc
      this.requests = Array.from(bySnapshot.values()).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // 🔄 SIEMPRE refrescar el perfil cuando se carga el inbox
      // Esto asegura que los roles estén actualizados después de aprobaciones
      // (aplica para DISTRIBUTOR, PARTNER, AUTHORITY y cualquier rol)
      console.log('🔄 [UserRoleRequestsInbox] Refreshing profile to ensure roles are up to date...');
      this.auth.forceRefresh();
    } catch (err: any) {
      this.error = err.error?.message || 'Error al cargar tus solicitudes';
    } finally {
      this.loading = false;
    }
  }

  openModal(): void {
    // ✅ Validación adicional
    if (!this.isVerified) {
      this.error = 'Debes verificar tu cuenta antes de solicitar roles especiales';
      return;
    }
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  handleRequestSubmitted(): void {
    this.loadRequests().then(() => {
      // Buscar aprobadas y refrescar roles para reflejar el cambio sin relogin
      const hasApproved = this.requests?.some(r => r.status === 'APPROVED');
      if (hasApproved) {
        this.auth.forceRefresh();
      }
    });
    this.closeModal();
  }
}
