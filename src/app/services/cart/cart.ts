import { Injectable, computed, signal } from '@angular/core';
import { logger } from '../../core/logger';

/**
 * Item del carrito (marketplace): una "oferta" = producto + distribuidor.
 * La `offerId` (`"productId-distributorDni"`) identifica de forma única la
 * combinación producto/distribuidor dentro del carrito.
 */
export interface CartItem {
  offerId: string;
  productId: number;
  distributorDni: string;
  distributorName: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  qty: number;
  zone?: { id: number; name: string; isHeadquarters?: boolean } | null;
}

/** Datos necesarios para agregar una oferta al carrito (la cantidad la maneja el servicio). */
export type CartOfferInput = Omit<CartItem, 'qty'>;

/** Agrupación de items por distribuidor, con subtotal. Base del checkout por distribuidor. */
export interface DistributorGroup {
  dni: string;
  name: string;
  zone?: { id: number; name: string; isHeadquarters?: boolean } | null;
  items: CartItem[];
  subtotal: number;
}

/** Payload de venta que espera el backend (se crea una venta por distribuidor). */
export interface SalePayload {
  clientDni: string;
  distributorDni: string;
  details: Array<{ productId: number; quantity: number }>;
}

/**
 * Servicio de carrito: ÚNICA FUENTE DE VERDAD del dominio carrito/checkout.
 *
 * Centraliza (issue de "centralizar lógica de carrito y checkout"):
 * - estado del carrito (signals),
 * - persistencia en localStorage,
 * - totales,
 * - agrupación por distribuidor,
 * - armado del payload de compra.
 *
 * Los componentes (store, checkout) sólo renderizan y delegan en este servicio;
 * no vuelven a implementar la estructura del item, ni la persistencia, ni el
 * cálculo de totales/agrupaciones.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  /**
   * Clave de storage. Se reutiliza la clave previa del store (`cart.marketplace.v1`)
   * para no perder los carritos ya guardados por usuarios existentes.
   */
  private readonly storageKey = 'cart.marketplace.v1';

  private readonly itemsSig = signal<CartItem[]>(this.load());

  /** Items del carrito (solo lectura). */
  readonly items = this.itemsSig.asReadonly();

  /** Cantidad total de unidades en el carrito. */
  readonly count = computed(() => this.itemsSig().reduce((n, it) => n + it.qty, 0));

  /** Importe total del carrito. */
  readonly total = computed(() => this.itemsSig().reduce((s, it) => s + it.price * it.qty, 0));

  /** Items agrupados por distribuidor, con subtotal por grupo. */
  readonly distributorGroups = computed<DistributorGroup[]>(() => {
    const groups = new Map<string, DistributorGroup>();
    for (const item of this.itemsSig()) {
      const existing = groups.get(item.distributorDni);
      if (existing) {
        existing.items.push(item);
        existing.subtotal += item.price * item.qty;
      } else {
        groups.set(item.distributorDni, {
          dni: item.distributorDni,
          name: item.distributorName,
          zone: item.zone ?? null,
          items: [item],
          subtotal: item.price * item.qty,
        });
      }
    }
    return [...groups.values()];
  });

  /** Indica si el carrito abarca más de un distribuidor. */
  readonly hasMultipleDistributors = computed(() => this.distributorGroups().length > 1);

  /** Agrega una oferta (o incrementa su cantidad si ya está en el carrito). */
  add(offer: CartOfferInput): void {
    const items = [...this.itemsSig()];
    const idx = items.findIndex(it => it.offerId === offer.offerId);
    if (idx >= 0) {
      items[idx] = { ...items[idx], qty: items[idx].qty + 1 };
    } else {
      items.push({ ...offer, qty: 1 });
    }
    this.commit(items);
  }

  /** Incrementa la cantidad de una oferta. */
  inc(offerId: string): void {
    this.commit(
      this.itemsSig().map(it => (it.offerId === offerId ? { ...it, qty: it.qty + 1 } : it))
    );
  }

  /** Decrementa la cantidad de una oferta; la elimina si llega a 0. */
  dec(offerId: string): void {
    const items = this.itemsSig()
      .map(it => (it.offerId === offerId ? { ...it, qty: it.qty - 1 } : it))
      .filter(it => it.qty > 0);
    this.commit(items);
  }

  /** Elimina una oferta del carrito. */
  remove(offerId: string): void {
    this.commit(this.itemsSig().filter(it => it.offerId !== offerId));
  }

  /** Vacía el carrito. */
  clear(): void {
    this.commit([]);
  }

  /**
   * Construye un payload de venta por cada distribuidor presente en el carrito.
   * El distribuidor de cada venta proviene de los propios items del carrito,
   * nunca de "el primero disponible".
   */
  buildSalePayloads(clientDni: string): SalePayload[] {
    return this.distributorGroups().map(group => ({
      clientDni,
      distributorDni: group.dni,
      details: group.items.map(it => ({ productId: it.productId, quantity: it.qty })),
    }));
  }

  private commit(items: CartItem[]): void {
    this.itemsSig.set(items);
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.itemsSig()));
    } catch (e) {
      logger.error('[CartService] Error saving cart:', e);
    }
  }

  private load(): CartItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      logger.error('[CartService] Error loading cart:', e);
      return [];
    }
  }
}
