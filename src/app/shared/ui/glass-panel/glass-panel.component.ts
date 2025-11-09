import { Component, Input } from '@angular/core';
import { NgStyle } from '@angular/common'; // 👈 importante

@Component({
  selector: 'app-glass-panel',
  standalone: true,
  imports: [NgStyle], // 👈 habilita [ngStyle]
  template: `<div class="glass" [ngStyle]="style"><ng-content /></div>`,
  styles: [`
    .glass {
      border-radius: var(--glass-radius, 16px);
      border: 1px solid rgba(255,255,255,0.18);
      background: rgba(255,255,255,var(--glass-alpha,0.12));
      box-shadow: 0 8px 32px rgba(2,8,20,0.18);
      backdrop-filter: blur(var(--glass-blur,12px)) saturate(1.2);
      -webkit-backdrop-filter: blur(var(--glass-blur,12px)) saturate(1.2);
    }
    /* Fallback si el navegador no soporta backdrop-filter */
    @supports not (backdrop-filter: blur(4px)) {
      .glass {
        background: rgba(245,245,245,0.90);
        color: #0b1220;
      }
    }
  `]
})
export class GlassPanelComponent {
  /** Intensidad del blur en px */
  @Input() blurPx = 12;
  /** Transparencia del panel (0 a 1) */
  @Input() alpha = 0.12;
  /** Padding interno (ej. '1rem') */
  @Input() padding = '1rem';
  /** Radio opcional (ej. '20px') */
  @Input() radius?: string;

  get style() {
    return {
      '--glass-blur': `${this.blurPx}px`,
      '--glass-alpha': this.alpha,
      '--glass-radius': this.radius ?? '16px',
      padding: this.padding,
    } as any;
  }
}
