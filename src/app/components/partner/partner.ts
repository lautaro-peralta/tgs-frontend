import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

import { PartnerService } from '../../services/partner/partner';
import { AuthService, User, Role } from '../../services/user/user';

import {
  PartnerDTO,
  CreatePartnerDTO,
  PatchPartnerDTO,
  PartnerDecisionRefDTO
} from '../../models/partner/partner.model';

type Mode = 'fromUser' | 'manual';

@Component({
  selector: 'app-partner',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './partner.html',
  styleUrls: ['./partner.scss']
})
export class PartnerComponent implements OnInit {
  // Servicios
  private tr = inject(TranslateService);
  private fb = inject(FormBuilder);
  private srv = inject(PartnerService);
  private authSrv = inject(AuthService);

  // --- Roles y permisos ---
  isAdmin = computed(() => this.authSrv.hasRole(Role.ADMIN));
  isPartner = computed(() => this.authSrv.hasRole(Role.PARTNER));

  // Permisos específicos por rol
  canCreate = computed(() => this.isAdmin());   // Solo Admin puede crear
  canEdit = computed(() => this.isAdmin());     // Solo Admin puede editar
  canDelete = computed(() => this.isAdmin());   // Solo Admin puede eliminar
  // Partner solo puede ver (no tiene permisos especiales)

  // Estado base
  items = signal<PartnerDTO[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null); // ✅ Mensaje de éxito

  // Filtros / UI
  fTextInput = signal('');
  fTextApplied = signal('');
  isNewOpen = signal(false);
  isEdit = signal(false);

  // Modo de creación
  mode = signal<Mode>('fromUser');

  // --- Mostrar/ocultar contraseña ---
  showPassword = signal(false);

  // Usuarios verificados (selector)
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

  // Listado filtrado de socios
  filteredPartners = computed(() => {
    const q = this.fTextApplied().toLowerCase().trim();
    if (!q) return this.items();
    return this.items().filter(it =>
      it.dni.toLowerCase().includes(q) ||
      (it.name ?? '').toLowerCase().includes(q) ||
      (it.email ?? '').toLowerCase().includes(q) ||
      (it.phone ?? '').toLowerCase().includes(q) ||
      (it.address ?? '').toLowerCase().includes(q) ||
      (it.decisions ?? []).some(d => (String(d.id).includes(q) || (d.description ?? '').toLowerCase().includes(q)))
    );
  });

  // Formulario
  form = this.fb.group({
    dni:       this.fb.control<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
    name:      this.fb.control<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    email:     this.fb.control<string>('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    address:   this.fb.control<string>('', { nonNullable: false }),
    phone:     this.fb.control<string>('', { nonNullable: false }),

    // Credenciales (solo modo MANUAL)
    createCreds: this.fb.control<boolean>(false, { nonNullable: true }),
    username:  this.fb.control<string>('', { nonNullable: true }),
    password:  this.fb.control<string>('', { nonNullable: true }),
  });

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

  // === NEW: handler de toggle en template ===
  onCredsToggle(ev: Event) {
    const checked = !!(ev.target as HTMLInputElement).checked;
    this.form.controls.createCreds.setValue(checked);
    this.toggleCredsValidators(checked);
  }

  // Toggle para mostrar/ocultar contraseña
  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  // ciclo de vida
  ngOnInit(): void {
    this.load();
    this.loadVerifiedUsers();
    this.applyCredsAvailabilityByMode(this.mode());
  }

  // data
  private load(): void {
    this.loading.set(true);
    const q = this.fTextApplied().trim() || undefined;
    this.srv.list({ q }).subscribe({
      next: (res) => { this.items.set(res.data ?? []); this.loading.set(false); },
      error: (e)  => {
        this.error.set(e?.error?.message ?? this.tr.instant('partner.errorLoad'));
        this.loading.set(false);
      }
    });
  }

  applyFilters() {
    this.fTextApplied.set(this.fTextInput());
    this.load(); // Recarga con el nuevo filtro
  }

  clearFilters() {
    this.fTextInput.set('');
    this.fTextApplied.set('');
    this.load();
  }

  totalPartners = computed(() => this.items().length);
  partnersWithDecisions = computed(() => 
    this.items().filter(p => p.decisions && p.decisions.length > 0).length
  );

  private loadVerifiedUsers(): void {
    // Filtrar usuarios elegibles para ser PARTNER (excluye AUTHORITY y usuarios que ya son PARTNER)
    this.authSrv.getAllVerifiedUsers('PARTNER').subscribe({
      next: (verifiedUsers) => {
        this.users.set(verifiedUsers);
        console.log(`[PartnerComponent] Loaded ${verifiedUsers.length} verified users eligible for PARTNER role`);
      },
      error: (err) => {
        console.error('[PartnerComponent] Error loading verified users:', err);
        this.users.set([]);  // Array vacío en caso de error
      }
    });
  }

  private http = inject(HttpClient);

  // Helper para obtener datos de persona desde usuario
  getUserPerson(user: User): any {
    return (user as any).person;
  }

  getUserPersonDni(user: User): string {
    return (user as any).person?.dni ?? '';
  }

  // UI
  toggleNew() {
    const open = !this.isNewOpen();
    this.isNewOpen.set(open);
    if (open) this.new();
  }

  new() {
    this.isEdit.set(false);
    this.mode.set('fromUser');
    this.selectedUserDni.set(null);
    this.userSearch.set('');
    this.form.reset({
      dni: '', name: '', email: '', address: '', phone: '',
      createCreds: false, username: '', password: ''
    });
    this.applyCredsAvailabilityByMode('fromUser');
    this.clearMessages();
  }

  edit(p: PartnerDTO) {
    this.isEdit.set(true);
    this.isNewOpen.set(true);
    this.mode.set('manual'); // al editar, manual
    this.form.reset({
      dni: p.dni,
      name: p.name ?? '',
      email: p.email ?? '',
      address: p.address ?? '',
      phone: p.phone ?? '',
      createCreds: false,
      username: '',
      password: ''
    });
    this.applyCredsAvailabilityByMode('manual');
    this.clearMessages();
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

  // Guardar
  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.clearMessages();

    const v = this.form.getRawValue();
    const isManual = this.mode() === 'manual';
    const wantCreds = isManual && !!v.createCreds;

    const payload: CreatePartnerDTO = {
      dni: (v.dni || '').trim(),
      name: (v.name || '').trim(),
      email: (v.email || '').trim(),
      address: (v.address || '').trim() || null,
      phone: (v.phone || '').trim() || null,
      ...(wantCreds ? {
        // ✅ Usar el username del formulario - ahora el login acepta email o username
        username: (v.username || '').trim(),
        password: (v.password || '').trim(),
      } : {})
    };

    if (!this.isEdit()) {
      // CREATE
      this.srv.create(payload).subscribe({
        next: () => { 
          // ✅ Mensaje de éxito
          this.success.set(`Socio "${payload.name}" creado correctamente`);
          
          this.new(); 
          this.load(); 
          
          // ✅ Cerrar formulario
          this.isNewOpen.set(false);
          
          // ✅ Auto-ocultar después de 5 segundos
          setTimeout(() => this.success.set(null), 5000);
        },
        error: (e) => {
          this.error.set(e?.error?.message ?? this.tr.instant('partner.errorCreate'));
          this.loading.set(false);
        }
      });
    } else {
      // EDIT / PATCH
      const patch: PatchPartnerDTO = {
        name: payload.name,
        email: payload.email,
        address: payload.address ?? undefined,
        phone: payload.phone ?? undefined
      };
      this.srv.update(this.form.controls.dni.value, patch).subscribe({
        next: () => { 
          // ✅ Mensaje de éxito
          this.success.set(`Socio "${patch.name}" actualizado correctamente`);
          
          this.new(); 
          this.load(); 
          
          // ✅ Cerrar formulario
          this.isNewOpen.set(false);
          
          // ✅ Auto-ocultar después de 5 segundos
          setTimeout(() => this.success.set(null), 5000);
        },
        error: (e) => {
          this.error.set(e?.error?.message ?? this.tr.instant('partner.errorUpdate'));
          this.loading.set(false);
        }
      });
    }
  }

  delete(p: PartnerDTO) {
    if (!p?.dni) return;

    // Confirmación antes de eliminar
    const confirmed = confirm(
      this.tr.instant('partner.confirmDelete', { name: p.name, dni: p.dni }) ||
      `¿Estás seguro de eliminar al socio ${p.name} (DNI: ${p.dni})?`
    );

    if (!confirmed) return;

    this.loading.set(true);
    this.clearMessages();

    this.srv.delete(p.dni).subscribe({
      next: () => {
        // ✅ Mensaje de éxito
        this.success.set(`Socio "${p.name}" eliminado correctamente`);
        
        this.load();
        
        // ✅ Auto-ocultar después de 5 segundos
        setTimeout(() => this.success.set(null), 5000);
      },
      error: (e) => {
        console.error('[PartnerComponent] Error deleting partner:', e);
        this.error.set(e?.error?.message ?? this.tr.instant('partner.errorDelete'));
        this.loading.set(false);
      }
    });
  }

  // ✅ Limpiar mensajes
  private clearMessages(): void {
    this.error.set(null);
    this.success.set(null);
  }

  // ✅ Migración: Asignar roles PARTNER a socios existentes
  runMigration() {
    if (!confirm('¿Estás seguro de ejecutar la migración de roles? Esto asignará el rol PARTNER a todos los usuarios que tienen un socio asociado.')) {
      return;
    }

    this.loading.set(true);
    this.clearMessages();

    this.srv.migratePartnerRoles().subscribe({
      next: (result) => {
        console.log('[PartnerComponent] Migration result:', result);
        this.success.set(
          `Migración completada: ${result.data?.rolesAssigned || 0} roles asignados, ` +
          `${result.data?.alreadyHadRole || 0} ya tenían el rol, ` +
          `${result.data?.userNotFound || 0} sin usuario asociado`
        );
        this.loading.set(false);

        // Recargar la lista de usuarios verificados
        this.loadVerifiedUsers();

        // Auto-ocultar después de 10 segundos
        setTimeout(() => this.success.set(null), 10000);
      },
      error: (e) => {
        console.error('[PartnerComponent] Migration error:', e);
        this.error.set(e?.error?.message ?? 'Error al ejecutar la migración');
        this.loading.set(false);
      }
    });
  }
}