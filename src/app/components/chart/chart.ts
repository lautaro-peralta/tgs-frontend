// src/app/components/chart/chart.component.ts

import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Chart,
  ChartConfiguration,
  ChartType,
  registerables
} from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container" [style.height]="height">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      width: 100%;
      padding: 12px;
    }

    canvas {
      display: block;
      max-width: 100%;
    }
  `]
})
export class ChartComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() type: ChartType = 'bar';
  @Input() data!: ChartConfiguration['data'];
  @Input() options?: ChartConfiguration['options'];
  @Input() height: string = '400px';

  private chart?: Chart;

  ngOnInit(): void {
    // Opciones por defecto con el tema oscuro mejorado
    this.options = {
      ...this.getDefaultOptions(),
      ...this.options
    };
  }

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.chart && (changes['data'] || changes['options'])) {
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private createChart(): void {
    if (!this.chartCanvas?.nativeElement) {
      console.error('Canvas element not found');
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return;
    }

    try {
      this.chart = new Chart(ctx, {
        type: this.type,
        data: this.data,
        options: this.options
      });
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  }

  private updateChart(): void {
    if (!this.chart) return;

    this.chart.data = this.data;
    if (this.options) {
      this.chart.options = this.options;
    }
    this.chart.update();
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }
  }

  private getDefaultOptions(): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#f3f4f6',
            font: {
              family: "'Google Sans Code', 'Montserrat', sans-serif",
              size: 13,
              weight: 'bold' as any
            },
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 12,
            boxHeight: 12
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#f9fafb',
          bodyColor: '#e5e7eb',
          borderColor: 'rgba(195, 164, 98, 0.5)',
          borderWidth: 2,
          padding: 16,
          cornerRadius: 10,
          displayColors: true,
          boxWidth: 12,
          boxHeight: 12,
          boxPadding: 8,
          titleFont: {
            family: "'Google Sans Code', sans-serif",
            size: 15,
            weight: 'bold' as any
          },
          bodyFont: {
            family: "'Google Sans Code', sans-serif",
            size: 13,
            weight: 'normal' as any
          },
          callbacks: {
            label: (context) => {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency: 'ARS'
                }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      },
      scales: this.type !== 'pie' && this.type !== 'doughnut' ? {
        x: {
          border: {
            display: false
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            lineWidth: 1
          },
          ticks: {
            color: '#d1d5db',
            font: {
              family: "'Google Sans Code', sans-serif",
              size: 11,
              weight: 600
            },
            padding: 8
          }
        },
        y: {
          border: {
            display: false
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.08)',
            lineWidth: 1
          },
          ticks: {
            color: '#d1d5db',
            font: {
              family: "'Google Sans Code', sans-serif",
              size: 11,
              weight: 600
            },
            padding: 8,
            callback: function(value) {
              return new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
                minimumFractionDigits: 0
              }).format(value as number);
            }
          },
          beginAtZero: true
        }
      } : undefined
    };
  }
}