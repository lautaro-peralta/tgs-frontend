// src/app/components/client/client.component.ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ClientService } from '../../services/client/client';
import { SaleService } from '../../services/sale/sale';
import { AuthService } from '../../services/auth/auth';
import { Role } from '../../models/user/user.model';
import {
  ApiResponse,
  ClientDTO,
  CreateClientDTO,
  UpdateClientDTO
} from '../../models/client/client.model';
import { SaleDTO } from '../../models/sale/sale.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './client.html',
  styleUrls: ['./client.scss']
})
export class ClientComponent implements OnInit {
  private fb = inject(FormBuilder);
  private srv = inject(ClientService);
  private saleSrv = inject(SaleService);
  private t = inject(TranslateService);
  private authService = inject(AuthService);

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  clients = signal<ClientDTO[]>([]);
  sales = signal<SaleDTO[]>([]);
  editDni = signal<string | null>(null);
  isNewOpen = false;

  // --- Usuario y roles ---
  currentUser = this.authService.user;
  isAdmin = computed(() => this.authService.hasRole(Role.ADMIN));
  isDistributor = computed(() => this.authService.hasRole(Role.DISTRIBUTOR));

  // Permisos específicos por rol
  canCreate = computed(() => this.isAdmin());   // Solo Admin puede crear clientes
  canEdit = computed(() => this.isAdmin());     // Solo Admin puede editar clientes
  canDelete = computed(() => this.isAdmin());   // Solo Admin puede eliminar clientes
  currentUserDni = computed(() => {
    const user = this.currentUser();
    const dni = (user as any)?.person?.dni;
    console.log('[ClientComponent] 🔍 Current user DNI:', {
      hasUser: !!user,
      hasPerson: !!(user as any)?.person,
      dni: dni,
      username: user?.username,
      roles: user?.roles
    });
    return dni;
  });

  fTextInput = signal('');
  fTextApplied = signal('');
  fPurchasesInput = signal<'all' | 'yes' | 'no'>('all');
  fPurchasesApplied = signal<'all' | 'yes' | 'no'>('all');

  // ✅ NUEVO: Obtener DNIs únicos de clientes que aparecen en las ventas
  clientsFromSales = computed(() => {
    const uniqueDnis = new Set<string>();
    this.sales().forEach(sale => {
      if (sale.client?.dni) {
        uniqueDnis.add(sale.client.dni);
      }
    });
    return uniqueDnis;
  });

  // ✅ Filtrar clientes según rol
  myClients = computed(() => {
    const allClients = this.clients();
    const clientDnis = this.clientsFromSales();

    // Admin ve todos los clientes
    if (this.isAdmin()) {
      console.log('👑 Admin - showing all clients:', allClients.length);
      return allClients;
    }

    // Distribuidor solo ve clientes que le compraron
    if (this.isDistributor()) {
      const filtered = allClients.filter(client => clientDnis.has(client.dni));
      console.log('🚚 Distributor - filtered clients:', filtered.length, 'of', allClients.length);
      return filtered;
    }

    // Otros roles: sin clientes
    console.log('⚠️ User has no permission to view clients');
    return [];
  });

  // ✅ Mapa de compras por cliente DNI
  purchasesByClient = computed(() => {
    const map = new Map<string, number>();
    this.sales().forEach(sale => {
      const clientDni = sale.client?.dni;
      if (clientDni) {
        const current = map.get(clientDni) || 0;
        map.set(clientDni, current + 1);
      }
    });
    return map;
  });

  // ✅ CAMBIADO: Usar myClients() en lugar de clients()
  totalClients = computed(() => this.myClients().length);
  
  clientsWithPurchases = computed(() => {
    const purchasesMap = this.purchasesByClient();
    return this.myClients().filter(c => (purchasesMap.get(c.dni) || 0) > 0).length;
  });
  
  clientsWithoutPurchases = computed(() => {
    const purchasesMap = this.purchasesByClient();
    return this.myClients().filter(c => (purchasesMap.get(c.dni) || 0) === 0).length;
  });

  // ✅ CAMBIADO: Filtrar sobre myClients() en lugar de clients()
  filteredClients = computed(() => {
    const txt = this.fTextApplied().toLowerCase().trim();
    const filter = this.fPurchasesApplied();
    const purchasesMap = this.purchasesByClient();

    return this.myClients().filter(c => {
      const matchText = !txt
        || c.dni.toLowerCase().includes(txt)
        || c.name.toLowerCase().includes(txt)
        || (c.email ?? '').toLowerCase().includes(txt)
        || (c.address ?? '').toLowerCase().includes(txt)
        || (c.phone ?? '').toLowerCase().includes(txt);

      const purchaseCount = purchasesMap.get(c.dni) || 0;
      const matchPurchases = filter === 'all'
        || (filter === 'yes' && purchaseCount > 0)
        || (filter === 'no' && purchaseCount === 0);

      return matchText && matchPurchases;
    });
  });

  applyFilters() {
    this.fTextApplied.set(this.fTextInput());
    this.fPurchasesApplied.set(this.fPurchasesInput());
  }

  clearFilters() {
    this.fTextInput.set('');
    this.fPurchasesInput.set('all');
    this.fTextApplied.set('');
    this.fPurchasesApplied.set('all');
  }

  form = this.fb.group({
    dni: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(8)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    address: [''],
    phone: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    // Cargar clientes Y ventas en paralelo
    Promise.all([
      this.srv.getAllClients().toPromise(),
      this.saleSrv.getAllSales().toPromise()
    ]).then(([clientsRes, salesList]) => {
      console.log('📋 Clients loaded:', clientsRes?.data?.length ?? 0);
      console.log('📋 Sales loaded:', salesList?.length ?? 0);

      this.clients.set(clientsRes?.data ?? []);

      // Filtrar ventas por distribuidor si no es admin
      let filteredSales = salesList ?? [];
      if (this.isDistributor() && !this.isAdmin()) {
        const userDni = this.currentUserDni();
        console.log('🔍 Filtering sales for distributor DNI:', userDni);

        if (userDni) {
          filteredSales = filteredSales.filter(sale => {
            const distributorDni = sale.distributor?.dni;
            return distributorDni === userDni;
          });
          console.log('✅ Filtered sales for distributor:', filteredSales.length);
        } else {
          console.warn('⚠️ Distributor DNI not found');
          filteredSales = [];
        }
      }

      this.sales.set(filteredSales);
      this.loading.set(false);
    }).catch((err) => {
      const msg = err?.error?.message || this.t.instant('clients.errorLoad');
      this.error.set(msg);
      this.loading.set(false);
    });
  }

  toggleNew() {
    this.isNewOpen = !this.isNewOpen;
    if (this.isNewOpen) {
      this.resetForm();
    }
  }

  resetForm() {
    this.editDni.set(null);
    this.form.reset({
      dni: '',
      name: '',
      email: '',
      address: '',
      phone: ''
    });
    this.form.get('dni')?.enable();
    this.error.set(null);
  }

  edit(c: ClientDTO) {
    this.editDni.set(c.dni);
    this.form.patchValue({
      dni: c.dni,
      name: c.name,
      email: c.email,
      address: c.address || '',
      phone: c.phone || ''
    });
    
    this.form.get('dni')?.disable();
    this.isNewOpen = true;
    this.error.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  delete(dni: string) {
    if (!confirm(this.t.instant('clients.confirmDelete'))) return;
    
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    
    this.srv.deleteClient(dni).subscribe({
      next: () => {
        this.success.set('Cliente eliminado correctamente');
        this.load();
        setTimeout(() => this.success.set(null), 5000);
      },
      error: (err) => {
        const msg = err?.error?.message || this.t.instant('clients.errorDelete');
        this.error.set(msg);
        this.loading.set(false);
      }
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const isEdit = this.editDni() !== null;

    this.loading.set(true);
    this.error.set(null);

    if (isEdit) {
      const updateData: UpdateClientDTO = {
        name: value.name!.trim(),
        email: value.email!.trim(),
        address: value.address?.trim() || undefined,
        phone: value.phone?.trim() || undefined,
      };

      this.srv.updateClient(this.editDni()!, updateData).subscribe({
        next: () => {
          this.success.set(`Cliente "${value.name}" actualizado correctamente`);
          this.resetForm();
          this.isNewOpen = false;
          this.load();
          setTimeout(() => this.success.set(null), 5000);
        },
        error: (err) => {
          const msg = err?.error?.message || this.t.instant('clients.errorSave');
          this.error.set(msg);
          this.loading.set(false);
        }
      });
    } else {
      const createData: CreateClientDTO = {
        dni: value.dni!.trim(),
        name: value.name!.trim(),
        email: value.email!.trim(),
        address: value.address?.trim() || undefined,
        phone: value.phone?.trim() || undefined
      };

      this.srv.createClient(createData).subscribe({
        next: () => {
          this.success.set(`Cliente "${value.name}" creado correctamente`);
          this.resetForm();
          this.isNewOpen = false;
          this.load();
          setTimeout(() => this.success.set(null), 5000);
        },
        error: (err) => {
          const msg = err?.error?.message || this.t.instant('clients.errorCreate');
          this.error.set(msg);
          this.loading.set(false);
        }
      });
    }
  }

  hasError(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getErrorMessage(field: string): string {
    const control = this.form.get(field);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return this.t.instant(`clients.errors.${field}Required`);
    }
    if (control.errors['email']) {
      return this.t.instant('clients.errors.emailInvalid');
    }
    if (control.errors['minlength']) {
      const min = control.errors['minlength'].requiredLength;
      return this.t.instant('clients.errors.minLength', { min });
    }
    if (control.errors['maxlength']) {
      const max = control.errors['maxlength'].requiredLength;
      return this.t.instant('clients.errors.maxLength', { max });
    }

    return this.t.instant('clients.errors.invalid');
  }

  getPurchaseCount(client: ClientDTO): number {
    return this.purchasesByClient().get(client.dni) || 0;
  }

  hasPurchases(client: ClientDTO): boolean {
    return (this.purchasesByClient().get(client.dni) || 0) > 0;
  }
}