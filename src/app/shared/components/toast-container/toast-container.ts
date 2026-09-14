import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ToastService, ToastType } from '../../services/toast.service';

/**
 * Monta la cola de toasts del ToastService. Se instancia una sola vez
 * (en app.html) para que cualquier parte de la app pueda disparar toasts
 * llamando a ToastService.show(...) sin preocuparse por dónde se renderizan.
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './toast-container.html',
  styleUrls: ['./toast-container.scss'],
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  /** 'alert'/'assertive' para severidades que requieren atención inmediata; 'status'/'polite' para el resto. */
  roleFor(type: ToastType): 'alert' | 'status' {
    return type === 'error' ? 'alert' : 'status';
  }

  ariaLiveFor(type: ToastType): 'assertive' | 'polite' {
    return type === 'error' ? 'assertive' : 'polite';
  }

  trackById(_index: number, toast: { id: number }): number {
    return toast.id;
  }
}
