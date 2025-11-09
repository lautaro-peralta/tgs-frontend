import { Injectable, signal, computed } from '@angular/core';
import { ProductDTO } from '../../models/product/product.model';

export interface CartItem {
  id: number;
  description: string;
  price: number;
  imageUrl?: string | null;
  qty: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private key = 'cart.v1';

  readonly items = signal<CartItem[]>(this.load());

  readonly count = computed(() => this.items().reduce((n, it) => n + it.qty, 0));
  readonly total = computed(() => this.items().reduce((s, it) => s + it.price * it.qty, 0));

  add(p: ProductDTO) {
    const items = [...this.items()];
    const idx = items.findIndex(i => i.id === p.id);
    if (idx >= 0) items[idx] = { ...items[idx], qty: items[idx].qty + 1 };
    else items.unshift({
      id: p.id,
      description: p.description ?? `Producto ${p.id}`,
      price: p.price,
      imageUrl: p.imageUrl ?? null,
      qty: 1
    });
    this.items.set(items); this.persist();
  }

  remove(id: number) {
    this.items.set(this.items().filter(i => i.id !== id)); this.persist();
  }

  dec(id: number) {
    const items = this.items().map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty - 1) } : i).filter(i => i.qty > 0);
    this.items.set(items); this.persist();
  }

  inc(id: number) {
    const items = this.items().map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i);
    this.items.set(items); this.persist();
  }

  clear() { this.items.set([]); this.persist(); }

  private persist() { localStorage.setItem(this.key, JSON.stringify(this.items())); }
  private load(): CartItem[] {
    try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch { return []; }
  }
}
