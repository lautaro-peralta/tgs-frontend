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

  stats = computed(() => {
    const purchases = this.purchases();
    const totalPurchases = purchases.length;
    const totalSpent = purchases.reduce((sum, p) => {
      return sum + this.getTotal(p);
    }, 0);

    return {
      totalPurchases,
      totalSpent
    };
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
    const user = this.me();
    if (!user?.person?.dni) {
      this.error.set('No se pudo obtener la información del usuario');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Cargar ventas y productos en paralelo
    forkJoin({
      sales: this.saleService.getAllSales(),
      products: this.productService.getAllProducts()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ sales, products }) => {
          // Guardar productos
          this.products.set(products);

          // Filtrar solo las ventas del usuario actual
          const userPurchases = sales.filter(sale => sale.client?.dni === user.person?.dni);
          console.log('[MyPurchases] 📦 Compras del usuario:', userPurchases);
          console.log('[MyPurchases] 🛍️ Productos cargados:', products.length);

          this.purchases.set(userPurchases);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
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
    if (error.status === 401) {
      this.error.set('No autorizado. Por favor, inicia sesión nuevamente.');
    } else if (error.status === 403) {
      this.error.set('No tienes permisos para ver esta información.');
    } else if (error.error?.message) {
      this.error.set(error.error.message);
    } else {
      this.error.set(fallbackMessage);
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
      console.log(`[MyPurchases] Total directo para compra #${purchase.id}:`, total);
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
      console.log(`[MyPurchases] Total calculado para compra #${purchase.id}:`, calculated, 'detalles:', purchase.details);
      return calculated;
    }

    console.warn(`[MyPurchases] ⚠️ No se pudo obtener total para compra #${purchase.id}`, purchase);
    return 0;
  }
}
