// ============================================================================
// STORE COMPONENT - Marketplace de Productos por Distribuidor
// ============================================================================
// Versión simplificada que transforma productos en "ofertas" donde cada
// distribuidor puede ofrecer productos con su información de zona.
// ============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product/product';
import { ProductImageService } from '../../services/product-image/product-image';
import { AuthService } from '../../services/auth/auth';
import { SaleService } from '../../services/sale/sale';
import { CartService } from '../../services/cart/cart';
import { ApiResponse, ProductDTO, ProductOffer } from '../../models/product/product.model';
import { unwrapList } from '../../core/http/unwrap';
import { logger } from '../../core/logger';
import { TranslateModule } from '@ngx-translate/core';
import { PurchaseSuccessModalComponent, PurchaseSuccessData } from '../../components/purchase-success-modal/purchase-success-modal';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
  private cartSrv = inject(CartService);
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
  // STATE - Carrito (delegado en CartService: fuente única de verdad)
  // ============================================================================

  cart = {
    items: () => this.cartSrv.items(),
    count: () => this.cartSrv.count(),
    total: () => this.cartSrv.total(),
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
  // COMPUTED - Agrupación por Distribuidor (delegada en CartService)
  // ============================================================================

  /**
   * Lista de distribuidores seleccionados (con items en el carrito), con
   * subtotal por distribuidor. La agrupación vive en el CartService.
   */
  selectedDistributors = computed(() => this.cartSrv.distributorGroups());

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

    logger.debug('[StoreComponent] Refreshing products from backend...');

    this.productsSrv.getAllProducts().subscribe({
      next: (r: ApiResponse<ProductDTO[]> | ProductDTO[]) => {
        const data = unwrapList<ProductDTO>(r);
        logger.debug('[StoreComponent] Received products:', data.length);

        const overlay = this.imgSvc?.overlay?.bind(this.imgSvc) ?? ((arr: ProductDTO[]) => arr);
        this.products.set(overlay(data));
        this.loading.set(false);
      },
      error: (err) => {
        logger.error('[StoreComponent] Error loading products:', err);
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
   * Agrega una oferta al carrito (delegado en CartService)
   */
  onAddClick(event: Event, offer: ProductOffer): void {
    event.stopPropagation();

    if (!this.isOfferAvailable(offer.offerId)) {
      return;
    }

    this.cartSrv.add({
      offerId: offer.offerId,
      productId: offer.productId,
      distributorDni: offer.distributorDni,
      distributorName: offer.distributorName,
      description: offer.description,
      price: offer.price,
      imageUrl: offer.imageUrl,
      zone: offer.zone,
    });

    this.bump();
    this.flashId.set(offer.offerId);
    setTimeout(() => this.flashId.set(null), 600);
  }

  /** Incrementar cantidad */
  inc(offerId: string): void {
    this.cartSrv.inc(offerId);
  }

  /** Decrementar cantidad (elimina si llega a 0) */
  dec(offerId: string): void {
    this.cartSrv.dec(offerId);
  }

  /** Eliminar item del carrito */
  remove(offerId: string): void {
    this.cartSrv.remove(offerId);
  }

  /**
   * Animación de bump
   */
  private bump(): void {
    this.bumpSig.set(true);
    setTimeout(() => this.bumpSig.set(false), 300);
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

    logger.debug('🛒 Starting checkout for', distributors.length, 'distributor(s)');

    // ✅ Obtener el usuario autenticado
    const user = this.authService.user();
    const clientDni = (user as any)?.person?.dni;

    if (!clientDni) {
      this.processing.set(false);
      this.error.set('No se pudo obtener tu DNI. Por favor completa tu perfil.');
      return;
    }

    logger.debug('👤 Client DNI:', clientDni);

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

      logger.debug('📤 Creating sale for distributor:', dist.name, salePayload);

      return this.saleService.createSale(salePayload).pipe(
        map(response => ({
          success: true,
          distributor: dist,
          response: response,
          error: null
        })),
        catchError(error => {
          logger.error('❌ Error creating sale for', dist.name, ':', error);
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
        logger.debug('✅ All sales completed:', results);
        
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
          logger.warn('⚠️ Some sales failed:', failedSales);
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
        this.cartSrv.clear();
        this.showCart.set(false);
      },
      error: (err) => {
        logger.error('❌ Fatal error in checkout:', err);
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