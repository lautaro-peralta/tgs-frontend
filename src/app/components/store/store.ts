// ============================================================================
// STORE COMPONENT - Marketplace de Productos por Distribuidor
// ============================================================================
// Versión simplificada que transforma productos en "ofertas" donde cada
// distribuidor puede ofrecer productos con su información de zona.
// El estado del carrito y el checkout viven en CartService: este componente
// solo se ocupa de render, búsqueda y de traducir el resultado del checkout
// al modal de éxito.
// ============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product/product';
import { ProductImageService } from '../../services/product-image/product-image';
import { AuthService } from '../../services/auth/auth';
import { CartService } from '../../services/cart/cart';
import { ProductDTO, ProductOffer } from '../../models/product/product.model';
import { TranslateModule } from '@ngx-translate/core';
import { PurchaseSuccessModalComponent, PurchaseSuccessData } from '../../components/purchase-success-modal/purchase-success-modal';

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
  readonly cart = inject(CartService);

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
  // STATE - UI
  // ============================================================================

  flashId = signal<string | null>(null);
  showCart = signal(false);
  bumpSig = signal(false);
  processing = signal(false);

  showSuccessModal = signal(false);
  purchaseData = signal<PurchaseSuccessData | null>(null);

  // ============================================================================
  // COMPUTED - Carrito / Distribuidores (delegado a CartService)
  // ============================================================================

  /**
   * Alias local para no tocar el template: internamente delega en
   * CartService.distributorGroups(), que es la única fuente de verdad.
   */
  selectedDistributors = computed(() => this.cart.distributorGroups());

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

    console.log('[StoreComponent] 🔄 Refreshing products from backend...');

    this.productsSrv.getAllProducts().subscribe({
      next: (data: ProductDTO[]) => {
        console.log('[StoreComponent] 📥 Received products:', data?.length || 0);

        // Log products with their distributors
        if (data && data.length > 0) {
          const productsWithDistributors = data.filter((p: ProductDTO) => p.distributors && p.distributors.length > 0);
          console.log('[StoreComponent] 📊 Products with distributors:', productsWithDistributors.length, '/', data.length);

          if (productsWithDistributors.length < data.length) {
            console.warn('[StoreComponent] ⚠️ Some products have NO distributors and will not appear in store');
          }
        }

        const overlay = this.imgSvc?.overlay?.bind(this.imgSvc) ?? ((arr: ProductDTO[]) => arr);
        this.products.set(overlay(data ?? []));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[StoreComponent] ❌ Error loading products:', err);
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
  // CART OPERATIONS - delegadas a CartService (única fuente de verdad)
  // ============================================================================

  /**
   * Agrega una oferta al carrito
   */
  onAddClick(event: Event, offer: ProductOffer): void {
    event.stopPropagation();

    if (!this.isOfferAvailable(offer.offerId)) {
      return;
    }

    this.cart.add(offer);
    this.bump();
    this.flashId.set(offer.offerId);
    setTimeout(() => this.flashId.set(null), 600);
  }

  inc(offerId: string): void {
    this.cart.inc(offerId);
  }

  dec(offerId: string): void {
    this.cart.dec(offerId);
  }

  remove(offerId: string): void {
    this.cart.remove(offerId);
  }

  /**
   * Animación de bump
   */
  private bump(): void {
    this.bumpSig.set(true);
    setTimeout(() => this.bumpSig.set(false), 300);
  }

  // ============================================================================
  // CHECKOUT - arma el payload y llama al backend vía CartService
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

    const user = this.authService.user();
    const clientDni = (user as any)?.person?.dni;

    if (!clientDni) {
      this.error.set('No se pudo obtener tu DNI. Por favor completa tu perfil.');
      return;
    }

    this.processing.set(true);
    this.error.set(null);

    this.cart.checkout(clientDni).subscribe({
      next: (results) => {
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

          this.purchaseData.set({
            saleId: result.saleId || 0,
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
            multipleSales: successfulSales.map((result) => ({
              saleId: result.saleId || 0,
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
            }))
          });
        }

        this.showSuccessModal.set(true);
        this.cart.clear();
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
