import { Component, Input, Output, EventEmitter, OnChanges, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Role } from '../../../../models/user/user.model';
import { RoleRequestService } from '../../services/role-request';
import { ZoneService } from '../../../../services/zone/zone';
import { ProductService } from '../../../../services/product/product';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { logger } from '../../../../core/logger';
import { DialogDirective } from '../../../../shared/a11y/dialog.directive';

interface RoleOption {
  value: Role;
  label: string;
  description: string;
  icon: string;
}

interface ZoneDTO {
  id: number;
  name: string;
}

interface ProductDTO {
  id: number;
  description: string;
}

interface RoleSpecificData {
  distributorZoneId?: number;
  distributorProductsIds?: number[];
  distributorAddress?: string;
  authorityRank?: '0' | '1' | '2' | '3';
  authorityZoneId?: number;
}

@Component({
  selector: 'app-role-request-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DialogDirective],
  templateUrl: './role-request-modal.html',
  styleUrls: ['./role-requests.scss']
})
export class RoleRequestModalComponent implements OnChanges, OnInit {
  @Input() isOpen: boolean = false;
  @Input() currentRoles: Role[] = [];
  @Input() userEmail: string = '';
  @Input() userPhone: string = '';
  @Input() userAddress: string = '';
  
  @Output() close = new EventEmitter<void>();
  @Output() requestSubmitted = new EventEmitter<void>();
  
  private t = inject(TranslateService);
  private zoneService = inject(ZoneService);
  private productService = inject(ProductService);
  private roleRequestService = inject(RoleRequestService);

  requestedRole: Role | '' = '';
  roleToRemove: Role | '' = '';
  justification: string = '';
  isSubmitting: boolean = false;
  error: string | null = null;
  isRoleChange: boolean = false;
  currentStep: 1 | 2 = 1;
  roleSpecificData: RoleSpecificData = {};
  zones: ZoneDTO[] = [];
  products: ProductDTO[] = [];
  loadingCatalogs = false;
  autoDetectedIncompatibility: boolean = false;

  readonly REQUESTABLE_ROLES: RoleOption[] = [
    {
      value: Role.PARTNER,
      label: 'Socio',
      description: 'Participa activamente en el negocio como socio de la organización',
      icon: '🤝',
    },
    {
      value: Role.DISTRIBUTOR,
      label: 'Distributor',
      description: 'Gestiona la distribución de productos en tu zona',
      icon: '📦',
    },
    {
      value: Role.AUTHORITY,
      label: 'Autoridad',
      description: 'Figura de autoridad que facilita operaciones gubernamentales',
      icon: '⚖️',
    },
  ];

  readonly INCOMPATIBLE_ROLES: Record<string, Role[]> = {
    [Role.AUTHORITY]: [Role.PARTNER, Role.DISTRIBUTOR, Role.ADMIN],
    [Role.PARTNER]: [Role.AUTHORITY],
    [Role.DISTRIBUTOR]: [Role.AUTHORITY],
    [Role.ADMIN]: [Role.AUTHORITY],
  };
  
  readonly AUTHORITY_RANKS = [
    { value: '0', label: 'Rango 0 - Ejecutivo' },
    { value: '1', label: 'Rango 1 - Senior' },
    { value: '2', label: 'Rango 2 - Intermedio' },
    { value: '3', label: 'Rango 3 - Base' }
  ];

  ngOnInit(): void {
    this.loadCatalogs();
  }

  ngOnChanges(): void {
    if (!this.isOpen) {
      this.resetForm();
    }
  }
  
  private loadCatalogs(): void {
    this.loadingCatalogs = true;
    
    this.zoneService.getAllZones().subscribe({
      next: (res: any) => {
        this.zones = res?.data ?? res ?? [];
        logger.debug('✅ Zones loaded:', this.zones);
      },
      error: (err) => logger.error('❌ Error loading zones:', err)
    });
    
    this.productService.getAllProducts().subscribe({
      next: (res: any) => {
        this.products = res?.data ?? res ?? [];
        logger.debug('✅ Products loaded:', this.products);
        this.loadingCatalogs = false;
      },
      error: (err) => {
        logger.error('❌ Error loading products:', err);
        this.loadingCatalogs = false;
      }
    });
  }

  get removableRoles(): Role[] {
    return this.currentRoles.filter((role) =>
      [Role.PARTNER, Role.DISTRIBUTOR, Role.AUTHORITY].includes(role)
    );
  }

  get availableRoles(): RoleOption[] {
    return this.REQUESTABLE_ROLES.filter((role) => {
      // Mostrar solo los roles que el usuario NO tiene actualmente
      // La auto-detección de incompatibilidades se encargará de activar el modo cambio de rol
      return !this.currentRoles.includes(role.value);
    });
  }

  get selectedRoleDescription(): string | undefined {
    if (!this.requestedRole) return undefined;
    return this.REQUESTABLE_ROLES.find((r) => r.value === this.requestedRole)?.description;
  }

  get incompatibleRolesText(): string | null {
    if (!this.requestedRole) return null;
    const incompatible = this.INCOMPATIBLE_ROLES[this.requestedRole];
    return incompatible ? incompatible.join(', ') : null;
  }
  
  get requiresAdditionalData(): boolean {
    return this.requestedRole === Role.DISTRIBUTOR || 
           this.requestedRole === Role.AUTHORITY;
  }
  
  get additionalDataValid(): boolean {
    if (!this.requiresAdditionalData) return true;
    
    if (this.requestedRole === Role.DISTRIBUTOR) {
      const hasZone = !!this.roleSpecificData.distributorZoneId;
      const hasAddress = !!this.roleSpecificData.distributorAddress?.trim();
      logger.debug('🔍 DISTRIBUTOR validation:', { 
        hasZone, 
        hasAddress, 
        zoneId: this.roleSpecificData.distributorZoneId,
        address: this.roleSpecificData.distributorAddress,
        addressLength: this.roleSpecificData.distributorAddress?.trim().length
      });
      return hasZone && hasAddress;
    }
    
    if (this.requestedRole === Role.AUTHORITY) {
      const hasRank = !!this.roleSpecificData.authorityRank;
      const hasZone = !!this.roleSpecificData.authorityZoneId;
      logger.debug('🔍 AUTHORITY validation:', { 
        hasRank, 
        hasZone, 
        rank: this.roleSpecificData.authorityRank,
        zoneId: this.roleSpecificData.authorityZoneId
      });
      return hasRank && hasZone;
    }
    
    return false;
  }

  isRoleCompatible(role: Role): boolean {
    const incompatibleWith = this.INCOMPATIBLE_ROLES[role] || [];
    const rolesToCheck = this.isRoleChange && this.roleToRemove
      ? this.currentRoles.filter((r) => r !== this.roleToRemove)
      : this.currentRoles;

    return !rolesToCheck.some((currentRole) =>
      incompatibleWith.includes(currentRole)
    );
  }

  onRoleChangeToggle(checked: boolean): void {
    this.isRoleChange = checked;
    this.requestedRole = '';
    this.roleToRemove = '';
    this.autoDetectedIncompatibility = false;
    this.error = null;
  }

  onRequestedRoleChange(): void {
    if (!this.requestedRole) {
      this.roleToRemove = '';
      this.autoDetectedIncompatibility = false;
      this.error = null;
      return;
    }

    // ✅ AUTO-DETECCIÓN: Si el rol solicitado es incompatible con roles actuales
    const incompatibleRoles = this.getIncompatibleCurrentRoles(this.requestedRole as Role);

    if (incompatibleRoles.length > 0) {
      // Activar modo cambio de rol automáticamente
      this.isRoleChange = true;
      this.autoDetectedIncompatibility = true;

      // ✅ CASO ESPECIAL: AUTHORITY remueve TODOS los roles incompatibles automáticamente
      if (this.requestedRole === Role.AUTHORITY) {
        // Seleccionar el primer rol para el campo roleToRemove (requerido por el backend)
        // pero el mensaje indicará que se removerán TODOS
        this.roleToRemove = incompatibleRoles[0];
        this.error = null;
      } else {
        // Para otros roles, seleccionar automáticamente si solo hay uno
        if (incompatibleRoles.length === 1) {
          this.roleToRemove = incompatibleRoles[0];
          this.error = null;
        } else {
          // Si hay múltiples roles incompatibles, pedir selección
          this.roleToRemove = '';
          this.error = `El rol ${this.requestedRole} es incompatible con: ${incompatibleRoles.join(', ')}. Debes seleccionar uno para remover.`;
        }
      }
    } else {
      // No hay incompatibilidad, reset
      if (this.autoDetectedIncompatibility) {
        this.isRoleChange = false;
        this.roleToRemove = '';
        this.autoDetectedIncompatibility = false;
      }
      this.error = null;
    }
  }

  getIncompatibleCurrentRoles(requestedRole: Role): Role[] {
    const incompatibleWith = this.INCOMPATIBLE_ROLES[requestedRole] || [];
    return this.currentRoles.filter(role => incompatibleWith.includes(role));
  }

  shouldDisableRoleToRemove(): boolean {
    if (!this.autoDetectedIncompatibility || !this.requestedRole) return false;
    return this.getIncompatibleCurrentRoles(this.requestedRole as Role).length === 1;
  }

  getIncompatibleRolesNames(): string {
    if (!this.requestedRole) return '';
    const incompatibleRoles = this.getIncompatibleCurrentRoles(this.requestedRole as Role);
    return incompatibleRoles
      .map(role => this.getRoleInfo(role)?.label || role)
      .join(', ');
  }

  isAuthorityWithMultipleIncompatible(): boolean {
    if (!this.requestedRole || this.requestedRole !== Role.AUTHORITY) return false;
    return this.getIncompatibleCurrentRoles(this.requestedRole as Role).length > 1;
  }

  isNotAuthorityOrSingleIncompatible(): boolean {
    if (!this.requestedRole) return false;
    if (this.requestedRole !== Role.AUTHORITY) return true;
    return this.getIncompatibleCurrentRoles(this.requestedRole as Role).length === 1;
  }

  getRoleInfo(role: Role | ''): RoleOption | undefined {
    if (!role) return undefined;
    return this.REQUESTABLE_ROLES.find((r) => r.value === role);
  }
  
  goToStep2(): void {
    if (!this.requestedRole) {
      this.error = 'Por favor selecciona un rol';
      return;
    }
    
    if (this.isRoleChange && !this.roleToRemove) {
      this.error = 'Por favor selecciona el rol que deseas remover';
      return;
    }
    
    if (this.justification.trim().length > 0 && this.justification.length < 20) {
      this.error = 'Si proporcionas una justificación, debe tener al menos 20 caracteres';
      return;
    }
    
    if (!this.requiresAdditionalData) {
      this.onSubmit();
      return;
    }
    
    // ✅ Pre-rellenar dirección si existe
    if (this.requestedRole === Role.DISTRIBUTOR && this.userAddress && !this.roleSpecificData.distributorAddress) {
      this.roleSpecificData.distributorAddress = this.userAddress;
    }
    
    this.error = null;
    this.currentStep = 2;
  }
  
  backToStep1(): void {
    this.currentStep = 1;
    this.error = null;
  }
  
  toggleProduct(productId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.roleSpecificData.distributorProductsIds || [];
    
    if (checked) {
      this.roleSpecificData.distributorProductsIds = [...current, productId];
    } else {
      this.roleSpecificData.distributorProductsIds = current.filter(id => id !== productId);
    }
  }
  
  isProductSelected(productId: number): boolean {
    return (this.roleSpecificData.distributorProductsIds || []).includes(productId);
  }

  async onSubmit(): Promise<void> {
    this.error = null;

    if (!this.requestedRole) {
      this.error = 'Por favor selecciona un rol';
      return;
    }

    if (this.isRoleChange && !this.roleToRemove) {
      this.error = 'Por favor selecciona el rol que deseas remover';
      return;
    }
    
    // ✅ VALIDACIÓN MEJORADA: Verificar datos adicionales ANTES de enviar
    if (this.requiresAdditionalData) {
      if (!this.additionalDataValid) {
        this.error = 'Por favor completa todos los campos requeridos en el paso 2';
        
        // Si estamos en paso 1, ir al paso 2
        if (this.currentStep === 1) {
          this.currentStep = 2;
        }
        return;
      }
    }

    if (this.justification.trim().length > 0) {
      if (this.justification.length < 20) {
        this.error = 'Si proporcionas una justificación, debe tener al menos 20 caracteres';
        return;
      }
      if (this.justification.length > 500) {
        this.error = 'La justificación no puede exceder 500 caracteres';
        return;
      }
    }

    if (!this.isRoleChange && !this.isRoleCompatible(this.requestedRole as Role)) {
      const incompatible = this.INCOMPATIBLE_ROLES[this.requestedRole] || [];
      const conflictingRoles = this.currentRoles.filter((r) =>
        incompatible.includes(r)
      );
      this.error = `El rol ${this.requestedRole} es incompatible con tus roles actuales: ${conflictingRoles.join(', ')}`;
      return;
    }

    this.isSubmitting = true;

    try {
      const payload: any = {
        requestedRole: this.requestedRole,
      };

      if (this.isRoleChange && this.roleToRemove) {
        payload.roleToRemove = this.roleToRemove;
      }

      if (this.justification.trim().length > 0) {
        payload.justification = this.justification.trim();
      }
      
      // ✅ MEJORADO: Construcción más robusta de additionalData
      if (this.requestedRole === Role.DISTRIBUTOR) {
        const zoneId = Number(this.roleSpecificData.distributorZoneId);
        const address = this.roleSpecificData.distributorAddress?.trim();
        
        // Validación estricta
        if (!zoneId || zoneId <= 0) {
          this.error = 'Debes seleccionar una zona válida';
          this.isSubmitting = false;
          return;
        }
        
        if (!address || address.length === 0) {
          this.error = 'Debes ingresar una dirección';
          this.isSubmitting = false;
          return;
        }
        
        payload.additionalData = {
          zoneId: zoneId,
          address: address,
          productsIds: this.roleSpecificData.distributorProductsIds || []
        };
        
        logger.debug('📦 DISTRIBUTOR payload:', JSON.stringify(payload.additionalData, null, 2));
        
      } else if (this.requestedRole === Role.AUTHORITY) {
        const rank = this.roleSpecificData.authorityRank;
        const zoneId = Number(this.roleSpecificData.authorityZoneId);
        
        // Validación estricta
        if (!rank) {
          this.error = 'Debes seleccionar un rango';
          this.isSubmitting = false;
          return;
        }
        
        if (!zoneId || zoneId <= 0) {
          this.error = 'Debes seleccionar una zona válida';
          this.isSubmitting = false;
          return;
        }
        
        payload.additionalData = {
          rank: rank,
          zoneId: zoneId
        };
        
        logger.debug('⚖️ AUTHORITY payload:', JSON.stringify(payload.additionalData, null, 2));
      }

      logger.debug('🚀 SENDING ROLE REQUEST');
      logger.debug('Payload completo:', JSON.stringify(payload, null, 2));
      logger.debug('Requested Role:', payload.requestedRole);
      logger.debug('Additional Data:', payload.additionalData);
      logger.debug();
      
      await this.roleRequestService.createRequest(payload);
      
      logger.debug('✅ Role request created successfully');
      
      this.requestSubmitted.emit();
      this.resetForm();
      
    } catch (err: any) {
      logger.debug('❌ ERROR CREATING ROLE REQUEST');
      logger.error('Error object:', err);
      logger.error('Error response:', err.error);
      logger.error('Status:', err.status);
      logger.debug();
      
      if (err.error?.errors && Array.isArray(err.error.errors)) {
        this.error = err.error.errors.map((e: any) => e.message).join(', ');
      } else if (err.error?.message) {
        this.error = err.error.message;
      } else {
        this.error = 'Error al enviar la solicitud. Por favor intenta nuevamente.';
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  resetForm(): void {
    this.requestedRole = '';
    this.roleToRemove = '';
    this.justification = '';
    this.isRoleChange = false;
    this.autoDetectedIncompatibility = false;
    this.error = null;
    this.currentStep = 1;
    this.roleSpecificData = {};
  }
}