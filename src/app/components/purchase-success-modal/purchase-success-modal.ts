// purchase-success-modal.ts - VERSIÓN CON MÚLTIPLES VENTAS

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// ✅ INTERFAZ ACTUALIZADA: Soporte para múltiples ventas
export interface PurchaseSuccessData {
  saleId: number;
  total: number;
  distributor?: {
    dni?: string;
    name?: string;        
    phone?: string | null;
    email?: string;       
    address?: string | null;
    zone?: {
      id?: number;
      name?: string;      
      isHeadquarters?: boolean;
    } | null;
  } | null;
  // ✅ NUEVO: Múltiples ventas
  multipleSales?: Array<{
    saleId: number;
    distributor: {
      dni: string;
      name: string;
      phone?: string | null;
      email: string;
      address?: string | null;
      zone?: {
        id: number;
        name: string;
        isHeadquarters?: boolean;
      } | null;
    };
    products: Array<{
      id: number;
      description: string | null;
      price: number;
      qty: number;
    }>;
    subtotal: number;
  }>;
}

@Component({
  selector: 'app-purchase-success-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal purchase-success-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div class="success-icon">✅</div>
          <h2>
            {{ isMultipleSales() 
              ? '¡' + data.multipleSales!.length + ' Compras Realizadas!' 
              : '¡Compra Realizada con Éxito!' 
            }}
          </h2>
          <button class="close-btn" type="button" (click)="onClose()">×</button>
        </div>

        <div class="modal-body">
          <div class="success-message">
            <p *ngIf="!isMultipleSales()">Tu compra ha sido registrada correctamente.</p>
            <p *ngIf="isMultipleSales()">
              Tus compras han sido registradas exitosamente. Recibirás confirmación por cada una.
            </p>
          </div>

          <!-- VISTA: COMPRA ÚNICA -->
          <div class="purchase-details" *ngIf="!isMultipleSales()">
            <div class="detail-item">
              <span class="label">Número de Venta:</span>
              <span class="value">#{{ data.saleId }}</span>
            </div>

            <div class="detail-item">
              <span class="label">Total:</span>
              <span class="value total">$ {{ data.total | number:'1.2-2' }}</span>
            </div>

            <div class="distributor-info" *ngIf="data.distributor as dist">
              <h4>📍 Punto de Retiro</h4>
              
              <div class="distributor-details">
                <div class="detail-row">
                  <span class="detail-label">Sede:</span>
                  <span class="detail-value">
                    <strong>{{ dist.name }}</strong>
                    <span class="badge badge--primary" *ngIf="dist.zone?.isHeadquarters">
                      Casa Central
                    </span>
                  </span>
                </div>

                <div class="detail-row" *ngIf="dist.zone">
                  <span class="detail-label">Zona:</span>
                  <span class="detail-value">{{ dist.zone.name }}</span>
                </div>

                <div class="detail-row" *ngIf="dist.address">
                  <span class="detail-label">Dirección:</span>
                  <span class="detail-value">{{ dist.address }}</span>
                </div>

                <div class="detail-row" *ngIf="dist.phone">
                  <span class="detail-label">Teléfono:</span>
                  <span class="detail-value">
                    <a [href]="'tel:' + dist.phone">{{ dist.phone }}</a>
                  </span>
                </div>

                <div class="detail-row" *ngIf="dist.email">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">
                    <a [href]="'mailto:' + dist.email">{{ dist.email }}</a>
                  </span>
                </div>
              </div>

              <div class="info-box">
                <span class="info-icon">ℹ️</span>
                <p>Dirígete a esta sede para retirar tu compra. Recuerda llevar tu DNI.</p>
              </div>
            </div>
          </div>

          <!-- VISTA: MÚLTIPLES COMPRAS -->
          <div class="multiple-sales-container" *ngIf="isMultipleSales()">
            <div class="total-summary">
              <span class="label">Total General:</span>
              <span class="value">$ {{ data.total | number:'1.2-2' }}</span>
            </div>

            <div class="sales-grid">
              <div class="sale-card" *ngFor="let sale of data.multipleSales; let i = index">
                <div class="sale-header">
                  <div class="sale-number">{{ i + 1 }}</div>
                  <div class="sale-title">
                    <strong>Venta #{{ sale.saleId }}</strong>
                    <span class="sale-distributor">
                      📍 {{ sale.distributor.name }}
                      <span class="zone-badge" *ngIf="sale.distributor.zone">
                        {{ sale.distributor.zone.name }}
                        <span *ngIf="sale.distributor.zone.isHeadquarters">⭐</span>
                      </span>
                    </span>
                  </div>
                </div>

                <div class="sale-products">
                  <div class="products-label">Productos:</div>
                  <ul class="products-list">
                    <li *ngFor="let product of sale.products">
                      <span class="product-name">{{ product.description }}</span>
                      <span class="product-qty">x{{ product.qty }}</span>
                    </li>
                  </ul>
                </div>

                <div class="sale-footer">
                  <span class="subtotal-label">Subtotal</span>
                  <strong class="subtotal-value">$ {{ sale.subtotal | number:'1.2-2' }}</strong>
                </div>

                <div class="sale-contact" *ngIf="sale.distributor.phone || sale.distributor.email">
                  <div class="contact-item" *ngIf="sale.distributor.phone">
                    <span class="contact-icon">📞</span>
                    <a [href]="'tel:' + sale.distributor.phone">{{ sale.distributor.phone }}</a>
                  </div>
                  <div class="contact-item" *ngIf="sale.distributor.email">
                    <span class="contact-icon">✉️</span>
                    <a [href]="'mailto:' + sale.distributor.email">{{ sale.distributor.email }}</a>
                  </div>
                </div>
              </div>
            </div>

            <div class="info-box">
              <span class="info-icon">ℹ️</span>
              <p>
                Deberás retirar tus productos en {{ data.multipleSales!.length }} ubicaciones diferentes.
                Recuerda llevar tu DNI en cada retiro.
              </p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn--accent" type="button" (click)="onClose()">
            Entendido
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 16px;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .purchase-success-modal {
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      max-width: 650px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4), inset 0 1px rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(20px);
      animation: slideUp 0.3s cubic-bezier(0.25, 0.6, 0.3, 1);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 32px 24px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      position: relative;

      h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 800;
        color: #fff;
        text-align: center;
        font-family: 'Google Sans Code', monospace;
      }

      .close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        font-size: 2rem;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        line-height: 1;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;

        &:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
      }
    }

    .success-icon {
      font-size: 4rem;
      animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
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

    .modal-body {
      padding: 24px;
    }

    .success-message {
      text-align: center;
      margin-bottom: 24px;

      p {
        margin: 0;
        color: rgba(255, 255, 255, 0.8);
        font-size: 1rem;
        line-height: 1.5;
      }
    }

    .purchase-details {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;

      .label {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 600;
      }

      .value {
        font-size: 1rem;
        color: #fff;
        font-weight: 700;

        &.total {
          font-size: 1.25rem;
          color: #c3a462;
        }
      }
    }

    .distributor-info {
      padding: 16px;
      background: linear-gradient(135deg, rgba(195, 164, 98, 0.12), rgba(195, 164, 98, 0.08));
      border: 1px solid rgba(195, 164, 98, 0.3);
      border-radius: 12px;
      margin-top: 8px;

      h4 {
        margin: 0 0 16px 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: #c3a462;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .muted {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.9rem;
        margin: 0;
      }
    }

    .distributor-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;

      .detail-label {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 600;
        min-width: 80px;
        flex-shrink: 0;
      }

      .detail-value {
        flex: 1;
        font-size: 0.9rem;
        color: #fff;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;

        strong {
          color: #fef3c7;
          font-weight: 700;
        }

        a {
          color: #c3a462;
          text-decoration: none;
          transition: color 0.2s;

          &:hover {
            color: #fef3c7;
            text-decoration: underline;
          }
        }
      }
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &--primary {
        background: linear-gradient(180deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.2));
        border: 1px solid rgba(16, 185, 129, 0.4);
        color: #6ee7b7;
      }
    }

    /* ESTILOS MÚLTIPLES VENTAS */

    .multiple-sales-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .total-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: linear-gradient(135deg, rgba(195, 164, 98, 0.15), rgba(195, 164, 98, 0.08));
      border: 2px solid rgba(195, 164, 98, 0.4);
      border-radius: 12px;

      .label {
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 700;
      }

      .value {
        font-size: 1.5rem;
        color: #c3a462;
        font-weight: 900;
      }
    }

    .sales-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sale-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.2s;

      &:hover {
        border-color: rgba(195, 164, 98, 0.4);
        background: rgba(255, 255, 255, 0.06);
      }
    }

    .sale-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);

      .sale-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        border-radius: 8px;
        font-weight: 800;
        font-size: 16px;
        flex-shrink: 0;
      }

      .sale-title {
        flex: 1;

        strong {
          display: block;
          font-size: 15px;
          color: #fff;
          margin-bottom: 4px;
        }

        .sale-distributor {
          display: block;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);

          .zone-badge {
            margin-left: 8px;
            padding: 2px 6px;
            background: rgba(59, 130, 246, 0.2);
            border-radius: 4px;
            font-size: 12px;
            color: #93c5fd;
          }
        }
      }
    }

    .sale-products {
      padding: 16px;

      .products-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 600;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .products-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;

        li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;

          .product-name {
            flex: 1;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
          }

          .product-qty {
            font-size: 13px;
            color: #c3a462;
            font-weight: 600;
          }
        }
      }
    }

    .sale-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: rgba(0, 0, 0, 0.15);
      border-top: 1px solid rgba(255, 255, 255, 0.08);

      .subtotal-label {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
        font-weight: 600;
      }

      .subtotal-value {
        font-size: 17px;
        color: #c3a462;
        font-weight: 800;
      }
    }

    .sale-contact {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(59, 130, 246, 0.08);
      border-top: 1px solid rgba(59, 130, 246, 0.2);

      .contact-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;

        .contact-icon {
          font-size: 14px;
        }

        a {
          color: #93c5fd;
          text-decoration: none;
          transition: color 0.2s;

          &:hover {
            color: #dbeafe;
            text-decoration: underline;
          }
        }
      }
    }

    .info-box {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 8px;

      .info-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      p {
        margin: 0;
        font-size: 0.875rem;
        color: #fbbf24;
        line-height: 1.4;
      }
    }

    .modal-footer {
      display: flex;
      justify-content: center;
      padding: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 10px;
      cursor: pointer;
      border: 1px solid transparent;
      font-weight: 700;
      font-family: 'Google Sans Code', monospace;
      transition: all 0.2s ease;
    }

    .btn--accent {
      background: linear-gradient(180deg, rgba(255, 255, 255, .08), rgba(0, 0, 0, .18)), 
                  linear-gradient(180deg, #c3a462, #9e844e);
      color: #1a1308;
      box-shadow: 0 6px 16px rgba(195, 164, 98, .22);

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 22px rgba(195, 164, 98, .28);
      }

      &:active {
        transform: translateY(0);
      }
    }

    @media (max-width: 560px) {
      .purchase-success-modal {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
      }

      .detail-row {
        flex-direction: column;
        gap: 4px;

        .detail-label {
          min-width: auto;
        }
      }

      .sale-contact {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})
export class PurchaseSuccessModalComponent {
  @Input() data!: PurchaseSuccessData;
  @Output() close = new EventEmitter<void>();

  isMultipleSales(): boolean {
    return !!(this.data.multipleSales && this.data.multipleSales.length > 0);
  }

  onClose(): void {
    this.close.emit();
  }
}