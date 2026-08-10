import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DialogDirective } from '../a11y/dialog.directive';
import type { ConfirmOptions } from './confirm.service';

/**
 * Diálogo de confirmación. No se usa directamente desde las plantillas: lo monta
 * `ConfirmService`.
 *
 * Los estilos reaprovechan `.modal-overlay` / `.modal`, que ya estaban escritos
 * en las hojas de las pantallas de gestión sin que ningún marcado los usara.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule, DialogDirective],
  template: `
    <div class="modal-overlay" *ngIf="open()" (click)="answer(false)">
      <div
        class="modal confirm-dialog"
        appDialog
        [dialogOpen]="open()"
        (dialogClose)="answer(false)"
        (click)="$event.stopPropagation()"
      >
        <h3 class="confirm-dialog__title">{{ options.title }}</h3>
        <p class="confirm-dialog__message" *ngIf="options.message">{{ options.message }}</p>

        <div class="confirm-dialog__actions">
          <button type="button" class="btn ghost" (click)="answer(false)">
            {{ options.cancelLabel || ('common.cancel' | translate) }}
          </button>
          <button
            type="button"
            class="btn"
            [class.danger]="options.danger"
            (click)="answer(true)"
          >
            {{ options.confirmLabel || ('common.confirm' | translate) }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--sp-4, 16px);
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: var(--z-modal);
      }

      .confirm-dialog {
        width: min(440px, 100%);
        padding: var(--sp-5, 24px);
        display: flex;
        flex-direction: column;
        gap: var(--sp-3, 12px);
        border-radius: var(--radius, 14px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.06),
            rgba(255, 255, 255, 0.02)
          ),
          rgba(20, 22, 28, 0.97);
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
      }

      .confirm-dialog__title {
        margin: 0;
        font-size: 1.1rem;
        line-height: 1.35;
      }

      .confirm-dialog__message {
        margin: 0;
        color: var(--muted);
        font-size: 0.94rem;
      }

      .confirm-dialog__actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--sp-2, 8px);
        margin-top: var(--sp-2, 8px);
      }

      @media (max-width: 480px) {
        .confirm-dialog__actions {
          flex-direction: column-reverse;
        }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  options: ConfirmOptions = { title: '' };
  readonly open = signal(false);

  @Output() readonly answered = new EventEmitter<boolean>();

  answer(aceptado: boolean): void {
    this.open.set(false);
    this.answered.emit(aceptado);
  }
}
