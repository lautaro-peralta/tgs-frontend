import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProductService } from '../../services/product/product';
import { ApiResponse, ProductDTO, CreateProductDTO, UpdateProductDTO } from '../../models/product/product.model';
import { ProductImageService } from '../../services/product-image/product-image';
import { AuthService } from '../../services/auth/auth';
import { Role } from '../../models/user/user.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './product.html',
  styleUrls: ['./product.scss']
})
export class ProductComponent implements OnInit {
  // --- Inyección ---
  private fb  = inject(FormBuilder);
  private srv = inject(ProductService);
  private imgSvc = inject(ProductImageService);
  private authService = inject(AuthService); // ✅ NUEVO

  // --- Estado base ---
  loading = signal(false);
  error   = signal<string | null>(null);
  success = signal<string | null>(null);
  editId  = signal<number | null>(null);

  // --- Datos ---
  products = signal<ProductDTO[]>([]);

  // ✅ Usuario actual y sus roles
  currentUser = this.authService.user;
  isAdmin = computed(() => this.authService.hasRole(Role.ADMIN));
  isDistributor = computed(() => this.authService.hasRole(Role.DISTRIBUTOR));
  isPartner = computed(() => this.authService.hasRole(Role.PARTNER));

  // Permisos específicos por rol
  canCreate = computed(() => this.isAdmin() || this.isDistributor());      // Admin y Distribuidor pueden crear
  canEdit = computed(() => this.isDistributor());                          // Solo Distribuidor puede editar
  canDelete = computed(() => this.isAdmin() || this.isDistributor());      // Admin y Distribuidor pueden eliminar

  // Para retrocompatibilidad - muestra columna de acciones si tiene algún permiso
  canModifyProducts = computed(() => this.canCreate() || this.canEdit() || this.canDelete());

  currentUserDni = computed(() => {
    const user = this.currentUser();
    const dni = (user as any)?.person?.dni;
    console.log('[ProductComponent] 🔍 Current user DNI:', {
      hasUser: !!user,
      hasPerson: !!(user as any)?.person,
      dni: dni,
      username: user?.username,
      roles: user?.roles
    });
    return dni;
  });

  // ✅ Productos filtrados según rol
  filteredByRole = computed(() => {
    const allProducts = this.products();

    console.log('[ProductComponent] 🔍 Filtering products:', {
      total: allProducts.length,
      isAdmin: this.isAdmin(),
      isPartner: this.isPartner(),
      isDistributor: this.isDistributor(),
      userDni: this.currentUserDni()
    });

    // Si es admin o partner, ver todos los productos
    if (this.isAdmin() || this.isPartner()) {
      console.log('[ProductComponent] 👑 Admin/Partner - showing all products');
      return allProducts;
    }

    // Si es distributor, solo ver sus productos
    if (this.isDistributor()) {
      const userDni = this.currentUserDni();

      if (!userDni) {
        console.warn('[ProductComponent] ⚠️ Distributor has no DNI - cannot filter products');
        console.warn('[ProductComponent] ⚠️ User might need to complete their profile');
        return [];
      }

      const filtered = allProducts.filter(p => {
        if (!p.distributors || p.distributors.length === 0) {
          console.log('[ProductComponent] ❌ Product has no distributors:', p.id);
          return false;
        }
        const match = p.distributors.some(d => {
          const matches = d.dni === userDni;
          console.log('[ProductComponent] 🔍 Checking distributor:', {
            productId: p.id,
            distributorDni: d.dni,
            userDni: userDni,
            matches: matches
          });
          return matches;
        });
        return match;
      });

      console.log('[ProductComponent] ✅ Filtered products for distributor:', {
        userDni: userDni,
        totalProducts: allProducts.length,
        filteredProducts: filtered.length
      });

      return filtered;
    }

    // Otros roles: sin productos
    console.log('[ProductComponent] ⚠️ User has no role to view products');
    return [];
  });

  // Estadísticas
  totalProducts = computed(() => this.filteredByRole().length);
  productsWithStock = computed(() => this.filteredByRole().filter(p => (p.stock ?? 0) > 0).length);
  productsWithoutStock = computed(() => this.filteredByRole().filter(p => (p.stock ?? 0) === 0).length);

  // --- Filtros de UI ---
  fTextInput = signal('');
  fTextApplied = signal('');
  fStockInput = signal<'all' | 'with' | 'without'>('all');
  fStockApplied = signal<'all' | 'with' | 'without'>('all');

  // Vista filtrada reactiva (aplica filtros sobre filteredByRole)
  filteredList = computed(() => {
    const txt = this.fTextApplied().toLowerCase().trim();
    const fstock = this.fStockApplied();

    return this.filteredByRole().filter(p => {
      const matchText =
        !txt ||
        (p.description ?? '').toLowerCase().includes(txt) ||
        (p.detail ?? '').toLowerCase().includes(txt) ||
        String(p.id).includes(txt);

      const matchStock =
        fstock === 'all' ||
        (fstock === 'with' && (p.stock ?? 0) > 0) ||
        (fstock === 'without' && (p.stock ?? 0) === 0);

      return matchText && matchStock;
    });
  });

  applyFilters() {
    this.fTextApplied.set(this.fTextInput());
    this.fStockApplied.set(this.fStockInput());
  }

  clearFilters() {
    this.fTextInput.set('');
    this.fStockInput.set('all');
    this.fTextApplied.set('');
    this.fStockApplied.set('all');
  }

  // --- Previsualización de imagen (solo front) ---
  selectedFile: File | null = null;
  imagePreview = signal<string | null>(null);

  form = this.fb.group({
    description: this.fb.control<string>('', { 
      nonNullable: true, 
      validators: [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(50)
      ] 
    }),
    detail: this.fb.control<string>('', { 
      nonNullable: true, 
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(200)
      ] 
    }),
    price: this.fb.control<number>(0, { 
      nonNullable: true, 
      validators: [Validators.required, Validators.min(0.01)] 
    }),
    stock: this.fb.control<number>(0, { 
      nonNullable: true, 
      validators: [Validators.required, Validators.min(0)] 
    }),
    isIllegal: this.fb.control<boolean>(false, { nonNullable: true }),
    imageUrl: this.fb.control<string>('', { nonNullable: true }),
  });

  // --- Ciclo de vida ---
  ngOnInit() { this.load(); }

  // --- UI: abrir/cerrar sección "nuevo" ---
  isNewOpen = false;
  toggleNew(){ this.isNewOpen = !this.isNewOpen; }

  // Fuerza número en inputs de price/stock
  coerceNumber(key: 'price' | 'stock', ev: Event) {
    const input = ev.target as HTMLInputElement;
    const val = input.value === '' ? 0 : Number(input.value);
    this.form.controls[key].setValue(val);
    this.form.controls[key].markAsDirty();
    this.form.controls[key].updateValueAndValidity();
  }

  // Previsualiza cuando se pega una URL
  onImageUrlInput(ev: Event) {
    const val = (ev.target as HTMLInputElement).value?.trim();
    this.imagePreview.set(val || null);
  }

  // Previsualiza cuando se selecciona un archivo local
  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    this.selectedFile = f;

    if (f) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        this.imagePreview.set(dataUrl);
        this.form.controls.imageUrl.setValue(dataUrl);
      };
      reader.readAsDataURL(f);
    } else {
      this.imagePreview.set(null);
    }
  }

  // --- Data fetching ---
  private load() {
    this.loading.set(true);
    this.error.set(null);

    this.srv.getAllProducts().subscribe({
      next: (r: ApiResponse<ProductDTO[]> | ProductDTO[]) => {
        const data = Array.isArray(r) ? r : (r as any).data;
        console.log('[ProductComponent] 📥 Products loaded from backend:', data);

        // Log detallado de cada producto
        if (data && data.length > 0) {
          data.forEach((p: ProductDTO) => {
            console.log(`[ProductComponent] Product ${p.id}:`, {
              description: p.description,
              distributors: p.distributors,
              distributorsCount: p.distributors?.length || 0
            });
          });
        }

        this.products.set(this.imgSvc.overlay(data ?? []));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al cargar productos');
        this.loading.set(false);
      }
    });
  }

  // Carga un producto en el form para editar
  private loadInForm(p: ProductDTO) {
    this.form.setValue({
      description: p.description ?? '',
      detail: p.detail ?? '',
      price: p.price ?? 0,
      stock: p.stock ?? 0,
      isIllegal: p.isIllegal ?? false,
      imageUrl: p.imageUrl ?? '',
    });
    this.selectedFile = null;
    this.imagePreview.set(p.imageUrl ?? null);
  }

  // --- Crear / Editar ---
  new() {
    this.editId.set(null);
    this.form.reset({
      description: '',
      detail: '',
      price: 0,
      stock: 0,
      isIllegal: false,
      imageUrl: '',
    });
    this.selectedFile = null;
    this.imagePreview.set(null);
    this.isNewOpen = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Resetea el formulario y cierra el modal
  resetAndClose() {
    this.editId.set(null);
    this.form.reset({
      description: '',
      detail: '',
      price: 0,
      stock: 0,
      isIllegal: false,
      imageUrl: '',
    });
    this.selectedFile = null;
    this.imagePreview.set(null);
    this.isNewOpen = false;
  }

  edit(p: ProductDTO) {
    this.editId.set(p.id);
    this.loadInForm(p);
    this.isNewOpen = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Guardar ---
  save() {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const raw = this.form.getRawValue();
    const img = raw.imageUrl?.trim() || null;

    if (this.editId() == null) {
      // CREATE
      const dtoCreate: CreateProductDTO = {
        description: raw.description,
        detail: raw.detail,
        price: raw.price,
        stock: raw.stock,
        isIllegal: raw.isIllegal
      };

      // ✅ Si es distribuidor, agregar su DNI automáticamente
      if (this.isDistributor()) {
        const userDni = this.currentUserDni();
        if (userDni) {
          dtoCreate.distributorsIds = [userDni];
          console.log('[ProductComponent] 📦 Creating product with distributorsIds:', dtoCreate.distributorsIds);
        } else {
          console.warn('[ProductComponent] ⚠️ Cannot create product: distributor has no DNI');
          this.error.set('No puedes crear productos sin completar tu perfil personal (DNI requerido)');
          this.loading.set(false);
          return;
        }
      }

      console.log('[ProductComponent] 📤 Sending to backend:', dtoCreate);

      this.srv.createProduct(dtoCreate).subscribe({
        next: (res: any) => {
          console.log('[ProductComponent] 📥 Response from backend:', res);

          const created = ('data' in res ? res.data : res) as ProductDTO | null;

          console.log('[ProductComponent] 🔍 Created product:', {
            id: created?.id,
            description: created?.description,
            distributors: created?.distributors,
            distributorsCount: created?.distributors?.length || 0
          });

          if (created?.id) this.imgSvc.set(created.id, img);
          this.loading.set(false);

          this.success.set(`Producto "${raw.description}" creado correctamente`);
          this.resetAndClose();
          this.load();

          setTimeout(() => this.success.set(null), 5000);
        },
        error: err => {
          this.loading.set(false);
          this.error.set(this.parseErrorMessage(err, 'crear'));
          console.error('[ProductComponent] ❌ Error creating product:', err);
        }
      });
    } else {
      // UPDATE
      const id = this.editId()!;
      const dtoUpdate: UpdateProductDTO = {
        description: raw.description,
        detail: raw.detail,
        price: raw.price,
        stock: raw.stock,
        isIllegal: raw.isIllegal
      };

      this.srv.updateProduct(id, dtoUpdate).subscribe({
        next: _ => {
          this.imgSvc.set(id, img);
          this.loading.set(false);
          
          this.success.set(`Producto "${raw.description}" actualizado correctamente`);
          this.resetAndClose();
          this.load();
          
          setTimeout(() => this.success.set(null), 5000);
        },
        error: err => {
          this.loading.set(false);
          this.error.set(this.parseErrorMessage(err, 'actualizar'));
          console.error('Error updating product:', err);
        }
      });
    }
  }

  // Parser de errores
  private parseErrorMessage(err: any, action: 'crear' | 'actualizar'): string {
    let errorMessage = `Error al ${action} producto`;

    if (!err.error) {
      return errorMessage;
    }

    if (typeof err.error === 'string') {
      return err.error;
    }

    if (err.error.message) {
      errorMessage = err.error.message;
      
      if (errorMessage.includes('already exists')) {
        return `Ya existe un producto con esa descripción. Por favor, usá un nombre diferente.`;
      }
      
      return errorMessage;
    }

    if (err.error.errors && Array.isArray(err.error.errors)) {
      const errors = err.error.errors
        .map((e: any) => {
          const field = this.translateFieldName(e.field);
          return `${field}: ${e.message}`;
        })
        .join(', ');
      
      return `Errores de validación: ${errors}`;
    }

    switch (err.status) {
      case 400:
        return `Datos inválidos. Revisá que todos los campos estén completos correctamente.`;
      case 409:
        return `Ya existe un producto con esa descripción.`;
      case 401:
        return `No tenés permisos para ${action} productos.`;
      case 403:
        return `Acceso denegado.`;
      case 404:
        return `Producto no encontrado.`;
      case 500:
        return `Error del servidor. Intentá de nuevo más tarde.`;
      default:
        return errorMessage;
    }
  }

  private translateFieldName(field: string | undefined): string {
    if (!field) return 'Campo';
    
    const translations: Record<string, string> = {
      'description': 'Descripción',
      'detail': 'Detalle',
      'price': 'Precio',
      'stock': 'Stock',
      'isIllegal': 'Es ilegal'
    };
    
    return translations[field] || field;
  }

  // --- Borrado ---
  delete(id: number) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    
    this.srv.deleteProduct(id).subscribe({
      next: () => {
        this.imgSvc.remove(id);
        this.loading.set(false);
        
        this.success.set('Producto eliminado correctamente');
        this.load();
        
        setTimeout(() => this.success.set(null), 5000);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al eliminar producto');
        this.loading.set(false);
        console.error('Error deleting product:', err);
      }
    });
  }

  // ✅ NUEVO: Helper para obtener nombres de distribuidores
  getDistributorNames(product: ProductDTO): string {
    if (!product.distributors || product.distributors.length === 0) {
      return '—';
    }
    return product.distributors.map(d => d.name).join(', ');
  }
}