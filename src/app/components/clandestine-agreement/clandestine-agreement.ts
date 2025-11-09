import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

// Servicios
import { ClandestineAgreementService } from '../../services/clandestine-agreement/clandestine-agreement';
import { AuthorityService } from '../../services/authority/authority';
import { AdminService } from '../../services/admin/admin';
import { ShelbyCouncilService } from '../../services/shelby-council/shelby-council';
import { AuthService, Role } from '../../services/user/user';

// Modelos
import {
  ClandestineAgreementDTO,
  CreateClandestineAgreementDTO,
  UpdateClandestineAgreementDTO
} from '../../models/clandestine-agreement/clandestine-agreement.model';
import { AuthorityDTO } from '../../models/authority/authority.model';
import { AdminDTO } from '../../models/admin/admin.model';
import { ShelbyCouncilDTO } from '../../models/shelby-council/shelby-council.model';

@Component({
  selector: 'app-clandestine-agreement',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './clandestine-agreement.html',
  styleUrls: ['./clandestine-agreement.scss'],
})
export class ClandestineAgreementComponent implements OnInit {
  private fb  = inject(FormBuilder);
  private srv = inject(ClandestineAgreementService);
  private authoritySrv = inject(AuthorityService);
  private adminSrv = inject(AdminService);
  private councilSrv = inject(ShelbyCouncilService);
  private authSrv = inject(AuthService);
  private tr  = inject(TranslateService);

  // --- Roles y permisos ---
  isAdmin = computed(() => this.authSrv.hasRole(Role.ADMIN));
  isPartner = computed(() => this.authSrv.hasRole(Role.PARTNER));
  isAuthority = computed(() => this.authSrv.hasRole(Role.AUTHORITY));

  // Permisos específicos por rol - Admin y Partner pueden hacer todo, Authority no puede hacer nada
  canCreate = computed(() => this.isAdmin() || this.isPartner());
  canEdit = computed(() => this.isAdmin() || this.isPartner());
  canDelete = computed(() => this.isAdmin() || this.isPartner());

  // Estado
  items   = signal<ClandestineAgreementDTO[]>([]);
  loading = signal(false);
  error   = signal<string | null>(null);

  isNewOpen = signal(false);
  isEdit    = signal(false);

  fTextInput = signal('');
  fTextApplied = signal('');

  //  Datos reales desde la API
  authorities = signal<AuthorityDTO[]>([]);
  admins = signal<AdminDTO[]>([]);
  councils = signal<ShelbyCouncilDTO[]>([]);

  form = this.fb.group({
    id:              this.fb.control<number | null>(null),
    shelbyCouncilId: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    adminDni:        this.fb.control<string>('', [Validators.required, Validators.minLength(6)]),
    authorityDni:    this.fb.control<string>('', [Validators.required, Validators.minLength(6)]),
    agreementDate:   this.fb.control<string | null>(null),
    description:     this.fb.control<string>(''),
    status:          this.fb.control<'ACTIVE'|'COMPLETED'|'CANCELLED'>('ACTIVE'),
  });

  ngOnInit(): void { 
    this.loadAll(); 
  }

  filtered = computed(() => {
    const q = this.fTextApplied().toLowerCase().trim();
    if (!q) return this.items();
    return this.items().filter(it =>
      (it.description?.toLowerCase().includes(q) ?? false) ||
      String(it.id).includes(q) ||
      (it.authority?.name?.toLowerCase().includes(q) ?? false) ||
      (it.authority?.dni?.toLowerCase().includes(q) ?? false) ||
      (it.admin?.name?.toLowerCase().includes(q) ?? false) ||
      (it.admin?.dni?.toLowerCase().includes(q) ?? false) ||
      (it.shelbyCouncil?.id !== undefined && String(it.shelbyCouncil.id).includes(q))
    );
  });

  applyFilters() {
    this.fTextApplied.set(this.fTextInput());
  }

  clearFilters() {
    this.fTextInput.set('');
    this.fTextApplied.set('');
  }

  totalAgreements = computed(() => this.items().length);
  agreementsByStatus = computed(() => {
    const byStatus = { ACTIVE: 0, COMPLETED: 0, CANCELLED: 0 };
    this.items().forEach(a => {
      if (a.status && byStatus.hasOwnProperty(a.status)) {
        byStatus[a.status]++;
      }
    });
    return byStatus;
  });
  uniqueAdmins = computed(() => 
    new Set(this.items().map(i => i.admin?.dni).filter(Boolean)).size
  );
  uniqueAuthorities = computed(() => 
    new Set(this.items().map(i => i.authority?.dni).filter(Boolean)).size
  );

  toggleNew(): void {
    const willOpen = !this.isNewOpen();
    this.isNewOpen.set(willOpen);
    
    if (willOpen) {
      this.new();
    } else {
      this.error.set(null);
    }
  }

  new(): void {
    this.isEdit.set(false);
    this.error.set(null);
    this.form.reset({
      id: null,
      shelbyCouncilId: null,
      adminDni: '',
      authorityDni: '',
      agreementDate: null,
      description: '',
      status: 'ACTIVE'
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.isNewOpen.set(true);
    
  }

  cancel(): void {
    this.isNewOpen.set(false);
    this.error.set(null);
  }

  edit(it: ClandestineAgreementDTO): void {
    this.isEdit.set(true);
    this.form.patchValue({
      id: it.id,
      shelbyCouncilId: it.shelbyCouncil?.id ?? null,
      adminDni: it.admin?.dni ?? '',
      authorityDni: it.authority?.dni ?? '',
      agreementDate: it.agreementDate?.substring(0,10) ?? null,
      description: it.description ?? '',
      status: it.status,
    });
    this.isNewOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) { 
      this.form.markAllAsTouched(); 
      return; 
    }
    
    this.loading.set(true);
    this.error.set(null);
    
    const { id, ...rest } = this.form.getRawValue();

    if (!this.isEdit()) {
      // CREAR NUEVO ACUERDO
      let agreementDateISO: string | undefined;
      if (rest.agreementDate) {
        agreementDateISO = new Date(rest.agreementDate + 'T00:00:00.000Z').toISOString();
      }

      const payload: CreateClandestineAgreementDTO = {
        shelbyCouncilId: rest.shelbyCouncilId!,
        adminDni: rest.adminDni!,
        authorityDni: rest.authorityDni!,
        agreementDate: agreementDateISO,
        description: rest.description || undefined,
        status: rest.status || 'ACTIVE',
      };
      
      this.srv.create(payload).subscribe({
        next: () => { 
          this.cancel();
          this.loadAll(); 
        },
        error: (e) => { 
          this.error.set(e?.error?.message ?? 'Error creando acuerdo'); 
          this.loading.set(false); 
        }
      });
    } else {
      // ACTUALIZAR ACUERDO EXISTENTE
      let agreementDateISO: string | undefined;
      if (rest.agreementDate) {
        agreementDateISO = new Date(rest.agreementDate + 'T00:00:00.000Z').toISOString();
      }

      const payload: UpdateClandestineAgreementDTO = {
        agreementDate: agreementDateISO,
        description: rest.description || undefined,
        status: rest.status || undefined,
      };
      
      this.srv.update(id!, payload).subscribe({
        next: () => { 
          this.cancel();
          this.loadAll(); 
        },
        error: (e) => { 
          this.error.set(e?.error?.message ?? 'Error actualizando acuerdo'); 
          this.loading.set(false); 
        }
      });
    }
  }

  delete(it: ClandestineAgreementDTO): void {
    const msg = this.tr.instant('clandestineAgreement.confirmDelete') || '¿Eliminar este acuerdo clandestino?';
    if (!confirm(msg)) return;
    
    this.loading.set(true);
    this.srv.delete(it.id).subscribe({ 
      next: () => this.loadAll(),
      error: (e) => {
        this.error.set(e?.error?.message ?? 'Error eliminando');
        this.loading.set(false);
      }
    });
  }

  trackById = (_: number, it: ClandestineAgreementDTO) => it.id;

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      agreements: this.srv.list(),
      authorities: this.authoritySrv.getAllAuthorities(),
      admins: this.adminSrv.list(),
      councils: this.councilSrv.list()
    }).subscribe({
      next: (res) => { 
        this.items.set(res.agreements.data ?? []); 
        this.authorities.set(res.authorities.data ?? []);
        this.admins.set(res.admins.data ?? []);
        this.councils.set(res.councils.data ?? []);
        this.loading.set(false); 
      },
      error: (e) => { 
        this.error.set(e?.error?.message ?? 'Error cargando datos'); 
        this.loading.set(false); 
      }
    });
  }
}
