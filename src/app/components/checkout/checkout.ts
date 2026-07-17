import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of, firstValueFrom } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { SaleService } from '../../services/sale/sale';
import { AuthService } from '../../services/auth/auth';
import { CartService } from '../../services/cart/cart';
import { unwrap } from '../../core/http/unwrap';
import { logger } from '../../core/logger';

interface CheckoutState {
  step: 'cart' | 'processing' | 'success' | 'error';
  saleId?: number;
  distributorName?: string;
  zoneName?: string;
  zoneAddress?: string;
  errorMessage?: string;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="checkout">
      <!-- Loading State -->
      <div class="checkout__loading" *ngIf="state().step === 'processing'">
        <div class="spinner"></div>
        <h3>{{ 'checkout.processing' | translate }}</h3>
        <p>{{ 'checkout.processingDesc' | translate }}</p>
      </div>

      <!-- Success State -->
      <div class="checkout__success" *ngIf="state().step === 'success'">
        <div class="success-icon">✅</div>
        <h2>{{ 'checkout.success.title' | translate }}</h2>
        <p class="success-message">{{ 'checkout.success.message' | translate }}</p>
        
        <div class="sale-info">
          <div class="info-item">
            <span class="label">{{ 'checkout.saleNumber' | translate }}</span>
            <span class="value">#{{ state().saleId }}</span>
          </div>
          <div class="info-item">
            <span class="label">{{ 'checkout.distributor' | translate }}</span>
            <span class="value">{{ state().distributorName }}</span>
          </div>
        </div>

        <div class="payment-instructions">
          <h3>{{ 'checkout.nextSteps' | translate }}</h3>
          <div class="instruction-card">
            <div class="instruction-icon">🏢</div>
            <div class="instruction-content">
              <h4>{{ 'checkout.visitHeadquarters' | translate }}</h4>
              <p>{{ 'checkout.visitDesc' | translate }}</p>
              
              <div class="headquarters-info" *ngIf="state().zoneName">
                <div class="hq-item">
                  <span class="hq-label">{{ 'checkout.zone' | translate }}</span>
                  <span class="hq-value">{{ state().zoneName }}</span>
                </div>
                <div class="hq-item" *ngIf="state().zoneAddress">
                  <span class="hq-label">{{ 'checkout.address' | translate }}</span>
                  <span class="hq-value">{{ state().zoneAddress }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="instruction-card">
            <div class="instruction-icon">💰</div>
            <div class="instruction-content">
              <h4>{{ 'checkout.bringPayment' | translate }}</h4>
              <p>{{ 'checkout.bringPaymentDesc' | translate }}</p>
            </div>
          </div>

          <div class="instruction-card">
            <div class="instruction-icon">📦</div>
            <div class="instruction-content">
              <h4>{{ 'checkout.receiveProducts' | translate }}</h4>
              <p>{{ 'checkout.receiveProductsDesc' | translate }}</p>
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <button class="btn btn--primary" (click)="goToStore()">
            {{ 'checkout.continueShopping' | translate }}
          </button>
          <button class="btn btn--ghost" (click)="goToAccount()">
            {{ 'checkout.viewAccount' | translate }}
          </button>
        </div>
      </div>

      <!-- Error State -->
      <div class="checkout__error" *ngIf="state().step === 'error'">
        <div class="error-icon">❌</div>
        <h2>{{ 'checkout.error.title' | translate }}</h2>
        <p class="error-message">{{ state().errorMessage || ('checkout.error.generic' | translate) }}</p>
        
        <div class="action-buttons">
          <button class="btn btn--primary" (click)="retry()">
            {{ 'checkout.tryAgain' | translate }}
          </button>
          <button class="btn btn--ghost" (click)="goToStore()">
            {{ 'checkout.backToStore' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .checkout {
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--sp-6);
    }

    .checkout__loading,
    .checkout__success,
    .checkout__error {
      max-width: 600px;
      width: 100%;
      text-align: center;
    }

    /* Loading */
    .spinner {
      width: 60px;
      height: 60px;
      margin: 0 auto var(--sp-4);
      border: 4px solid rgba(195, 164, 98, 0.2);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Success */
    .success-icon,
    .error-icon {
      font-size: 64px;
      margin-bottom: var(--sp-4);
      animation: scaleIn 0.3s ease-out;
    }

    @keyframes scaleIn {
      from {
        transform: scale(0);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    .checkout__success h2 {
      font-size: 2rem;
      margin-bottom: var(--sp-3);
      color: var(--accent);
    }

    .success-message {
      font-size: 1.1rem;
      color: var(--muted);
      margin-bottom: var(--sp-5);
    }

    .sale-info {
      display: grid;
      gap: var(--sp-3);
      padding: var(--sp-4);
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      margin-bottom: var(--sp-5);
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--sp-2) 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .info-item:last-child {
      border-bottom: none;
    }

    .info-item .label {
      color: var(--muted);
      font-size: 0.9rem;
    }

    .info-item .value {
      font-weight: 700;
      color: var(--text);
    }

    /* Instructions */
    .payment-instructions {
      text-align: left;
      margin-bottom: var(--sp-5);
    }

    .payment-instructions h3 {
      text-align: center;
      margin-bottom: var(--sp-4);
      font-size: 1.5rem;
    }

    .instruction-card {
      display: flex;
      gap: var(--sp-3);
      padding: var(--sp-4);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      margin-bottom: var(--sp-3);
    }

    .instruction-icon {
      font-size: 32px;
      flex-shrink: 0;
    }

    .instruction-content h4 {
      margin: 0 0 var(--sp-2);
      font-size: 1.1rem;
    }

    .instruction-content p {
      margin: 0;
      color: var(--muted);
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .headquarters-info {
      margin-top: var(--sp-3);
      padding: var(--sp-3);
      background: rgba(195, 164, 98, 0.1);
      border-radius: 8px;
      border: 1px solid rgba(195, 164, 98, 0.2);
    }

    .hq-item {
      display: flex;
      justify-content: space-between;
      padding: var(--sp-2) 0;
    }

    .hq-label {
      color: var(--muted);
      font-size: 0.9rem;
    }

    .hq-value {
      font-weight: 600;
      color: var(--accent);
    }

    /* Buttons */
    .action-buttons {
      display: flex;
      gap: var(--sp-3);
      justify-content: center;
      margin-top: var(--sp-4);
    }

    .btn {
      padding: 12px 24px;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn--primary {
      background: linear-gradient(180deg, var(--accent), var(--accent-700));
      color: #1a1308;
      box-shadow: 0 6px 16px rgba(195, 164, 98, 0.22);
    }

    .btn--primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 22px rgba(195, 164, 98, 0.28);
    }

    .btn--ghost {
      background: transparent;
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn--ghost:hover {
      border-color: var(--accent);
    }

    /* Error */
    .checkout__error h2 {
      font-size: 2rem;
      margin-bottom: var(--sp-3);
      color: #ff6b6b;
    }

    .error-message {
      font-size: 1.1rem;
      color: var(--muted);
      margin-bottom: var(--sp-5);
    }

    @media (max-width: 560px) {
      .action-buttons {
        flex-direction: column;
      }

      .instruction-card {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class CheckoutComponent implements OnInit {
  private saleSrv = inject(SaleService);
  private authSrv = inject(AuthService);
  private cartSrv = inject(CartService);
  private router = inject(Router);

  state = signal<CheckoutState>({ step: 'cart' });

  ngOnInit() {
    this.processCheckout();
  }

  async processCheckout() {
    this.state.set({ step: 'processing' });

    try {
      const user = this.authSrv.user();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const clientDni = (user as any).person?.dni;
      if (!clientDni) {
        throw new Error('No se pudo obtener tu DNI. Completá tu perfil antes de comprar.');
      }

      // ✅ El distribuidor de cada venta proviene del carrito real (agrupado por
      //    distribuidor), NO de "el primer distribuidor disponible".
      const groups = this.cartSrv.distributorGroups();
      if (groups.length === 0) {
        throw new Error('Tu carrito está vacío');
      }

      // Una venta por distribuidor, en paralelo, tolerando fallos parciales.
      const requests = groups.map(group =>
        this.saleSrv
          .createSale({
            clientDni,
            distributorDni: group.dni,
            details: group.items.map(it => ({ productId: it.productId, quantity: it.qty })),
          })
          .pipe(
            map(response => ({ ok: true as const, group, response })),
            catchError(error =>
              of({
                ok: false as const,
                group,
                error: error?.error?.message || error?.message || 'Error desconocido',
              })
            )
          )
      );

      const results = await firstValueFrom(forkJoin(requests));
      const successful = results.filter(r => r.ok);
      if (successful.length === 0) {
        throw new Error('No se pudo procesar la compra. Intentá nuevamente.');
      }

      // Refrescar el usuario para reflejar el nuevo rol CLIENT si corresponde.
      await firstValueFrom(this.authSrv.me());

      const first = successful[0];
      const firstSale = unwrap<{ id?: number }>((first as any).response);

      this.state.set({
        step: 'success',
        saleId: firstSale?.id,
        distributorName: successful.map(r => r.group.name).join(', '),
        zoneName: first.group.zone?.name || 'Sede central',
        zoneAddress: '',
      });

      // Limpiar carrito centralizado tras la compra exitosa.
      this.cartSrv.clear();
    } catch (error: any) {
      logger.error('Error en checkout:', error);
      this.state.set({
        step: 'error',
        errorMessage: error?.message || error?.error?.message || 'Error al procesar la compra',
      });
    }
  }

  retry() {
    this.processCheckout();
  }

  goToStore() {
    this.router.navigate(['/tienda']);
  }

  goToAccount() {
    this.router.navigate(['/mi-cuenta']);
  }
}