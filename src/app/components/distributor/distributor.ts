import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup, FormControl } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { DistributorService } from '../../services/distributor/distributor';
import { ZoneService } from '../../services/zone/zone';
import { ProductService } from '../../services/product/product';
import { AuthService, User, Role } from '../../services/user/user';

import { ZoneDTO } from '../../models/zone/zona.model';
import { ProductDTO } from '../../models/product/product.model';
import { DistributorDTO, CreateDistributorDTO, PatchDistributorDTO } from '../../models/distributor/distributor.model';

/**
 * DistributorComponent
 *
 * CRUD de distribuidores con:
 * - Listado + filtro por texto (dni/nombre/email/zona)
 * - Form reactivo con validación y normalización de tipos (zoneId string→number)
 * - Estrategia de guardado: POST para crear y PATCH con campos dirty para editar
 * - Mensajes listos para i18n y manejo de carga/errores con signals
 * - ✅ Notificaciones de éxito y cierre automático del formulario
 * - ✅ Modo de creación: manual o desde usuario existente
 */

type Mode = 'fromUser' | 'manual';

type DistForm = {
  dni: FormControl<string>;
  name: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
  address: FormControl<string>;
  zoneId: FormControl<number | null>;
  productsIds: FormControl<number[]>;
  createCreds: FormControl<boolean>;
  username: FormControl<string>;
  password: FormControl<string>;
};

@Component({
  selector: 'app-distributor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './distributor.html',
  styleUrls: ['./distributor.scss'],
})
export class DistributorComponent implements OnInit {
  // --- Inyección ---
  private fb = inject(FormBuilder);
  private srv = inject(DistributorService);
  private zoneSrv = inject(ZoneService);
  private prodSrv = inject(ProductService);
  private t = inject(TranslateService);
  private authSrv = inject(AuthService);

  // --- Roles y permisos ---
  isAdmin = computed(() => this.authSrv.hasRole(Role.ADMIN));
  isPartner = computed(() => this.authSrv.hasRole(Role.PARTNER));

  // Permisos específicos por rol
  canCreate = computed(() => this.isAdmin());   // Solo Admin puede crear
  canEdit = computed(() => this.isAdmin());     // Solo Admin puede editar
  canDelete = computed(() => this.isAdmin());   // Solo Admin puede eliminar
  // Partner solo puede ver (no tiene permisos especiales)

  // --- Estado base ---
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null); // ✅ Mensaje de éxito
  submitted = signal(false);

  list = signal<DistributorDTO[]>([]);
  zones = signal<ZoneDTO[]>([]);
  products = signal<ProductDTO[]>([]);
  fTextInput = signal('');
  fTextApplied = signal('');

  // --- Modo de creación ---
  mode = signal<Mode>('fromUser');

  // --- Mostrar/ocultar contraseña ---
  showPassword = signal(false);

  // --- Usuarios verificados (selector) ---
  users = signal<User[]>([]);
  userSearch = signal<string>('');
  selectedUserDni = signal<string | null>(null);

  filteredUsers = computed(() => {
    const q = this.userSearch().toLowerCase().trim();
    const arr = this.users();
    if (!q) return arr;
    return arr.filter(u => {
      const person = (u as any).person;
      if (!person) return false;
      return (
        (person.dni ?? '').toLowerCase().includes(q) ||
        (person.name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      );
    });
  });

  // --- UI ---
  isFormOpen = false;
  isEdit = signal(false); // true si estamos editando

  // --- Form reactivo ---
  form: FormGroup<DistForm> = this.fb.group<DistForm>({
    dni: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.minLength(6)]
    }),
    name: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.minLength(2)]
    }),
    phone: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.minLength(6)]
    }),
    email: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.email]
    }),
    address: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.minLength(1)] // ← Backend requiere address
    }),
    zoneId: this.fb.control<number | null>(null, {
      validators: [Validators.required]
    }),
    productsIds: this.fb.nonNullable.control<number[]>([]),

    // Credenciales (solo modo MANUAL)
    createCreds: this.fb.control<boolean>(false, { nonNullable: true }),
    username: this.fb.control<string>('', { nonNullable: true }),
    password: this.fb.control<string>('', { nonNullable: true }),
  });

  // --- Ciclo de vida ---
  ngOnInit(): void {
    this.load();
    this.loadZones();
    this.loadProducts();
    this.loadVerifiedUsers();
    this.applyCredsAvailabilityByMode(this.mode());

    // ✅ Normaliza zoneId si viene como string desde el <select>
    this.form.controls.zoneId.valueChanges.subscribe(v => {
      if (typeof v === 'string' && v !== '') {
        const n = Number(v);
        if (!Number.isNaN(n) && n > 0) {
          this.form.controls.zoneId.setValue(n, { emitEvent: false });
        }
      }
    });
  }

  // --- Data ---
  load() {
    this.loading.set(true);
    this.error.set(null);
    this.srv.getAll().subscribe({
      next: (res) => { 
        this.list.set(res); 
        this.loading.set(false); 
      },
      error: (err) => { 
        this.error.set(err?.error?.message || this.t.instant('distributors.errorLoad')); 
        this.loading.set(false); 
      }
    });
  }

  loadZones() {
    this.zoneSrv.getAllZones().subscribe({
      next: (res: any) => {
        const zones = res?.data ?? res ?? [];
        this.zones.set(Array.isArray(zones) ? zones : []);
      },
      error: (err) => {
        console.error('Error loading zones:', err);
      }
    });
  }

  loadProducts() {
    this.prodSrv.getAllProducts().subscribe({
      next: (res: any) => {
        const products = res?.data ?? res ?? [];
        this.products.set(Array.isArray(products) ? products : []);
      },
      error: (err) => {
        console.error('Error loading products:', err);
      }
    });
  }

  private loadVerifiedUsers(): void {
    // Filtrar usuarios elegibles para ser DISTRIBUTOR
    this.authSrv.getAllVerifiedUsers('DISTRIBUTOR').subscribe({
      next: (verifiedUsers) => {
        this.users.set(verifiedUsers);
        console.log(`[DistributorComponent] Loaded ${verifiedUsers.length} verified users eligible for DISTRIBUTOR role`);
      },
      error: (err) => {
        console.error('[DistributorComponent] Error loading verified users:', err);
        this.users.set([]);  // Array vacío en caso de error
      }
    });
  }

  // Habilita / deshabilita validadores de credenciales
  private toggleCredsValidators(enable: boolean) {
    if (enable) {
      this.form.controls.username.setValidators([Validators.required, Validators.minLength(3)]);
      this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    } else {
      this.form.controls.username.clearValidators();
      this.form.controls.password.clearValidators();
      this.form.patchValue({ username: '', password: '' });
    }
    this.form.controls.username.updateValueAndValidity({ emitEvent: false });
    this.form.controls.password.updateValueAndValidity({ emitEvent: false });
  }

  // Aplica disponibilidad según modo
  private applyCredsAvailabilityByMode(mode: Mode) {
    if (mode === 'fromUser') {
      // Forzar oculto y limpio
      this.form.patchValue({ createCreds: false, username: '', password: '' });
      this.toggleCredsValidators(false);
    } else {
      // Modo manual: respetar toggle actual
      const create = !!this.form.controls.createCreds.value;
      this.toggleCredsValidators(create);
    }
  }

  // Handler de toggle en template
  onCredsToggle(ev: Event) {
    const checked = !!(ev.target as HTMLInputElement).checked;
    this.form.controls.createCreds.setValue(checked);
    this.toggleCredsValidators(checked);
  }

  // Toggle para mostrar/ocultar contraseña
  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  // Helper para obtener datos de persona desde usuario
  getUserPerson(user: User): any {
    return (user as any).person;
  }

  getUserPersonDni(user: User): string {
    return (user as any).person?.dni ?? '';
  }

  onModeChange(ev: Event) {
    const val = (ev.target as HTMLInputElement).value as Mode;
    this.mode.set(val);
    this.applyCredsAvailabilityByMode(val);
    if (val === 'manual') {
      this.selectedUserDni.set(null);
    }
  }

  onSelectUser(ev: Event) {
    const dni = (ev.target as HTMLSelectElement).value || '';
    if (!dni) {
      this.selectedUserDni.set(null);
      return;
    }
    this.selectedUserDni.set(dni);
    const u = this.users().find(x => (x as any).person?.dni === dni);
    if (u && (u as any).person) {
      const person = (u as any).person;
      this.form.patchValue({
        dni: person.dni ?? '',
        name: person.name ?? '',
        email: u.email ?? '',
        address: person.address ?? '',
        phone: person.phone ?? ''
      });
    }
  }

  // Método para seleccionar usuario directamente desde la lista
  selectUserByDni(dni: string) {
    if (!dni) {
      this.selectedUserDni.set(null);
      return;
    }
    this.selectedUserDni.set(dni);
    const u = this.users().find(x => (x as any).person?.dni === dni);
    if (u && (u as any).person) {
      const person = (u as any).person;
      this.form.patchValue({
        dni: person.dni ?? '',
        name: person.name ?? '',
        email: u.email ?? '',
        address: person.address ?? '',
        phone: person.phone ?? ''
      });
    }
  }

  applyFilters() {
    this.fTextApplied.set(this.fTextInput());
  }

  clearFilters() {
    this.fTextInput.set('');
    this.fTextApplied.set('');
  }

  totalDistributors = computed(() => this.list().length);
  distributorsWithProducts = computed(() => 
    this.list().filter(d => d.products && d.products.length > 0).length
  );

  // --- Listado filtrado ---
  filtered = computed(() => {
    const q = this.fTextApplied().toLowerCase().trim();
    if (!q) return this.list();
    return this.list().filter(d =>
      String(d.dni).includes(q) ||
      (d.name || '').toLowerCase().includes(q) ||
      (d.email || '').toLowerCase().includes(q) ||
      (d.zone?.name || '').toLowerCase().includes(q)
    );
  });

  // --- UI helpers ---
  new() {
    this.isEdit.set(false);
    this.submitted.set(false);
    this.error.set(null);
    this.mode.set('fromUser');
    this.selectedUserDni.set(null);
    this.userSearch.set('');
    this.form.reset({
      dni: '',
      name: '',
      phone: '',
      email: '',
      address: '',
      zoneId: null,
      productsIds: [],
      createCreds: false,
      username: '',
      password: ''
    });
    this.applyCredsAvailabilityByMode('fromUser');
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.isFormOpen = true;
  }

  edit(d: DistributorDTO) {
    this.isEdit.set(true);
    this.submitted.set(false);
    this.error.set(null);
    
    // ✅ Extraer IDs de productos correctamente
    let productsIds: number[] = [];
    if (Array.isArray(d.products)) {
      productsIds = d.products.map(p => Number(p.id)).filter(n => !isNaN(n));
    }

    this.form.reset({
      dni: String(d.dni ?? ''),
      name: d.name ?? '',
      phone: d.phone ?? '',
      email: d.email ?? '',
      address: d.address ?? '',
      zoneId: (d.zone?.id ?? d.zoneId ?? null) as number | null,
      productsIds: productsIds,
    });
    
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.isFormOpen = true;
  }

  cancel() {
    this.isFormOpen = false;
    this.submitted.set(false);
    this.error.set(null);
  }

  // --- Builders ---
  private buildCreate(): CreateDistributorDTO {
    const v = this.form.getRawValue();
    const ids = Array.isArray(v.productsIds)
      ? v.productsIds.map(Number).filter(n => !Number.isNaN(n))
      : [];

    const isManual = this.mode() === 'manual';
    const wantCreds = isManual && !!v.createCreds;

    // ✅ El backend espera zoneId como STRING que luego transforma a número
    const payload: CreateDistributorDTO = {
      dni: String(v.dni).trim(),
      name: String(v.name).trim(),
      phone: String(v.phone).trim(),
      email: String(v.email).trim(),
      address: String(v.address).trim() || '-', // ← Backend requiere address (min 1 char)
      zoneId: String(v.zoneId) as any, // Backend lo transforma con z.string().transform(Number)
      productsIds: ids,
      ...(wantCreds ? {
        // ✅ Usar el username del formulario - ahora el login acepta email o username
        username: (v.username || '').trim(),
        password: (v.password || '').trim(),
      } : {})
    };

    return payload;
  }

  private buildUpdate(): PatchDistributorDTO {
    const v = this.form.getRawValue();
    const patch: PatchDistributorDTO = {};
    
    if (this.form.controls.name.dirty) {
      patch.name = String(v.name).trim();
    }
    if (this.form.controls.phone.dirty) {
      patch.phone = String(v.phone).trim();
    }
    if (this.form.controls.email.dirty) {
      patch.email = String(v.email).trim();
    }
    if (this.form.controls.address.dirty) {
      patch.address = String(v.address || '').trim();
    }
    if (this.form.controls.zoneId.dirty && v.zoneId != null) {
      patch.zoneId = String(v.zoneId) as any; // Backend lo transforma
    }
    if (this.form.controls.productsIds.dirty) {
      patch.productsIds = (v.productsIds || []).map(Number).filter(n => !Number.isNaN(n));
    }
    
    return patch;
  }

  // --- Helpers para productos (checkboxes) ---
  isProductSelected(productId: number): boolean {
    const selected = this.form.controls.productsIds.value || [];
    return selected.includes(productId);
  }

  toggleProduct(productId: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const selected = [...(this.form.controls.productsIds.value || [])];
    
    if (checkbox.checked) {
      // Agregar si no está
      if (!selected.includes(productId)) {
        selected.push(productId);
      }
    } else {
      // Quitar si está
      const index = selected.indexOf(productId);
      if (index > -1) {
        selected.splice(index, 1);
      }
    }
    
    this.form.controls.productsIds.setValue(selected);
    this.form.controls.productsIds.markAsDirty();
  }

  // --- Guardado ---
  save() {
    this.submitted.set(true);
    
    // ✅ Marcar todos los campos como touched para mostrar errores
    Object.keys(this.form.controls).forEach(key => {
      this.form.get(key)?.markAsTouched();
    });

    if (this.form.invalid) {
      this.error.set(this.t.instant('distributors.form.err.fill'));
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null); // ✅ Limpiar mensaje previo

    if (!this.isEdit()) {
      // CREATE
      const payload = this.buildCreate();
      
      this.srv.create(payload).subscribe({
        next: (res) => {
          // ✅ Mostrar mensaje de éxito
          this.success.set(this.t.instant('distributors.successCreate') || `Distribuidor "${payload.name}" creado correctamente`);

          this.cancel();
          this.load();
          this.loadVerifiedUsers(); // ✅ Recargar usuarios verificados

          // ✅ Auto-ocultar después de 5 segundos
          setTimeout(() => this.success.set(null), 5000);
        },
        error: (err) => { 
          const errorMsg = err?.error?.message || err?.error?.errors?.[0]?.message || this.t.instant('distributors.errorCreate');
          this.error.set(errorMsg); 
          this.loading.set(false); 
        }
      });
      return;
    }

    // UPDATE
    const dni = String(this.form.controls.dni.value);
    const patch = this.buildUpdate();
    
    // ✅ Si no hay cambios, no enviar nada
    if (Object.keys(patch).length === 0) {
      this.error.set(this.t.instant('distributors.form.err.noChanges'));
      this.loading.set(false);
      return;
    }

    this.srv.update(dni, patch).subscribe({
      next: () => { 
        // ✅ Mostrar mensaje de éxito
        this.success.set(this.t.instant('distributors.successUpdate') || 'Distribuidor actualizado correctamente');
        
        this.cancel(); 
        this.load();
        
        // ✅ Auto-ocultar después de 5 segundos
        setTimeout(() => this.success.set(null), 5000);
      },
      error: (err) => { 
        this.error.set(err?.error?.message || this.t.instant('distributors.errorSave')); 
        this.loading.set(false); 
      }
    });
  }

  // --- Borrado ---
  delete(dni: string | number) {
    if (!confirm(this.t.instant('distributors.confirmDelete'))) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null); // ✅ Limpiar mensaje previo
    
    this.srv.delete(String(dni)).subscribe({
      next: () => {
        // ✅ Mostrar mensaje de éxito
        this.success.set(this.t.instant('distributors.successDelete') || 'Distribuidor eliminado correctamente');

        this.load();
        this.loadVerifiedUsers(); // ✅ Recargar usuarios verificados

        // ✅ Auto-ocultar después de 5 segundos
        setTimeout(() => this.success.set(null), 5000);
      },
      error: (err) => { 
        this.error.set(err?.error?.message || this.t.instant('distributors.errorDelete')); 
        this.loading.set(false); 
      }
    });
  }
}