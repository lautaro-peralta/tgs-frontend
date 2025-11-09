import { Injectable, signal } from '@angular/core';
import { ProductDTO } from '../../models/product/product.model';

type ImageMap = Record<number | string, string>;

@Injectable({ providedIn: 'root' })
export class ProductImageService {
  private key = 'product.imageMap.v1';
  private mapSig = signal<ImageMap>(this.load());

  get(id: number | string): string | null {
    const url = this.mapSig()[id];
    return url ?? null;
  }

  set(id: number | string, url: string | null | undefined) {
    const data = { ...this.mapSig() };
    if (url && url.trim()) data[id] = url.trim();
    else delete data[id];
    this.mapSig.set(data);
    this.persist();
  }

  remove(id: number | string) {
    const data = { ...this.mapSig() };
    delete data[id];
    this.mapSig.set(data);
    this.persist();
  }

  /** Mezcla la imagen local en la lista del back */
  overlay(list: ProductDTO[]): ProductDTO[] {
    const map = this.mapSig();
    return list.map(p => ({ ...p, imageUrl: map[p.id] ?? p.imageUrl ?? null }));
  }

  private persist() { localStorage.setItem(this.key, JSON.stringify(this.mapSig())); }
  private load(): ImageMap {
    try { return JSON.parse(localStorage.getItem(this.key) || '{}'); } catch { return {}; }
  }
}
