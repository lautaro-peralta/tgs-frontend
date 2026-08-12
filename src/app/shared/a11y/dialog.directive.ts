import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';

/**
 * Cuenta de diálogos abiertos a la vez. El bloqueo de scroll del documento es
 * global, así que sólo se libera cuando se cierra el último.
 */
let abiertos = 0;

/**
 * Comportamiento de diálogo modal para los paneles que ya existen en la app.
 *
 * Se aplica sobre el **panel** (no sobre el fondo), que es lo que semánticamente
 * es el diálogo, y aporta lo que faltaba en las 20 ventanas de la aplicación:
 *
 * - `role="dialog"` + `aria-modal`, para que los lectores de pantalla lo anuncien.
 * - Foco inicial dentro del panel al abrir.
 * - Trampa de foco mientras está abierto: tabular ya no se escapa a la página
 *   de atrás, donde había botones de borrado tapados por el propio diálogo.
 * - Foco devuelto al elemento que lo abrió al cerrar.
 * - Cierre con Escape.
 * - Bloqueo del scroll del documento de fondo.
 *
 * Funciona con los dos patrones que conviven en el código: los paneles montados
 * siempre que sólo alternan una clase (`[class.is-open]`) y los que se montan
 * con `*ngIf` al abrirse.
 *
 * @example
 * <div class="new-product-overlay" [class.is-open]="isNewOpen">
 *   <button class="new-product-overlay__backdrop" (click)="toggleNew()"></button>
 *   <div class="new-product-overlay__panel"
 *        appDialog [dialogOpen]="isNewOpen" (dialogClose)="toggleNew()">
 *     …
 *   </div>
 * </div>
 */
@Directive({
  selector: '[appDialog]',
  standalone: true,
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    tabindex: '-1',
  },
})
export class DialogDirective implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly doc = inject(DOCUMENT);

  private trap?: FocusTrap;
  private origenDelFoco: HTMLElement | null = null;
  private abierto = false;

  /** Estado del diálogo. Acepta el booleano o la señal que ya use el componente. */
  @Input({ alias: 'dialogOpen' })
  set dialogOpen(valor: boolean | null | undefined) {
    const siguiente = !!valor;
    if (siguiente === this.abierto) return;
    siguiente ? this.abrir() : this.cerrar();
  }

  /** Se emite cuando el usuario pide cerrar con Escape. */
  @Output('dialogClose') readonly dialogClose = new EventEmitter<void>();

  private readonly onKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    this.dialogClose.emit();
  };

  private abrir(): void {
    this.abierto = true;

    const activo = this.doc.activeElement;
    this.origenDelFoco = activo instanceof HTMLElement ? activo : null;

    this.trap = this.focusTrapFactory.create(this.host.nativeElement);
    // Si el panel no tiene nada enfocable todavía, el propio panel recibe el
    // foco gracias al tabindex="-1" del host.
    this.trap.focusInitialElementWhenReady().then((encontrado) => {
      if (!encontrado) this.host.nativeElement.focus({ preventScroll: true });
    });

    this.doc.addEventListener('keydown', this.onKeydown);

    if (abiertos++ === 0) {
      this.doc.body.classList.add('has-drawer-open');
    }
  }

  private cerrar(): void {
    if (!this.abierto) return;
    this.abierto = false;

    this.doc.removeEventListener('keydown', this.onKeydown);

    this.trap?.destroy();
    this.trap = undefined;

    if (--abiertos <= 0) {
      abiertos = 0;
      this.doc.body.classList.remove('has-drawer-open');
    }

    // Sólo devolvemos el foco si sigue dentro del diálogo que se cierra: si el
    // usuario ya se movió a otra parte, moverlo de vuelta sería peor.
    const activo = this.doc.activeElement;
    if (this.origenDelFoco?.isConnected && (!activo || this.host.nativeElement.contains(activo))) {
      this.origenDelFoco.focus({ preventScroll: true });
    }
    this.origenDelFoco = null;
  }

  ngOnDestroy(): void {
    this.cerrar();
  }
}
