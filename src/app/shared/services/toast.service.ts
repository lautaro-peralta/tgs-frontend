import { Injectable, signal } from '@angular/core';

/** Severidad del toast: define el ícono por defecto y el rol/aria-live con el que se anuncia. */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  readonly id: number;
  readonly title?: string;
  readonly message: string;
  readonly type: ToastType;
  readonly icon: string;
}

export interface ToastOptions {
  message: string;
  /** Severidad del toast (default 'info'). 'error' se anuncia como alerta (role="alert", aria-live="assertive"). */
  type?: ToastType;
  /** Título opcional, mostrado en negrita antes del mensaje. */
  title?: string;
  /** Ícono/emoji a mostrar. Si se omite, se usa uno por defecto según `type`. */
  icon?: string;
  /** Duración en ms antes de auto-ocultarse (default 5000). */
  duration?: number;
}

const DEFAULT_ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const DEFAULT_DURATION_MS = 5000;

/**
 * Servicio de toasts transitorios reusable en toda la app.
 *
 * Mantiene una cola (no un solo toast) para que, si llegan varias
 * notificaciones casi al mismo tiempo, todas se muestren en vez de que la
 * más nueva tape a la anterior. Cada toast tiene su propio timer de
 * auto-cierre identificado por su id, así cerrar o reemplazar uno no
 * cancela el timer de otro.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Encola un nuevo toast y programa su auto-cierre. */
  show(options: ToastOptions): number {
    const id = this.nextId++;
    const type = options.type ?? 'info';
    const toast: Toast = {
      id,
      title: options.title,
      message: options.message,
      type,
      icon: options.icon ?? DEFAULT_ICONS[type],
    };

    this._toasts.update(list => [...list, toast]);

    const duration = options.duration ?? DEFAULT_DURATION_MS;
    const timerId = setTimeout(() => this.dismiss(id), duration);
    this.timers.set(id, timerId);

    return id;
  }

  /** Cierra un toast puntual (manual o por timeout) y limpia su timer. */
  dismiss(id: number): void {
    const timerId = this.timers.get(id);
    if (timerId !== undefined) {
      clearTimeout(timerId);
      this.timers.delete(id);
    }
    this._toasts.update(list => list.filter(t => t.id !== id));
  }

  /** Cierra todos los toasts activos y limpia sus timers. */
  clear(): void {
    for (const timerId of this.timers.values()) {
      clearTimeout(timerId);
    }
    this.timers.clear();
    this._toasts.set([]);
  }
}
