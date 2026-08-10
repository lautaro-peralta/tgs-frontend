import {
  ApplicationRef,
  ComponentRef,
  Injectable,
  createComponent,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ConfirmDialogComponent } from './confirm-dialog.component';

/** Texto y aspecto de una confirmación. */
export interface ConfirmOptions {
  /** Título del diálogo. */
  title: string;
  /** Explicación de lo que va a pasar. Opcional. */
  message?: string;
  /** Etiqueta del botón que confirma. Por defecto, la traducción de common.confirm. */
  confirmLabel?: string;
  /** Etiqueta del botón que cancela. Por defecto, la traducción de common.cancel. */
  cancelLabel?: string;
  /** `true` para acciones destructivas: pinta el botón de confirmar en rojo. */
  danger?: boolean;
}

/**
 * Reemplazo de `confirm()` con un diálogo propio.
 *
 * El nativo bloquea el hilo principal, no se puede traducir junto al resto de la
 * interfaz y en varios navegadores el usuario puede silenciarlo — momento en el
 * que los borrados pasan a ejecutarse sin preguntar nada.
 *
 * Monta el diálogo fuera del árbol de componentes, así que puede llamarse desde
 * cualquier sitio sin añadir marcado a la plantilla:
 *
 * @example
 * if (!await this.confirm.ask({
 *   title: this.t.instant('products.confirmDelete'),
 *   danger: true,
 * })) return;
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly appRef = inject(ApplicationRef);
  private readonly doc = inject(DOCUMENT);

  private ref?: ComponentRef<ConfirmDialogComponent>;

  /** Muestra la confirmación y resuelve a `true` si el usuario acepta. */
  ask(options: ConfirmOptions): Promise<boolean> {
    // Si ya había una abierta, la descartamos: dos confirmaciones simultáneas
    // sólo pueden venir de un doble click.
    this.destroy();

    const anfitrion = this.doc.createElement('div');
    this.doc.body.appendChild(anfitrion);

    const ref = createComponent(ConfirmDialogComponent, {
      environmentInjector: this.appRef.injector,
      hostElement: anfitrion,
    });
    this.ref = ref;
    this.appRef.attachView(ref.hostView);

    ref.instance.options = options;
    ref.instance.open.set(true);
    ref.changeDetectorRef.detectChanges();

    return new Promise<boolean>((resolve) => {
      const sub = ref.instance.answered.subscribe((aceptado: boolean) => {
        sub.unsubscribe();
        this.destroy();
        resolve(aceptado);
      });
    });
  }

  private destroy(): void {
    if (!this.ref) return;
    const anfitrion = this.ref.location.nativeElement as HTMLElement;
    this.appRef.detachView(this.ref.hostView);
    this.ref.destroy();
    anfitrion.remove();
    this.ref = undefined;
  }
}
