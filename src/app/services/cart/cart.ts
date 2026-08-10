import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ProductOffer } from '../../models/product/product.model';
import { SaleService } from '../sale/sale';

export interface CartItem {
  offerId: string;
  productId: number;
  distributorDni: string;
  distributorName: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  qty: number;
  zone?: {
    id: number;
    name: string;
    isHeadquarters?: boolean;
  } | null;
}

export interface DistributorGroup {
  dni: string;
  name: string;
  zone?: CartItem['zone'];
  items: CartItem[];
  subtotal: number;
}

export interface CheckoutResult {
  distributor: DistributorGroup;
  success: boolean;
  saleId?: number;
  error?: string;
}

/**
 * Fuente única de verdad del carrito: estado, persistencia, agrupación por
 * distribuidor y armado/envío del checkout. Los componentes solo deben
 * delegar acá en vez de reimplementar esta lógica.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly saleSrv = inject(SaleService);
  private readonly LS_KEY = 'cart.v1';

  private readonly itemsSig = signal<CartItem[]>(this.load());
  readonly items = this.itemsSig.asReadonly();

  readonly count = computed(() => this.itemsSig().reduce((n, it) => n + it.qty, 0));
  readonly total = computed(() => this.itemsSig().reduce((s, it) => s + it.price * it.qty, 0));

  readonly distributorGroups = computed<DistributorGroup[]>(() => {
    const grouped = new Map<string, CartItem[]>();
    for (const item of this.itemsSig()) {
      const list = grouped.get(item.distributorDni);
      if (list) list.push(item);
      else grouped.set(item.distributorDni, [item]);
    }
    return Array.from(grouped.values()).map((items) => ({
      dni: items[0].distributorDni,
      name: items[0].distributorName,
      zone: items[0].zone,
      items,
      subtotal: items.reduce((s, it) => s + it.price * it.qty, 0),
    }));
  });

  readonly hasMultipleDistributors = computed(() => this.distributorGroups().length > 1);

  add(offer: ProductOffer): void {
    const items = this.itemsSig();
    const idx = items.findIndex((it) => it.offerId === offer.offerId);
    if (idx >= 0) {
      const updated = [...items];
      updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
      this.itemsSig.set(updated);
    } else {
      this.itemsSig.set([
        ...items,
        {
          offerId: offer.offerId,
          productId: offer.productId,
          distributorDni: offer.distributorDni,
          distributorName: offer.distributorName,
          description: offer.description,
          price: offer.price,
          imageUrl: offer.imageUrl,
          qty: 1,
          zone: offer.zone,
        },
      ]);
    }
    this.persist();
  }

  inc(offerId: string): void {
    this.itemsSig.set(
      this.itemsSig().map((it) => (it.offerId === offerId ? { ...it, qty: it.qty + 1 } : it))
    );
    this.persist();
  }

  dec(offerId: string): void {
    const items = this.itemsSig()
      .map((it) => (it.offerId === offerId ? { ...it, qty: it.qty - 1 } : it))
      .filter((it) => it.qty > 0);
    this.itemsSig.set(items);
    this.persist();
  }

  remove(offerId: string): void {
    this.itemsSig.set(this.itemsSig().filter((it) => it.offerId !== offerId));
    this.persist();
  }

  clear(): void {
    this.itemsSig.set([]);
    this.persist();
  }

  /**
   * Arma un pedido por cada distribuidor presente en el carrito y los
   * envía en paralelo. No limpia el carrito: eso lo decide quien llama
   * según el resultado (puede haber compras parciales fallidas).
   */
  checkout(clientDni: string): Observable<CheckoutResult[]> {
    const requests = this.distributorGroups().map((group) =>
      this.saleSrv
        .createSale({
          clientDni,
          distributorDni: group.dni,
          details: group.items.map((it) => ({ productId: it.productId, quantity: it.qty })),
        })
        .pipe(
          map(
            (response): CheckoutResult => ({
              distributor: group,
              success: true,
              saleId: response.data?.id,
            })
          ),
          catchError((error) =>
            of<CheckoutResult>({
              distributor: group,
              success: false,
              error: error?.error?.message || error?.message || 'Error desconocido',
            })
          )
        )
    );
    return forkJoin(requests);
  }

  private persist(): void {
    try {
      localStorage.setItem(this.LS_KEY, JSON.stringify(this.itemsSig()));
    } catch (e) {
      console.error('[CartService] Error al guardar el carrito:', e);
    }
  }

  private load(): CartItem[] {
    try {
      const raw = localStorage.getItem(this.LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
