// src/app/components/my-purchases/my-purchases.ts
import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { SaleService } from '../../services/sale/sale';
import { AuthService } from '../../services/auth/auth';
import { ProductService } from '../../services/product/product';
import { SaleDTO, SaleDetailDTO } from '../../models/sale/sale.model';
import { ProductDTO } from '../../models/product/product.model';
import { logger } from '../../core/logger';

@Component({
  selector: 'app-my-purchases',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule],
  templateUrl: './my-purchases.html',
  styleUrls: ['./my-purchases.scss'],
})
export class MyPurchasesComponent implements OnInit, OnDestroy {
  private readonly saleService = inject(SaleService);
  private readonly productService = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  // Estado local
  loading = signal(false);
  error = signal<string | null>(null);
  purchases = signal<SaleDTO[]>([]);
  products = signal<ProductDTO[]>([]);

  // Filtros
  searchTerm = signal('');

  // Señales computadas
  me = computed(() => this.auth.user());

  filteredPurchases = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const allPurchases = this.purchases();

    if (!search) return allPurchases;

    return allPurchases.filter(purchase => {
      const total = this.getTotal(purchase).toString();
      const date = this.formatDate(purchase.date || purchase.saleDate || '');
      const distributor = purchase.distributor?.name?.toLowerCase() || '';

      // Buscar en los nombres de productos
      const hasMatchingProduct = purchase.details?.some(detail => {
        const productName = this.getProductName(detail).toLowerCase();
        return productName.includes(search);
      }) || false;

      return (
        total.includes(search) ||
        date.toLowerCase().includes(search) ||
        distributor.includes(search) ||
        hasMatchingProduct
      );
    });
  });

  ngOnInit(): void {
    this.loadPurchases();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga las compras del usuario actual y la lista de productos
   */
  private loadPurchases(): void {
    logger.debug('[MyPurchases] 🔄 Iniciando carga de compras...');
    this.loading.set(true);
    this.error.set(null);

    const currentUser = this.me();
    logger.debug('[MyPurchases] 👤 Usuario actual:', {
      username: currentUser?.username,
      email: currentUser?.email,
      hasPersonInfo: !!currentUser?.person
    });

    // Cargar ventas y productos en paralelo
    // El backend automáticamente filtra por el DNI del usuario autenticado
    forkJoin({
      sales: this.saleService.getMyPurchases(),
      products: this.productService.getAllProducts()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ sales, products }) => {
          logger.debug('[MyPurchases] ✅ Datos recibidos exitosamente');
          logger.debug('[MyPurchases] 📦 Compras del usuario:', sales.length);
          logger.debug('[MyPurchases] 🛍️ Productos cargados:', products.length);
          logger.debug('[MyPurchases] 📋 Detalle de compras:', sales);

          // Guardar productos y compras
          this.products.set(products);
          this.purchases.set(sales);
          this.loading.set(false);

          // Validar si hay compras sin detalles
          const purchasesWithoutDetails = sales.filter(s => !s.details || s.details.length === 0);
          if (purchasesWithoutDetails.length > 0) {
            logger.warn('[MyPurchases] Encontradas compras sin detalles:', purchasesWithoutDetails.length);
            logger.warn('[MyPurchases] 📋 Compras sin detalles:', purchasesWithoutDetails);
          }
        },
        error: (err: HttpErrorResponse) => {
          logger.error('[MyPurchases] ❌ Error al cargar datos');
          this.loading.set(false);
          this.handleError(err, 'Error al cargar las compras');
        }
      });
  }

  /**
   * Refresca las compras
   */
  refresh(): void {
    this.loadPurchases();
  }

  /**
   * Limpia el filtro de búsqueda
   */
  clearSearch(): void {
    this.searchTerm.set('');
  }

  /**
   * Formatea una fecha ISO a formato legible
   */
  formatDate(isoDate: string): string {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Maneja errores HTTP
   */
  private handleError(error: HttpErrorResponse, fallbackMessage: string): void {
    logger.error('[MyPurchases] ❌ Error HTTP detectado:', {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      error: error.error,
      url: error.url
    });

    if (error.status === 401) {
      this.error.set('No autorizado. Por favor, inicia sesión nuevamente.');
    } else if (error.status === 403) {
      // Error de permisos - probablemente el usuario no tiene acceso al endpoint
      logger.debug('[MyPurchases] Error 403 - Sin permisos para acceder al endpoint');
      logger.debug('[MyPurchases] 📋 Detalle del error:', error.error);

      this.purchases.set([]);
      this.products.set([]);

      const errorMsg = error.error?.message || error.message || 'No tienes permisos para ver las compras';
      this.error.set(`${errorMsg}. Si eres cliente, contacta al administrador.`);
    } else if (error.status === 404) {
      // No se encontraron compras o el endpoint no existe
      logger.debug('[MyPurchases] ℹ️ Error 404 - No se encontraron compras');
      this.purchases.set([]);
      this.products.set([]);
      // No mostrar error para 404 - simplemente mostrar lista vacía
    } else if (error.status === 400) {
      // Datos inválidos - probablemente perfil incompleto
      logger.debug('[MyPurchases] Error 400 - Datos inválidos');
      this.purchases.set([]);
      this.products.set([]);

      const errorMsg = error.error?.message || error.message || 'Datos inválidos';

      // Mensaje más claro para perfil incompleto
      if (errorMsg.includes('profile') || errorMsg.includes('DNI') || errorMsg.includes('personal information')) {
        this.error.set(`Para ver tus compras, necesitas completar tu perfil con tu DNI. Ve a "Mi Cuenta" → "Editar perfil" y completa tu información personal.`);
      } else {
        this.error.set(`${errorMsg}. Verifica que tu perfil esté completo.`);
      }
    } else if (error.status >= 500) {
      // Errores de servidor
      this.error.set('Error del servidor. Por favor, intenta más tarde.');
    } else {
      // Otros errores
      logger.warn('[MyPurchases] Error no manejado:', error.status, error.error?.message || error.message);
      this.purchases.set([]);
      this.products.set([]);
      this.error.set(`Error ${error.status}: ${error.error?.message || error.message || fallbackMessage}`);
    }
  }

  /**
   * Limpia los mensajes de error
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Obtiene el nombre del producto desde el detalle de venta
   */
  getProductName(detail: SaleDetailDTO): string {
    // 1. Intentar obtener el nombre desde el objeto product embebido
    if (detail.product?.description) {
      return detail.product.description;
    }

    // 2. Buscar el producto en la lista de productos cargados usando el productId
    const productId = detail.productId ?? (detail as any)?.product?.id ?? null;
    if (productId != null) {
      const product = this.products().find(p => p.id === Number(productId));
      if (product?.description) {
        return product.description;
      }
      // Si no se encuentra el producto, mostrar el ID
      return `Producto #${productId}`;
    }

    return 'Producto sin nombre';
  }

  /**
   * Calcula el total de una compra
   */
  getTotal(purchase: SaleDTO): number {
    // Primero intentar obtener el total directo
    if (purchase.total || purchase.amount || purchase.saleAmount) {
      const total = purchase.total || purchase.amount || purchase.saleAmount || 0;
      logger.debug(`[MyPurchases] Total directo para compra #${purchase.id}:`, total);
      return total;
    }

    // Si no hay total, calcularlo desde los detalles
    if (purchase.details && purchase.details.length > 0) {
      const calculated = purchase.details.reduce((sum, detail) => {
        if (detail.subtotal) {
          return sum + detail.subtotal;
        }
        if (detail.product?.price && detail.quantity) {
          return sum + (detail.product.price * detail.quantity);
        }
        return sum;
      }, 0);
      logger.debug(`[MyPurchases] Total calculado para compra #${purchase.id}:`, calculated, 'detalles:', purchase.details);
      return calculated;
    }

    logger.warn(`[MyPurchases] No se pudo obtener total para compra #${purchase.id}`, purchase);
    return 0;
  }
}
