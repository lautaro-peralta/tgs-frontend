// ============================================================================
// STORE COMPONENT - Marketplace de Productos por Distribuidor
// ============================================================================
// Versión simplificada que transforma productos en "ofertas" donde cada
// distribuidor puede ofrecer productos con su información de zona.
// ============================================================================

import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product/product';
import { ProductImageService } from '../../services/product-image/product-image';
import { AuthService } from '../../services/auth/auth';
import { SaleService } from '../../services/sale/sale';
import { ApiResponse, ProductDTO, ProductOffer } from '../../models/product/product.model';
import { TranslateModule } from '@ngx-translate/core';
import { PurchaseSuccessModalComponent, PurchaseSuccessData } from '../../components/purchase-success-modal/purchase-success-modal';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type CartItem = {
  offerId: string;          // "productId-distributorDni"
  productId: number;        // ID del producto base
  distributorDni: string;   // DNI del distribuidor
  distributorName: string;  // Nombre del distribuidor
  description: string;
  price: number;
  imageUrl?: string | null;
  qty: number;
  zone?: {
    id: number;
    name: string;
    isHeadquarters?: boolean;
  } | null;
};

type DistributorGroup = {
  dni: string;
  name: string;
  zone?: {
    id: number;
    name: string;
    isHeadquarters?: boolean;
  } | null;
  items: CartItem[];
  subtotal: number;
};

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    FormsModule,
    TranslateModule,
    PurchaseSuccessModalComponent
  ],
  templateUrl: './store.html',
  styleUrls: ['./store.scss'],
})
export class StoreComponent implements OnInit {
  // ============================================================================
  // SERVICES
  // ============================================================================
  
  private productsSrv = inject(ProductService);
  private imgSvc = inject(ProductImageService, { optional: true as any });
  private authService = inject(AuthService);
  private saleService = inject(SaleService);
  private router = inject(Router);

  // ============================================================================
  // STATE - Productos y Ofertas
  // ============================================================================
  
  loading = signal(false);
  error = signal<string | null>(null);
  products = signal<ProductDTO[]>([]);

  // ✅ NUEVO: Transformar productos en ofertas (marketplace)
  offers = computed(() => {
    const allProducts = this.products();
    const offersList: ProductOffer[] = [];
    
    allProducts.forEach(product => {
      // Solo productos que tienen distribuidores asociados
      if (product.distributors && product.distributors.length > 0) {
        product.distributors.forEach(dist => {
          offersList.push({
            offerId: `${product.id}-${dist.dni}`,
            productId: product.id,
            description: product.description,
            detail: product.detail,
            imageUrl: product.imageUrl,
            price: product.price,
            stock: product.stock,
            isIllegal: product.isIllegal,
            distributorDni: dist.dni,
            distributorName: dist.name,
            zone: dist.zone
          });
        });
      }
    });
    
    console.log('🛒 Offers generated:', offersList.length);
    return offersList;
  });

  // ============================================================================
  // STATE - Búsqueda
  // ============================================================================
  
  searchInput = signal('');
  searchQuery = signal('');

  // ✅ Lista filtrada de ofertas
  list = computed(() => {
    const txt = this.searchQuery().toLowerCase().trim();
    const allOffers = this.offers();
    
    if (!txt) return allOffers;
    
    return allOffers.filter((offer) =>
      (offer.description ?? '').toLowerCase().includes(txt) ||
      (offer.distributorName ?? '').toLowerCase().includes(txt) ||
      (offer.zone?.name ?? '').toLowerCase().includes(txt) ||
      String(offer.productId).includes(txt)
    );
  });

  // ============================================================================
  // STATE - Carrito
  // ============================================================================
  
  private LS_KEY = 'cart.marketplace.v1';
  private itemsSig = signal<CartItem[]>(this.loadCart());
  
  cart = {
    items: () => this.itemsSig(),
    count: () => this.itemsSig().reduce((a, it) => a + it.qty, 0),
    total: () => this.itemsSig().reduce((a, it) => a + it.qty * (it.price ?? 0), 0),
  };

  // ============================================================================
  // STATE - UI
  // ============================================================================
  
  flashId = signal<string | null>(null);
  showCart = signal(false);
  bumpSig = signal(false);
  processing = signal(false);
  
  showSuccessModal = signal(false);
  purchaseData = signal<PurchaseSuccessData | null>(null);

  // ============================================================================
  // COMPUTED - Agrupación por Distribuidor
  // ============================================================================
  
  /**
   * Agrupa los items del carrito por distribuidor
   */
  cartByDistributor = computed(() => {
    const items = this.itemsSig();
    const grouped = new Map<string, CartItem[]>();
    
    items.forEach(item => {
      if (!grouped.has(item.distributorDni)) {
        grouped.set(item.distributorDni, []);
      }
      grouped.get(item.distributorDni)!.push(item);
    });
    
    return grouped;
  });

  /**
   * Lista de distribuidores seleccionados (con items en el carrito)
   */
  selectedDistributors = computed(() => {
    const grouped = this.cartByDistributor();
    const distributors: DistributorGroup[] = [];
    
    grouped.forEach((items, dni) => {
      if (items.length > 0) {
        const firstItem = items[0];
        distributors.push({
          dni: dni,
          name: firstItem.distributorName,
          zone: firstItem.zone,
          items: items,
          subtotal: items.reduce((sum, item) => sum + (item.price * item.qty), 0)
        });
      }
    });
    
    return distributors;
  });

  /**
   * Verifica si hay múltiples distribuidores
   */
  hasMultipleDistributors = computed(() => this.selectedDistributors().length > 1);

  /**
   * Primer distribuidor (para compatibilidad con código existente)
   */
  selectedDistributor = computed(() => {
    const distributors = this.selectedDistributors();
    if (distributors.length === 0) return null;
    return {
      dni: distributors[0].dni,
      name: distributors[0].name,
      zone: distributors[0].zone
    };
  });

  // ============================================================================
  // COMPUTED - Disponibilidad
  // ============================================================================
  
  /**
   * Verifica si una oferta está disponible (tiene stock)
   */
  isOfferAvailable = (offerId: string): boolean => {
    const offer = this.offers().find(o => o.offerId === offerId);
    return offer ? (offer.stock ?? 0) > 0 : false;
  };

  // ============================================================================
  // COMPUTED - Permisos de Compra
  // ============================================================================
  
  canPurchase = computed(() => this.authService.canPurchase());
  isVerified = computed(() => (this.authService.user() as any)?.isVerified ?? false);
  profileCompleteness = computed(() => this.authService.profileCompleteness());

  // ============================================================================
  // HELPERS - Visualización
  // ============================================================================
  
  bumpCart() { return this.bumpSig(); }

  toggleCartDrawer() { 
    this.showCart.set(!this.showCart()); 
  }

  productsByDistributor = computed(() => {
    return this.cartByDistributor();
  });

  getDistributorSubtotal(dni: string): number {
    const dist = this.selectedDistributors().find(d => d.dni === dni);
    return dist ? dist.subtotal : 0;
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  
  ngOnInit() { 
    this.authService.refreshIfStale(0);
    this.refresh();
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  refresh() {
    this.loading.set(true);
    this.error.set(null);
    
    this.productsSrv.getAllProducts().subscribe({
      next: (r: ApiResponse<ProductDTO[]> | ProductDTO[]) => {
        const data = Array.isArray(r) ? r : (r as any).data;
        const overlay = this.imgSvc?.overlay?.bind(this.imgSvc) ?? ((arr: ProductDTO[]) => arr);
        this.products.set(overlay(data ?? []));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Error al cargar productos');
        this.loading.set(false);
      },
    });
  }

  // ============================================================================
  // SEARCH
  // ============================================================================
  
  onSearch(): void {
    this.searchQuery.set(this.searchInput());
  }

  onClearSearch(): void {
    this.searchInput.set('');
    this.searchQuery.set('');
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSearch();
    }
  }

  // ============================================================================
  // CART OPERATIONS
  // ============================================================================
  
  /**
   * Agrega una oferta al carrito
   */
  onAddClick(event: Event, offer: ProductOffer): void {
    event.stopPropagation();
    
    if (!this.isOfferAvailable(offer.offerId)) {
      return;
    }

    const items = this.itemsSig();
    const existing = items.find(it => it.offerId === offer.offerId);

    if (existing) {
      existing.qty++;
      this.itemsSig.set([...items]);
    } else {
      const newItem: CartItem = {
        offerId: offer.offerId,
        productId: offer.productId,
        distributorDni: offer.distributorDni,
        distributorName: offer.distributorName,
        description: offer.description,
        price: offer.price,
        imageUrl: offer.imageUrl,
        qty: 1,
        zone: offer.zone
      };
      this.itemsSig.set([...items, newItem]);
    }

    this.saveCart();
    this.bump();
    this.flashId.set(offer.offerId);
    setTimeout(() => this.flashId.set(null), 600);
  }

  /**
   * Incrementar cantidad
   */
  inc(offerId: string): void {
    const items = this.itemsSig();
    const it = items.find(x => x.offerId === offerId);
    if (it) {
      it.qty++;
      this.itemsSig.set([...items]);
      this.saveCart();
    }
  }

  /**
   * Decrementar cantidad
   */
  dec(offerId: string): void {
    const items = this.itemsSig();
    const it = items.find(x => x.offerId === offerId);
    if (it) {
      it.qty--;
      if (it.qty <= 0) {
        this.remove(offerId);
      } else {
        this.itemsSig.set([...items]);
        this.saveCart();
      }
    }
  }

  /**
   * Eliminar item del carrito
   */
  remove(offerId: string): void {
    const items = this.itemsSig().filter(it => it.offerId !== offerId);
    this.itemsSig.set(items);
    this.saveCart();
  }

  /**
   * Animación de bump
   */
  private bump(): void {
    this.bumpSig.set(true);
    setTimeout(() => this.bumpSig.set(false), 300);
  }

  /**
   * Guardar carrito en localStorage
   */
  private saveCart(): void {
    try {
      localStorage.setItem(this.LS_KEY, JSON.stringify(this.itemsSig()));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }

  /**
   * Cargar carrito desde localStorage
   */
  private loadCart(): CartItem[] {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error loading cart:', e);
      return [];
    }
  }

  /**
   * Limpiar carrito
   */
  private clearCart(): void {
    this.itemsSig.set([]);
    this.saveCart();
  }

  // ============================================================================
  // CHECKOUT - ✅ IMPLEMENTACIÓN REAL CON BACKEND
  // ============================================================================
  
  goToCheckout(): void {
    if (!this.canPurchase() || this.cart.count() === 0 || this.processing()) {
      return;
    }

    const distributors = this.selectedDistributors();
    
    if (distributors.length === 0) {
      this.error.set('No hay distribuidores disponibles para los productos en tu carrito');
      return;
    }

    this.processing.set(true);
    this.error.set(null);

    console.log('🛒 Starting checkout for', distributors.length, 'distributor(s)');

    // ✅ Obtener el usuario autenticado
    const user = this.authService.user();
    const clientDni = (user as any)?.person?.dni;

    if (!clientDni) {
      this.processing.set(false);
      this.error.set('No se pudo obtener tu DNI. Por favor completa tu perfil.');
      return;
    }

    console.log('👤 Client DNI:', clientDni);

    // ✅ Crear una compra por cada distribuidor
    const saleRequests = distributors.map(dist => {
      const salePayload = {
        clientDni: clientDni,  // ✅ Agregar DNI del cliente
        distributorDni: dist.dni,
        details: dist.items.map(item => ({
          productId: item.productId,
          quantity: item.qty
        }))
      };

      console.log('📤 Creating sale for distributor:', dist.name, salePayload);

      return this.saleService.createSale(salePayload).pipe(
        map(response => ({
          success: true,
          distributor: dist,
          response: response,
          error: null
        })),
        catchError(error => {
          console.error('❌ Error creating sale for', dist.name, ':', error);
          return of({
            success: false,
            distributor: dist,
            response: null,
            error: error?.error?.message || error?.message || 'Error desconocido'
          });
        })
      );
    });

    // ✅ Ejecutar todas las compras en paralelo
    forkJoin(saleRequests).subscribe({
      next: (results) => {
        console.log('✅ All sales completed:', results);
        
        const successfulSales = results.filter(r => r.success);
        const failedSales = results.filter(r => !r.success);

        this.processing.set(false);

        if (successfulSales.length === 0) {
          // Todas fallaron
          this.error.set(
            `Error al procesar las compras: ${failedSales.map(f => f.error).join(', ')}`
          );
          return;
        }

        // Al menos una fue exitosa
        if (failedSales.length > 0) {
          // Algunas fallaron
          console.warn('⚠️ Some sales failed:', failedSales);
          this.error.set(
            `${successfulSales.length} de ${results.length} compras se completaron. ` +
            `Fallaron: ${failedSales.map(f => f.distributor.name).join(', ')}`
          );
        }

        // Refrescar usuario (para actualizar rol CLIENT si es necesario)
        this.authService.me().subscribe();

        // Preparar datos para el modal de éxito
        if (successfulSales.length === 1) {
          // Una sola compra exitosa
          const result = successfulSales[0];
          const saleData = (result.response as any)?.data || result.response;
          
          this.purchaseData.set({
            saleId: saleData?.id || 0,
            total: result.distributor.subtotal,
            distributor: {
              dni: result.distributor.dni,
              name: result.distributor.name,
              phone: null,
              email: '',
              address: null,
              zone: result.distributor.zone || null
            }
          });
        } else {
          // ✅ Múltiples compras exitosas - usar formato multipleSales
          this.purchaseData.set({
            saleId: 0, // No hay un solo ID cuando son múltiples
            total: successfulSales.reduce((sum, r) => sum + r.distributor.subtotal, 0),
            distributor: null, // No hay un solo distribuidor
            multipleSales: successfulSales.map((result, index) => {
              const saleData = (result.response as any)?.data || result.response;
              return {
                saleId: saleData?.id || 0,
                distributor: {
                  dni: result.distributor.dni,
                  name: result.distributor.name,
                  phone: null,
                  email: '',
                  address: null,
                  zone: result.distributor.zone || null
                },
                products: result.distributor.items.map(item => ({
                  id: item.productId,
                  description: item.description,
                  price: item.price,
                  qty: item.qty
                })),
                subtotal: result.distributor.subtotal
              };
            })
          });
        }

        this.showSuccessModal.set(true);
        this.clearCart();
        this.showCart.set(false);
      },
      error: (err) => {
        console.error('❌ Fatal error in checkout:', err);
        this.processing.set(false);
        this.error.set('Error fatal al procesar las compras. Por favor, intente nuevamente.');
      }
    });
  }

  onCloseSuccessModal(): void {
    this.showSuccessModal.set(false);
    this.purchaseData.set(null);
  }
}