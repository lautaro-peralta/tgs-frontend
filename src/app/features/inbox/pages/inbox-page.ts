// inbox-page.ts - REEMPLAZAR con esta versión mejorada

import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth/auth';
import { Role } from '../../../models/user/user.model';
import { AdminRoleRequestsInboxComponent } from '../components/role-requests/admin-role-requests-inbox';
import { UserRoleRequestsInboxComponent } from '../components/role-requests/user-role-requests-inbox';
import { AdminUserVerificationInboxComponent } from '../components/role-requests/admin-user-verification-inbox';
import { UserVerificationStatusComponent } from '../components/role-requests/user-verification-status';
import { TranslateModule, TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'app-inbox-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AdminRoleRequestsInboxComponent,
    UserRoleRequestsInboxComponent,
    AdminUserVerificationInboxComponent,
    UserVerificationStatusComponent,
    TranslateModule
  ],
  templateUrl: './inbox-page.html',
  styleUrls: ['./inbox-page.scss']
})
export class InboxPageComponent implements OnInit {
  private authService = inject(AuthService);
  private tr  = inject(TranslateService);

  // Sección activa para ADMIN y USER
  activeSection = signal<'user-verification' | 'role-requests'>('user-verification');

  // Computed signals desde AuthService
  user = computed(() => this.authService.user());
  loading = signal(true);
  
  // ✅ Verificaciones de roles
  isAdmin = computed(() => this.authService.hasRole(Role.ADMIN));
  
  // ✅ Usuario verificado por admin (puede solicitar roles)
  isVerified = computed(() => {
    const user = this.user();
    return user?.isVerified || false;
  });
  
  hasCompleteProfile = computed(() => this.authService.profileCompleteness());
  profileCompleteness = computed(() => this.authService.profileCompleteness());
  
  // ✅ Computed para determinar si puede acceder al inbox
  // Cualquier usuario autenticado puede acceder
  canAccessInbox = computed(() => {
    const user = this.user();
    return !!user; // Solo necesita estar autenticado
  });

  // ✅ Computed para determinar si debe ver la vista de admin
  shouldShowAdminView = computed(() => {
    return this.isAdmin();
  });

  // ✅ Computed para determinar si debe ver la vista de usuario
  shouldShowUserView = computed(() => {
    const user = this.user();
    if (!user) return false;
    
    // Vista de usuario para cualquiera que NO sea admin
    return !this.isAdmin();
  });

  // ✅ Computed para pasar roles actuales al componente hijo
  currentRoles = computed(() => this.user()?.roles || []);
  
  // Roles visibles en el header (sólo Authority, Partner, Distributor)
  private readonly allowedHeaderRoles: Role[] = [
    Role.AUTHORITY,
    Role.PARTNER,
    Role.DISTRIBUTOR,
  ];
  visibleHeaderRoles = computed(() =>
    (this.user()?.roles || []).filter(r => this.allowedHeaderRoles.includes(r))
  );

  readonly Role = Role;

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      console.warn('[InboxPage] User not authenticated');
      this.loading.set(false);
      return;
    }

    console.log('[InboxPage] 🚀 Initializing with user:', this.user());
    this.loading.set(false);
    this.refreshUser();
  }

  private refreshUser(): void {
    this.authService.me().subscribe({
      next: (user) => {
        console.log('[InboxPage] ✅ User refreshed:', {
          username: user.username,
          roles: user.roles,
          isVerified: (user as any).isVerified,
          emailVerified: user.emailVerified
        });
      },
      error: (err) => {
        console.error('[InboxPage] ❌ Error refreshing user:', err);
      }
    });
  }

  setActiveSection(section: 'user-verification' | 'role-requests'): void {
    // ✅ Prevenir cambio a role-requests si no está verificado (solo para usuarios no-admin)
    if (section === 'role-requests' && !this.isVerified() && !this.isAdmin()) {
      console.warn('[InboxPage] ⚠️ Cannot access role-requests without verification');
      return;
    }
    
    this.activeSection.set(section);
    console.log('[InboxPage] 📑 Active section changed to:', section);
  }

  getUserDisplayName(): string {
    return this.user()?.username || 'Usuario';
  }

  getProfileSuggestions(): string[] {
    return this.authService.getProfileSuggestions();
  }

  getUserEmail(): string {
    return this.user()?.email || '';
  }
}
