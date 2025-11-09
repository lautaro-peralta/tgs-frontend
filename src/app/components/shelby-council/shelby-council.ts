import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

// Services
import { ShelbyCouncilService } from '../../services/shelby-council/shelby-council';
import { PartnerService } from '../../services/partner/partner';
import { DecisionService } from '../../services/decision/decision';
import { AuthService, Role } from '../../services/user/user';

// Models
import {
  ShelbyCouncilDTO,
  CreateShelbyCouncilDTO,
  PatchShelbyCouncilDTO
} from '../../models/shelby-council/shelby-council.model';
import { PartnerDTO } from '../../models/partner/partner.model';
import { DecisionDTO } from '../../models/decision/decision.model';

@Component({
  selector: 'app-shelby-council',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './shelby-council.html',
  styleUrls: ['./shelby-council.scss'],
})
export class ShelbyCouncilComponent implements OnInit {
  private fb  = inject(FormBuilder);
  private srv = inject(ShelbyCouncilService);
  private partnerSrv = inject(PartnerService);
  private decisionSrv = inject(DecisionService);
  private tr  = inject(TranslateService);
  private authSrv = inject(AuthService);

  // --- Roles y permisos ---
  isAdmin = computed(() => this.authSrv.hasRole(Role.ADMIN));
  isPartner = computed(() => this.authSrv.hasRole(Role.PARTNER));

  // Permisos específicos por rol - Partner puede hacer todo, Admin solo ver
  canCreate = computed(() => this.isPartner());   // Solo Partner puede crear
  canEdit = computed(() => this.isPartner());     // Solo Partner puede editar
  canDelete = computed(() => this.isPartner());   // Solo Partner puede eliminar
  // Admin solo puede ver (no tiene permisos especiales)

  // Estado
  items   = signal<ShelbyCouncilDTO[]>([]);
  loading = signal(false);
  error   = signal<string | null>(null);
  success = signal<string | null>(null); // ✅ Mensaje de éxito
  isNewOpen = signal(false);
  isEdit    = signal(false);

  // ✅ Datos para selects
  partners = signal<PartnerDTO[]>([]);
  decisions = signal<DecisionDTO[]>([]);

  // Filtros
  fTextInput = signal('');
  fTextApplied = signal('');
  
  // Formulario con validaciones mejoradas
  form = this.fb.group({
    id: this.fb.control<number | null>(null),
    partnerDni: this.fb.control<string>('', [
      Validators.required, 
      Validators.minLength(6),
      Validators.pattern(/^[0-9]+$/)
    ]),
    decisionId: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1)
    ]),
    joinDate: this.fb.control<string>(this.todayISO(), [Validators.required]),
    role: this.fb.control<string>(''),
    notes: this.fb.control<string>(''),
  });

  ngOnInit(): void {
    this.loadAll();
  }

  // Lista filtrada por texto local
  filtered = computed(() => {
    const q = this.fTextApplied().toLowerCase().trim();
    if (!q) return this.items();

    return this.items().filter(it => {
      const searchText = [
        it.id,
        it.partner?.dni,
        it.partner?.name,
        it.decision?.id,
        it.decision?.description,
        it.role,
      ].join(' ').toLowerCase();
      
      return searchText.includes(q);
    });
  });

  applyFilters() {
    this.fTextApplied.set(this.fTextInput());
  }

  clearFilters() {
    this.fTextInput.set('');
    this.fTextApplied.set('');
  }

  totalRecords = computed(() => this.items().length);
  uniquePartners = computed(() => 
    new Set(this.items().map(i => i.partner?.dni).filter(Boolean)).size
  );
  uniqueDecisions = computed(() => 
    new Set(this.items().map(i => i.decision?.id).filter(Boolean)).size
  );

  // UI Actions
  toggleNew(): void {
    const open = !this.isNewOpen();
    this.isNewOpen.set(open);
    if (!open) {
      this.new();
    } else {
      this.clearMessages();
    }
  }

  new(): void {
    this.isEdit.set(false);
    this.form.reset({
      id: null,
      partnerDni: '',
      decisionId: null,
      joinDate: this.todayISO(),
      role: '',
      notes: '',
    });
    // Re-habilitar campos
    this.form.get('partnerDni')?.enable();
    this.form.get('decisionId')?.enable();
    this.clearMessages();
  }

  edit(it: ShelbyCouncilDTO): void {
    this.isEdit.set(true);
    
    // Convertir ISO datetime a date para el input
    const joinDate = it.joinDate ? it.joinDate.substring(0, 10) : this.todayISO();
    
    this.form.patchValue({
      id: it.id,
      partnerDni: it.partner?.dni ?? '',
      decisionId: it.decision?.id ?? null,
      joinDate: joinDate,
      role: it.role ?? '',
      notes: it.notes ?? '',
    });

    // Deshabilitar campos que no se pueden editar
    this.form.get('partnerDni')?.disable();
    this.form.get('decisionId')?.disable();

    this.isNewOpen.set(true);
    this.clearMessages();
  }

  save(): void {
    if (this.form.invalid) { 
      this.form.markAllAsTouched();
      this.error.set(this.tr.instant('shelbyCouncil.formInvalid') || 'Por favor completa los campos requeridos');
      return; 
    }

    this.loading.set(true);
    this.clearMessages();

    const { id, ...rest } = this.form.getRawValue();

    if (!this.isEdit()) {
      // CREAR
      const payload: CreateShelbyCouncilDTO = {
        partnerDni: rest.partnerDni!,
        decisionId: rest.decisionId!,
        joinDate: rest.joinDate ? this.toISODateTime(rest.joinDate) : undefined,
        role: rest.role || undefined,
        notes: rest.notes || undefined,
      };

      this.srv.create(payload).subscribe({
        next: () => {
          // ✅ Mensaje de éxito
          const partnerName = this.partners().find(p => p.dni === payload.partnerDni)?.name || 'Socio';
          this.success.set(`Registro creado: ${partnerName} en consejo #${payload.decisionId}`);
          
          this.new();
          this.isNewOpen.set(false);
          this.loadAll();
          
          // ✅ Auto-ocultar después de 5 segundos
          setTimeout(() => this.success.set(null), 5000);
        },
        error: (e) => {
          this.handleError(e, 'shelbyCouncil.errorCreate', 'Error al crear el registro');
        }
      });
    } else {
      // ACTUALIZAR
      const payload: PatchShelbyCouncilDTO = {
        joinDate: rest.joinDate ? this.toISODateTime(rest.joinDate) : undefined,
        role: rest.role || undefined,
        notes: rest.notes || undefined,
      };

      this.srv.update(id!, payload).subscribe({
        next: () => {
          // ✅ Mensaje de éxito
          this.success.set(`Registro #${id} actualizado correctamente`);
          
          this.new();
          this.isNewOpen.set(false);
          this.loadAll();
          
          // ✅ Auto-ocultar después de 5 segundos
          setTimeout(() => this.success.set(null), 5000);
        },
        error: (e) => {
          this.handleError(e, 'shelbyCouncil.errorSave', 'Error al actualizar el registro');
        }
      });
    }
  }

  delete(it: ShelbyCouncilDTO): void {
    const msg = this.tr.instant('shelbyCouncil.confirmDelete', { 
      partner: it.partner?.name || it.partner?.dni,
      decision: it.decision?.description || `#${it.decision?.id}`
    }) || `¿Eliminar la relación entre ${it.partner?.name} y la decisión #${it.decision?.id}?`;
    
    if (!confirm(msg)) return;

    this.loading.set(true);
    this.clearMessages();

    this.srv.delete(it.id).subscribe({
      next: () => { 
        // ✅ Mensaje de éxito
        this.success.set(`Registro #${it.id} eliminado correctamente`);
        
        this.loadAll();
        
        // ✅ Auto-ocultar después de 5 segundos
        setTimeout(() => this.success.set(null), 5000);
      },
      error: (e) => {
        this.handleError(e, 'shelbyCouncil.errorDelete', 'No se pudo eliminar el registro');
      }
    });
  }

  trackById = (_: number, it: ShelbyCouncilDTO) => it.id;

  // Getters para validación del formulario
  get partnerDniInvalid(): boolean {
    const control = this.form.get('partnerDni');
    return !!(control?.invalid && control?.touched);
  }

  get decisionIdInvalid(): boolean {
    const control = this.form.get('decisionId');
    return !!(control?.invalid && control?.touched);
  }

  get joinDateInvalid(): boolean {
    const control = this.form.get('joinDate');
    return !!(control?.invalid && control?.touched);
  }

  /**
   * ✅ Carga paralela de TODOS los datos necesarios
   * - Consejos Shelby
   * - Partners
   * - Decisions
   */
  private loadAll(): void {
    this.loading.set(true);
    this.clearMessages();

    forkJoin({
      councils: this.srv.list(),
      partners: this.partnerSrv.list(),
      decisions: this.decisionSrv.getAll()
    }).subscribe({
      next: (res) => {
        // Consejos
        this.items.set(res.councils.data ?? []);
        
        // Partners
        this.partners.set(res.partners.data ?? []);
        
        // Decisions
        this.decisions.set(res.decisions ?? []);
        
        this.loading.set(false);
      },
      error: (e) => {
        this.handleError(e, 'shelbyCouncil.errorLoad', 'Error al cargar los registros');
      }
    });
  }

  private handleError(e: any, translationKey: string, defaultMsg: string): void {
    let errorMsg = defaultMsg;
    
    if (e?.error?.message) {
      errorMsg = e.error.message;
    } else if (e?.error?.errors && Array.isArray(e.error.errors)) {
      errorMsg = e.error.errors.map((err: any) => err.message).join(', ');
    } else {
      errorMsg = this.tr.instant(translationKey) || defaultMsg;
    }
    
    this.error.set(errorMsg);
    this.loading.set(false);
  }

  private clearMessages(): void {
    this.error.set(null);
    this.success.set(null);
  }

  // Helper: fecha ISO actual (YYYY-MM-DD)
  private todayISO(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  // Helper: convertir fecha YYYY-MM-DD a ISO datetime
  private toISODateTime(dateStr: string): string {
    // Si ya es ISO completo, retornar
    if (dateStr.includes('T')) return dateStr;
    
    // Agregar hora por defecto (10:00:00 UTC)
    return `${dateStr}T10:00:00.000Z`;
  }
}