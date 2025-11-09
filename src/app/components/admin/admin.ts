import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../services/admin/admin';
import { AdminDTO, CreateAdminDTO, PatchAdminDTO } from '../../models/admin/admin.model';
import { AuthService } from '../../services/user/user';
import { User } from '../../models/user/user.model';

/**
 * Componente: Admin
 *
 * - Un único panel (glass + card) que contiene header, filtros, mensajes y listado.
 * - Panel de crear/editar en overlay flotante centrado.
 * - Permite crear administradores desde usuarios verificados.
 * - Estado y UI reactivo con Signals.
 */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.scss'],
})
export class AdminComponent implements OnInit {
  // Inyección
  private fb  = inject(FormBuilder);
  private srv = inject(AdminService);
  private authSrv = inject(AuthService);
  private tr = inject(TranslateService);

  // ── Estado base ──────────────────────────────────────────────────────────────
  items   = signal<AdminDTO[]>([]);
  loading = signal(false);
  error   = signal<string | null>(null);

  // Panel crear/editar (cerrado por defecto)
  isNewOpen = false;
  isEdit    = signal(false);

  // Usuarios verificados
  users = signal<User[]>([]);
  userSearch = signal('');
  fromUser = signal(false);

  // Filtro
  fTextInput = signal('');
  fTextApplied = signal('');

  // ── Formulario ───────────────────────────────────────────────────────────────
  form = this.fb.group({
    dni:   this.fb.nonNullable.control('', [Validators.required, Validators.minLength(6)]),
    name:  this.fb.nonNullable.control('', [Validators.required]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    phone: this.fb.control<string | null>(null),
  });

  // ── Ciclo de vida ───────────────────────────────────────────────────────────
  ngOnInit(): void { 
    this.load();
    this.loadVerifiedUsers();
  }

  // ── Derivados ───────────────────────────────────────────────────────────────
  filtered = computed(() => {
    const q = this.fTextApplied().toLowerCase().trim();
    return this.items().filter(it =>
      !q ||
      it.dni.toLowerCase().includes(q) ||
      it.name.toLowerCase().includes(q) ||
      (it.email?.toLowerCase().includes(q) ?? false) ||
      (it.phone?.toLowerCase().includes(q) ?? false)
    );
  });

  filteredUsers = computed(() => {
    const q = this.userSearch().toLowerCase().trim();
    const allUsers = this.users();
    const adminDnis = new Set(this.items().map(admin => admin.dni));

    // Filtrar usuarios que NO son administradores
    const availableUsers = allUsers.filter(u => {
      const person = (u as any).person;
      if (!person) return false;
      return !adminDnis.has(person.dni);
    });

    // Si no hay búsqueda, retornar todos los disponibles
    if (!q) return availableUsers;

    // Aplicar filtro de búsqueda
    return availableUsers.filter(u => {
      const person = (u as any).person;
      return (
        (person.dni ?? '').toLowerCase().includes(q) ||
        (person.name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      );
    });
  });

  applyFilters() {
    this.fTextApplied.set(this.fTextInput());
  }

  clearFilters() {
    this.fTextInput.set('');
    this.fTextApplied.set('');
  }

  totalAdmins = computed(() => this.items().length);

  // ── Acciones UI ─────────────────────────────────────────────────────────────
  /** Abre/cierra el panel overlay de crear/editar. */
  toggleNew(): void {
    this.isNewOpen = !this.isNewOpen;
    if (!this.isNewOpen) this.new();
  }

  /** Pone modo crear y limpia el form. */
  new(): void {
    this.isEdit.set(false);
    this.fromUser.set(false);
    this.userSearch.set('');
    this.form.reset({ dni: '', name: '', email: '', phone: null });
  }

  /** Carga registro al form para editar y abre el panel. */
  edit(it: AdminDTO): void {
    this.isEdit.set(true);
    this.fromUser.set(false);
    this.form.patchValue({ dni: it.dni, name: it.name, email: it.email, phone: it.phone ?? null });
    this.isNewOpen = true;
  }

  /** Selecciona un usuario verificado y auto-completa el formulario */
  selectUser(userId: string): void {
    const user = this.users().find(u => u.id === userId);
    if (!user || !(user as any).person) return;
    
    const person = (user as any).person;
    this.form.patchValue({
      dni: person.dni ?? '',
      name: person.name ?? '',
      email: person.email ?? user.email ?? '',
      phone: person.phone ?? null
    });
    this.fromUser.set(true);
  }

  /** Crea/actualiza y refresca listado. */
  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    const payload = this.form.getRawValue();

    if (!this.isEdit()) {
      this.srv.create(payload as CreateAdminDTO).subscribe({
        next: () => { this.new(); this.isNewOpen = false; this.load(); },
        error: (e) => { this.error.set(e?.error?.message ?? 'Error creando'); this.loading.set(false); }
      });
    } else {
      const { dni, ...rest } = payload as any;
      this.srv.update(dni, rest as PatchAdminDTO).subscribe({
        next: () => { this.new(); this.isNewOpen = false; this.load(); },
        error: (e) => { this.error.set(e?.error?.message ?? 'Error guardando'); this.loading.set(false); }
      });
    }
  }

  /** Elimina tras confirmar y recarga. */
  delete(it: AdminDTO): void {
    const msg = this.tr.instant('common.delete') || 'Eliminar';
    const noun = this.tr.instant('admin.title') || 'Administrador';
    if (!confirm(`${msg} ${noun}?`)) return;
    this.srv.delete(it.dni).subscribe({ next: () => this.load() });
  }

  // trackBy helpers para *ngFor
  trackByDni = (_: number, it: AdminDTO) => it.dni;
  trackByUserId = (_: number, u: User) => u.id;

  // ── Data ────────────────────────────────────────────────────────────────────
  private load(): void {
    this.loading.set(true);
    this.srv.list().subscribe({
      next: (res) => { this.items.set(res.data ?? []); this.loading.set(false); },
      error: (e) =>  { this.error.set(e?.error?.message ?? 'Error cargando'); this.loading.set(false); }
    });
  }

  private loadVerifiedUsers(): void {
    this.authSrv.getAllVerifiedUsers().subscribe({
      next: (verifiedUsers) => {
        this.users.set(verifiedUsers);
        console.log(`[AdminComponent] Loaded ${verifiedUsers.length} verified users`);
      },
      error: (err) => {
        console.error('[AdminComponent] Error loading verified users:', err);
        this.users.set([]);
      }
    });
  }
}
