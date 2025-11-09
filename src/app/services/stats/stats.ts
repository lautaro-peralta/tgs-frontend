import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { ChartConfiguration } from 'chart.js';

export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  salesByMonth: {
    month: string;
    amount: number;
  }[];
  topProducts: {
    productId: number;
    productName: string;
    quantity: number;
  }[];
  salesByDistributor: {
    distributorName: string;
    totalSales: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/stats';
  
  private readonly USE_MOCK_DATA = true;

  /**
   * Datos mock para testing
   */
  private getMockStats(): SalesStats {
    return {
      totalSales: 247,
      totalRevenue: 1250000,
      averageTicket: 5060.73,
      salesByMonth: [
        { month: 'Enero', amount: 185000 },
        { month: 'Febrero', amount: 220000 },
        { month: 'Marzo', amount: 198000 },
        { month: 'Abril', amount: 245000 },
        { month: 'Mayo', amount: 210000 },
        { month: 'Junio', amount: 192000 }
      ],
      topProducts: [
        { productId: 1, productName: 'Vino Malbec', quantity: 89 },
        { productId: 2, productName: 'Champagne', quantity: 67 },
        { productId: 3, productName: 'Whisky', quantity: 54 },
        { productId: 4, productName: 'Vodka', quantity: 42 },
        { productId: 5, productName: 'Ron', quantity: 31 }
      ],
      salesByDistributor: [
        { distributorName: 'Norte SA', totalSales: 385000 },
        { distributorName: 'Sur SRL', totalSales: 298000 },
        { distributorName: 'Este & Oeste', totalSales: 325000 },
        { distributorName: 'Central', totalSales: 242000 }
      ]
    };
  }

  getStats(): Observable<SalesStats> {
    if (this.USE_MOCK_DATA) {
      console.log('📊 Using MOCK stats data');
      return of(this.getMockStats());
    }

    return this.http.get<{ data: SalesStats }>(`${this.baseUrl}`, {
      withCredentials: true
    }).pipe(
      map(response => response.data)
    );
  }

  /**
   * 📊 GRÁFICO DE BARRAS - Ventas por mes
   * Con gradiente dorado brillante
   */
  getSalesChartData(): Observable<ChartConfiguration['data']> {
    return this.getStats().pipe(
      map(stats => ({
        labels: stats.salesByMonth.map(s => s.month),
        datasets: [
          {
            label: 'Ventas Mensuales',
            data: stats.salesByMonth.map(s => s.amount),
            // 🔥 Colores MÁS BRILLANTES
            backgroundColor: 'rgba(255, 215, 0, 0.9)', // Dorado brillante
            borderColor: 'rgba(255, 215, 0, 1)',
            borderWidth: 4,
            borderRadius: 16,
            hoverBackgroundColor: 'rgba(255, 223, 50, 1)',
            hoverBorderColor: 'rgba(255, 255, 255, 0.9)',
            hoverBorderWidth: 5,
            // 🌟 Efectos adicionales
            borderSkipped: false,
          }
        ]
      }))
    );
  }

  /**
   * 🍩 GRÁFICO DE DONA - Top productos
   * Cada producto con color COMPLETAMENTE DIFERENTE
   */
  getTopProductsChartData(): Observable<ChartConfiguration['data']> {
    return this.getStats().pipe(
      map(stats => ({
        labels: stats.topProducts.map(p => p.productName),
        datasets: [
          {
            label: 'Unidades',
            data: stats.topProducts.map(p => p.quantity),
            // 🌈 COLORES ULTRA VIBRANTES Y DIFERENTES
            backgroundColor: [
              'rgba(255, 215, 0, 0.95)',    // Dorado brillante
              'rgba(0, 255, 127, 0.95)',    // Verde neón
              'rgba(30, 144, 255, 0.95)',   // Azul eléctrico
              'rgba(255, 69, 0, 0.95)',     // Rojo-naranja vibrante
              'rgba(186, 85, 211, 0.95)'    // Púrpura intenso
            ],
            borderColor: [
              'rgba(255, 215, 0, 1)',
              'rgba(0, 255, 127, 1)',
              'rgba(30, 144, 255, 1)',
              'rgba(255, 69, 0, 1)',
              'rgba(186, 85, 211, 1)'
            ],
            borderWidth: 4,
            hoverOffset: 25, // 🚀 Efecto MUCHO más grande al pasar el mouse
            hoverBorderWidth: 6,
            hoverBorderColor: 'rgba(255, 255, 255, 1)',
            spacing: 4
          }
        ]
      }))
    );
  }

  /**
   * 📊 GRÁFICO HORIZONTAL - Distribuidores
   * Cada barra con color diferente
   */
  getDistributorsChartData(): Observable<ChartConfiguration['data']> {
    return this.getStats().pipe(
      map(stats => ({
        labels: stats.salesByDistributor.map(d => d.distributorName),
        datasets: [
          {
            label: 'Ventas ($)',
            data: stats.salesByDistributor.map(d => d.totalSales),
            // 🎨 Cada distribuidor con color DIFERENTE
            backgroundColor: [
              'rgba(255, 215, 0, 0.9)',     // Dorado
              'rgba(0, 255, 127, 0.9)',     // Verde neón
              'rgba(30, 144, 255, 0.9)',    // Azul
              'rgba(255, 69, 0, 0.9)'       // Rojo-naranja
            ],
            borderColor: [
              'rgba(255, 215, 0, 1)',
              'rgba(0, 255, 127, 1)',
              'rgba(30, 144, 255, 1)',
              'rgba(255, 69, 0, 1)'
            ],
            borderWidth: 4,
            borderRadius: 12,
            hoverBackgroundColor: [
              'rgba(255, 225, 50, 1)',
              'rgba(50, 255, 150, 1)',
              'rgba(60, 160, 255, 1)',
              'rgba(255, 100, 50, 1)'
            ],
            hoverBorderColor: 'rgba(255, 255, 255, 0.9)',
            hoverBorderWidth: 5
          }
        ]
      }))
    );
  }
}