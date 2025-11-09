// src/app/components/bribe/bribe.component.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Services
import { BribeService } from '../../services/bribe/bribe';
import { AuthService, Role } from '../../services/user/user';

// Models
import { BribeDTO } from '../../models/bribe/bribe.model';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

/**
 * BribeComponent
 *
 * Gestión de sobornos: listado con filtros, pago y eliminación.
 * Los sobornos se generan automáticamente desde el backend.
 * Usa signals para loading/error/lista e i18n para mensajes.
 */

@Component({
  selector: 'app-bribe',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './bribe.html',
  styleUrls: ['./bribe.scss']
})
export class BribeComponent implements OnInit {
  // --- Inyección ---
  private srv = inject(BribeService);
  private t = inject(TranslateService);
  private authService = inject(AuthService);

  // --- Roles y permisos ---
  isAdmin = computed(() => this.authService.hasRole(Role.ADMIN));
  isPartner = computed(() => this.authService.hasRole(Role.PARTNER));
  isAuthority = computed(() => this.authService.hasRole(Role.AUTHORITY));

  // Permisos específicos por rol
  canPay = computed(() => this.isAdmin() || this.isPartner());      // Admin y Socio pueden pagar
  canDelete = computed(() => this.isAdmin());                       // Solo Admin puede eliminar
  // Los sobornos se crean automáticamente, no manualmente

  // --- Estado ---
  loading = signal(false);
  error = signal<string | null>(null);
  bribes = signal<BribeDTO[]>([]);

  // --- Filtros ---
  fTextInput = signal(''); 
  fTextApplied = signal('');
  fAmountInput = signal(''); 
  fAmountApplied = signal('');
  fAuthorityInput = signal(''); 
  fAuthorityApplied = signal('');
  fPaidInput = signal<'all' | 'true' | 'false'>('all');
  fPaidApplied = signal<'all' | 'true' | 'false'>('all');
  fDateTypeInput = signal<'all' | 'exact' | 'before' | 'after' | 'between'>('all');
  fDateTypeApplied = signal<'all' | 'exact' | 'before' | 'after' | 'between'>('all');
  fDateInput = signal('');
  fDateApplied = signal('');
  fEndDateInput = signal('');
  fEndDateApplied = signal('');

// Filtrado reactivo
  filteredBribes = computed(() => {
    const idTxt = this.fTextApplied().trim();
    const amountTxt = this.fAmountApplied().trim();
    const authorityTxt = this.fAuthorityApplied().trim();
    const paidFilter = this.fPaidApplied();

    return this.bribes().filter(b => {
      // Filtro por ID
      const matchId = !idTxt || String(b.id).includes(idTxt);

      // Filtro por monto
      const matchAmount = !amountTxt || String(b.amount).includes(amountTxt);

      // Filtro por autoridad (DNI o nombre)
      let matchAuthority = true;
      if (authorityTxt) {
        const authorityName = b.authority?.name?.toLowerCase() || '';
        const authorityDni = b.authority?.dni || '';
        matchAuthority = authorityName.includes(authorityTxt) || authorityDni.includes(authorityTxt);
      }

      // Filtro por estado de pago
      const matchPaid = paidFilter === 'all'
        || (paidFilter === 'true' && b.paid)
        || (paidFilter === 'false' && !b.paid);

      return matchId && matchAmount && matchAuthority && matchPaid;
    });
  });

  // --- Ciclo de vida ---
  ngOnInit(): void {
    this.loadAll();
  }

  // --- Data fetching ---
  loadAll() {
    this.loading.set(true);
    this.error.set(null);

    // ✅ NOTA: El backend YA filtra automáticamente los sobornos por autoridad
    // cuando el usuario autenticado tiene rol AUTHORITY o PARTNER.
    // No es necesario filtrar en el frontend.

    // Si hay filtros activos en sobornos, usar search
    const bribesRequest = (this.fPaidApplied() !== 'all' || this.fDateTypeApplied() !== 'all')
      ? this.getBribesFiltered()
      : this.srv.getAllBribes();

    bribesRequest.subscribe({
      next: (res) => {
        const allBribes = Array.isArray(res) ? res : res.data ?? [];

        // 🔍 Logging diagnóstico para autoridades
        const currentUser = this.authService.user();
        if (this.isAuthority()) {
          console.log('[BribeComponent] Authority user info:', {
            userId: currentUser?.id,
            username: currentUser?.username,
            email: currentUser?.email,
            roles: currentUser?.roles,
            bribesReceived: allBribes.length
          });

          if (allBribes.length === 0) {
            console.warn('[BribeComponent] ⚠️ Authority user received 0 bribes. This could mean:');
            console.warn('  1. No bribes have been assigned to this authority yet');
            console.warn('  2. The authority email does not match the user email');
            console.warn('  3. There are no illegal product sales in this authority\'s zone');
          } else {
            console.log('[BribeComponent] ✅ Authority bribes:', allBribes.map(b => ({
              id: b.id,
              amount: b.amount,
              authority: b.authority,
              saleId: b.sale?.id
            })));
          }
        }

        this.bribes.set(allBribes);
        this.loading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || this.t.instant('bribes.errorLoad');
        this.error.set(msg);
        this.loading.set(false);
      }
    });
  }

  applyFilters() {
  this.fTextApplied.set(this.fTextInput());
  this.fAmountApplied.set(this.fAmountInput());
  this.fAuthorityApplied.set(this.fAuthorityInput());
  this.fPaidApplied.set(this.fPaidInput());
  this.fDateTypeApplied.set(this.fDateTypeInput());
  this.fDateApplied.set(this.fDateInput());
  this.fEndDateApplied.set(this.fEndDateInput());
  this.loadAll();
}

clearFilters() {
  this.fTextInput.set('');
  this.fAmountInput.set('');
  this.fAuthorityInput.set('');
  this.fPaidInput.set('all');
  this.fDateTypeInput.set('all');
  this.fDateInput.set('');
  this.fEndDateInput.set('');
  this.fTextApplied.set('');
  this.fAmountApplied.set('');
  this.fAuthorityApplied.set('');
  this.fPaidApplied.set('all');
  this.fDateTypeApplied.set('all');
  this.fDateApplied.set('');
  this.fEndDateApplied.set('');
  this.loadAll();
}

  /**
   * Helper para obtener sobornos filtrados
   */
  private getBribesFiltered() {
    const paidValue = this.fPaidApplied();
    const paid = paidValue === 'all' ? undefined : paidValue as 'true' | 'false';
    const dateType = this.fDateTypeApplied();
    const date = dateType !== 'all' && this.fDateApplied() ? this.fDateApplied() : undefined;
    const type = dateType !== 'all' ? dateType : undefined;
    const endDate = dateType === 'between' && this.fEndDateApplied() ? this.fEndDateApplied() : undefined;

    return this.srv.searchBribes(paid, date, type, endDate);
  }

  totalBribes = computed(() => this.bribes().length);
  totalAmount = computed(() => 
    this.bribes().reduce((sum, b) => sum + (b.amount || 0), 0)
  );
  paidBribes = computed(() => 
    this.bribes().filter(b => b.paid).length
  );
  pendingBribes = computed(() => 
    this.bribes().filter(b => !b.paid).length
  );
  pendingAmount = computed(() =>
    this.bribes().filter(b => !b.paid).reduce((sum, b) => sum + (b.amount || 0), 0)
  );

  /**
   * Wrapper para recargar cuando cambian filtros
   */
  load() {
    this.loadAll();
  }

  // --- Pago ---
  markAsPaid(bribe: BribeDTO) {
    if (!bribe.id || bribe.paid) return;

    if (!confirm(this.t.instant('bribes.confirmPay'))) return;

    this.loading.set(true);
    this.error.set(null);

    this.srv.payBribes([bribe.id]).subscribe({
      next: () => {
        this.loadAll();
      },
      error: (err) => {
        const msg = err?.error?.message || this.t.instant('bribes.errorPay');
        this.error.set(msg);
        this.loading.set(false);
      }
    });
  }

  // --- Borrado ---
  delete(id: number) {
    if (!confirm(this.t.instant('bribes.confirmDelete'))) return;

    this.loading.set(true);
    this.error.set(null);

    this.srv.deleteBribe(id).subscribe({
      next: () => {
        this.loadAll();
      },
      error: (err) => {
        const msg = err?.error?.message || this.t.instant('bribes.errorDelete');
        this.error.set(msg);
        this.loading.set(false);
      }
    });
  }

  // --- Helpers para template ---
  trackById = (_: number, item: BribeDTO) => item.id;
}