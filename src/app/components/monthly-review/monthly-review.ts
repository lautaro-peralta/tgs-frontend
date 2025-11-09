import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { ChartConfiguration } from 'chart.js';
import { NgxEchartsModule } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

// Services
import { MonthlyReviewService } from '../../services/monthly-review/monthly-review';
import { PartnerService } from '../../services/partner/partner';
import { SaleService } from '../../services/sale/sale';

// Models
import {
  MonthlyReviewDTO,
  CreateMonthlyReviewDTO,
  PatchMonthlyReviewDTO,
  ReviewStatus
} from '../../models/monthly-review/monthly-review.model';
import { PartnerDTO } from '../../models/partner/partner.model';
import { SaleDTO } from '../../models/sale/sale.model';

// ✅ IMPORTAR COMPONENTE DE CHART
import { ChartComponent } from '../chart/chart';

@Component({
  selector: 'app-monthly-review',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    ChartComponent,
    NgxEchartsModule
  ],
  templateUrl: './monthly-review.html',
  styleUrls: ['./monthly-review.scss'],
})
export class MonthlyReviewComponent implements OnInit {
  private fb  = inject(FormBuilder);
  private srv = inject(MonthlyReviewService);
  private partnerSrv = inject(PartnerService);
  private saleSrv = inject(SaleService);
  private tr  = inject(TranslateService);

  // ✅ FLAG PARA TESTING - Cambia a false cuando tengas datos reales
  private readonly USE_MOCK_CHARTS = false; // Cambiado a false para usar datos reales

  // Estado
  items   = signal<MonthlyReviewDTO[]>([]);
  statistics = signal<any>(null);
  loading = signal(false);
  error   = signal<string | null>(null);
  isNewOpen = signal(false);
  isEdit    = signal(false);

  partners = signal<PartnerDTO[]>([]);
  sales = signal<SaleDTO[]>([]);

  // Filtros
  fYearInput = signal<number>(new Date().getFullYear());
  fYearApplied = signal<number>(new Date().getFullYear());
  fMonthInput = signal<number | null>(null);
  fMonthApplied = signal<number | null>(null);
  fStatusInput = signal<ReviewStatus | null>(null);
  fStatusApplied = signal<ReviewStatus | null>(null);

  // ✅ DATOS PARA GRÁFICOS
  statusChartData = signal<ChartConfiguration['data'] | null>(null);
  reviewsTrendChartData = signal<ChartConfiguration['data'] | null>(null);
  productSalesChartData = signal<ChartConfiguration['data'] | null>(null);
  decisionsImpactChartOptions = signal<EChartsOption | null>(null);
  salesPredictionChartOptions = signal<EChartsOption | null>(null);

  // Para mostrar gráficos incluso sin datos
  showCharts = computed(() => {
    return this.USE_MOCK_CHARTS || (!this.loading() && this.items().length > 0);
  });

  // Para mostrar el gráfico de decisiones SIEMPRE (con mock si es necesario)
  showDecisionsChart = computed(() => !this.loading());

  // Control de gráfico expandido
  expandedChart = signal<'decisions' | 'prediction' | null>(null);

  expandChart(chartType: 'decisions' | 'prediction'): void {
    this.expandedChart.set(chartType);
  }

  closeExpandedChart(): void {
    this.expandedChart.set(null);
  }

  // Formulario
  form = this.fb.group({
    id: this.fb.control<number | null>(null),
    partnerDni: this.fb.control<string>('', [Validators.required, Validators.minLength(6)]),
    reviewDate: this.fb.control<string>(this.todayISO(), [Validators.required]), // ✅ Ahora obligatorio
    status: this.fb.control<ReviewStatus>('PENDING'),
    observations: this.fb.control<string | null>(null),
    recommendations: this.fb.control<string | null>(null),
  });

  ngOnInit(): void {
    this.loadAll();

    // ✅ Si usamos mock, generar gráficos inmediatamente
    if (this.USE_MOCK_CHARTS) {
      this.generateMockCharts();
    }
  }

  filtered = computed(() => {
    const y = this.fYearApplied();
    const m = this.fMonthApplied();
    const s = this.fStatusApplied();
    
    return this.items().filter(it => {
      const matchYear = y ? it.year === y : true;
      const matchMonth = m ? it.month === m : true;
      const matchStatus = s ? it.status === s : true;
      return matchYear && matchMonth && matchStatus;
    });
  });

  toggleNew(): void {
    if (this.isNewOpen()) {
      this.cancel();
      return;
    }

    this.new();
    this.error.set(null);
    this.isNewOpen.set(true);
  }

  cancel(): void {
    this.new();
    this.isNewOpen.set(false);
    this.error.set(null);
  }

  new(): void {
    this.isEdit.set(false);
    this.form.reset({
      id: null,
      partnerDni: '',
      reviewDate: this.todayISO(),
      status: 'PENDING',
      observations: null,
      recommendations: null,
    });
  }

  edit(it: MonthlyReviewDTO): void {
    this.isEdit.set(true);
    const reviewDate = it.reviewDate ? it.reviewDate.substring(0, 10) : this.todayISO();

    this.form.patchValue({
      id: it.id,
      partnerDni: it.reviewedBy?.dni ?? '',
      reviewDate: reviewDate,
      status: it.status,
      observations: it.observations ?? null,
      recommendations: it.recommendations ?? null,
    });
    this.error.set(null);
    this.isNewOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const { id, ...rest } = this.form.getRawValue();

    if (!this.isEdit()) {
      // ✅ Extraer año y mes de la fecha de revisión
      const reviewDate = new Date(rest.reviewDate!);
      const year = reviewDate.getFullYear();
      const month = reviewDate.getMonth() + 1; // getMonth() retorna 0-11

      const payload: CreateMonthlyReviewDTO = {
        year: year,
        month: month,
        partnerDni: rest.partnerDni!,
        ...(rest.reviewDate && rest.reviewDate.trim() !== '' && {
          reviewDate: this.toISODateTime(rest.reviewDate)
        }),
        ...(rest.status && { status: rest.status }),
        ...(rest.observations && rest.observations.trim() !== '' && {
          observations: rest.observations
        }),
        ...(rest.recommendations && rest.recommendations.trim() !== '' && {
          recommendations: rest.recommendations
        }),
      };

      this.srv.create(payload).subscribe({
        next: () => {
          this.cancel();
          this.loadAll();
        },
        error: (e) => {
          const errorMsg = (e?.error?.message ?? this.tr.instant('monthlyReview.errorCreate')) || 'Error al crear';
          this.error.set(errorMsg);
          this.loading.set(false);
        }
      });
    } else {
      const payload: PatchMonthlyReviewDTO = {
        ...(rest.reviewDate && rest.reviewDate.trim() !== '' && {
          reviewDate: this.toISODateTime(rest.reviewDate)
        }),
        ...(rest.status && { status: rest.status }),
        ...(rest.observations !== null && rest.observations !== undefined && {
          observations: rest.observations
        }),
        ...(rest.recommendations !== null && rest.recommendations !== undefined && {
          recommendations: rest.recommendations
        }),
      };

      this.srv.update(id!, payload).subscribe({
        next: () => {
          this.cancel();
          this.loadAll();
        },
        error: (e) => {
          const errorMsg = (e?.error?.message ?? this.tr.instant('monthlyReview.errorSave')) || 'Error al guardar';
          this.error.set(errorMsg);
          this.loading.set(false);
        }
      });
    }
  }

  delete(it: MonthlyReviewDTO): void {
    const msg = this.tr.instant('monthlyReview.confirmDelete') || '¿Eliminar revisión?';
    if (!confirm(msg)) return;

    this.loading.set(true);
    this.srv.delete(it.id).subscribe({
      next: () => { 
        this.loadAll();
      },
      error: (e) => {
        const errorMsg = (e?.error?.message ?? this.tr.instant('monthlyReview.errorDelete')) || 'No se pudo eliminar.';
        this.error.set(errorMsg);
        this.loading.set(false);
      }
    });
  }

  applyFilters(): void {
    this.fYearApplied.set(this.fYearInput());
    this.fMonthApplied.set(this.fMonthInput());
    this.fStatusApplied.set(this.fStatusInput());
    this.loadStatistics();
    
    if (!this.USE_MOCK_CHARTS) {
      this.updateCharts();
    }
  }

  clearFilters(): void {
    const currentYear = new Date().getFullYear();
    this.fYearInput.set(currentYear);
    this.fMonthInput.set(null);
    this.fStatusInput.set(null);
    this.fYearApplied.set(currentYear);
    this.fMonthApplied.set(null);
    this.fStatusApplied.set(null);
    this.loadStatistics();
    
    if (!this.USE_MOCK_CHARTS) {
      this.updateCharts();
    }
  }

  trackById = (_: number, it: MonthlyReviewDTO) => it.id;

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      reviews: this.srv.search(), // Retorna PaginatedResponse<MonthlyReviewDTO>
      partners: this.partnerSrv.list(), // Asume que retorna similar estructura
      sales: this.saleSrv.getAllSales() // Cargar ventas para el gráfico de decisiones
    }).subscribe({
      next: (res) => {
        // ✅ Usar res.reviews.data directamente (ya es array, no tiene .data dentro)
        this.items.set(res.reviews.data ?? []);
        this.partners.set(res.partners.data ?? []);
        this.sales.set(res.sales ?? []);
        this.loading.set(false);

        this.loadStatistics();

        if (!this.USE_MOCK_CHARTS) {
          this.updateCharts();
        }

        // Generar gráfico de decisiones/impacto
        this.generateDecisionsImpactChart();
        // Generar gráfico de predicción de ventas
        this.generateSalesPredictionChart();
      },
      error: (e) => {
        const errorMsg = e?.error?.message || 'Error al cargar datos';
        this.error.set(errorMsg);
        this.loading.set(false);

        // Generar gráfico de decisiones con datos mock si hay error
        this.generateDecisionsImpactChart();
        // Generar gráfico de predicción con datos mock si hay error
        this.generateSalesPredictionChart();
      }
    });
  }

  totalReviews = computed(() => this.items().length);
  
  reviewsByStatus = computed(() => {
    const byStatus: Record<ReviewStatus, number> = {
      PENDING: 0,
      IN_REVIEW: 0,
      COMPLETED: 0,
      APPROVED: 0,
      REJECTED: 0
    };
    this.items().forEach(r => {
      if (r.status && byStatus.hasOwnProperty(r.status)) {
        byStatus[r.status]++;
      }
    });
    return byStatus;
  });

  private loadStatistics(): void {
    const year = this.fYearApplied();
    const month = this.fMonthApplied() ?? undefined;

    if (!year || isNaN(year) || year < 2000) {
      this.statistics.set(null);
      return;
    }

    this.srv.statistics({ year, month, groupBy: 'product' }).subscribe({
      next: (res) => {
        this.statistics.set(res.data);
      },
      error: (e) => {
        console.error('Error loading statistics:', e);
        this.statistics.set(null);
      }
    });
  }

  // ✅ GENERAR GRÁFICOS CON DATOS MOCK
  private generateMockCharts(): void {
    console.log('📊 Generando gráficos MOCK para demostración');
    
    // Mock: Distribución por estado
    this.statusChartData.set({
      labels: ['Pendiente', 'En Revisión', 'Completado', 'Aprobado', 'Rechazado'],
      datasets: [{
        label: 'Revisiones',
        data: [12, 8, 15, 22, 5],
        backgroundColor: [
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(107, 114, 128, 0.8)',
          'rgba(74, 141, 114, 0.8)',
          'rgba(169, 69, 69, 0.8)'
        ],
        borderColor: [
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(107, 114, 128, 1)',
          'rgba(74, 141, 114, 1)',
          'rgba(169, 69, 69, 1)'
        ],
        borderWidth: 2,
        hoverOffset: 8
      }]
    });

    // Mock: Tendencia por mes
    this.reviewsTrendChartData.set({
      labels: ['Enero 2025', 'Febrero 2025', 'Marzo 2025', 'Abril 2025', 'Mayo 2025', 'Junio 2025'],
      datasets: [{
        label: 'Revisiones por Mes',
        data: [8, 12, 10, 15, 14, 18],
        backgroundColor: 'rgba(195, 164, 98, 0.2)',
        borderColor: 'rgba(195, 164, 98, 1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(195, 164, 98, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    });

    // Mock: Productos top
    this.productSalesChartData.set({
      labels: ['Antiparras', 'Botella', 'Vaso', 'Papel', 'Teclado', 'Mouse', 'Monitor', 'Teclado RGB'],
      datasets: [{
        label: 'Monto de Ventas ($)',
        data: [160000, 60000, 40000, 5000, 3000, 25000, 85000, 42000],
        backgroundColor: 'rgba(195, 164, 98, 0.8)',
        borderColor: 'rgba(195, 164, 98, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    });
  }

  // ✅ GENERAR DATOS REALES PARA GRÁFICOS
  private updateCharts(): void {
    this.updateStatusChart();
    this.updateReviewsTrendChart();
    this.updateProductSalesChart();
  }

  private updateStatusChart(): void {
    const statusData = this.reviewsByStatus();
    
    this.statusChartData.set({
      labels: ['Pendiente', 'En Revisión', 'Completado', 'Aprobado', 'Rechazado'],
      datasets: [{
        label: 'Revisiones',
        data: [
          statusData.PENDING,
          statusData.IN_REVIEW,
          statusData.COMPLETED,
          statusData.APPROVED,
          statusData.REJECTED
        ],
        backgroundColor: [
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(107, 114, 128, 0.8)',
          'rgba(74, 141, 114, 0.8)',
          'rgba(169, 69, 69, 0.8)'
        ],
        borderColor: [
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(107, 114, 128, 1)',
          'rgba(74, 141, 114, 1)',
          'rgba(169, 69, 69, 1)'
        ],
        borderWidth: 2,
        hoverOffset: 8
      }]
    });
  }

  private updateReviewsTrendChart(): void {
    const filtered = this.filtered();
    
    const byMonth = new Map<string, number>();
    filtered.forEach(review => {
      const key = `${review.year}-${String(review.month).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) || 0) + 1);
    });

    const sorted = Array.from(byMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    this.reviewsTrendChartData.set({
      labels: sorted.map(([key]) => {
        const [year, month] = key.split('-');
        return `${this.getMonthName(parseInt(month))} ${year}`;
      }),
      datasets: [{
        label: 'Revisiones por Mes',
        data: sorted.map(([, count]) => count),
        backgroundColor: 'rgba(195, 164, 98, 0.2)',
        borderColor: 'rgba(195, 164, 98, 1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(195, 164, 98, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    });
  }

  private updateProductSalesChart(): void {
    const stats = this.statistics();
    
    // ✅ Verificar si hay groupedData y si tiene elementos
    if (!stats || !stats.groupedData || stats.groupedData.length === 0) {
      this.productSalesChartData.set(null);
      return;
    }

    // Tomar top 10 productos y ordenar por totalAmount
    const topProducts = [...stats.groupedData]
      .sort((a: any, b: any) => (b.totalAmount || 0) - (a.totalAmount || 0))
      .slice(0, 10);

    this.productSalesChartData.set({
      labels: topProducts.map((p: any) => {
        // Prioridad: productName > nombre del producto > ID
        return p.productName || p.name || `Producto ${p.productId || p.id}`;
      }),
      datasets: [{
        label: 'Monto de Ventas ($)',
        data: topProducts.map((p: any) => p.totalAmount || 0),
        backgroundColor: 'rgba(195, 164, 98, 0.8)',
        borderColor: 'rgba(195, 164, 98, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    });
  }

  private todayISO(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  private toISODateTime(dateStr: string): string {
    if (dateStr.includes('T')) return dateStr;
    
    const date = new Date(dateStr + 'T12:00:00.000Z');
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    
    return dateStr + 'T12:00:00.000Z';
  }

  private getMonthName(month: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1] || '';
  }

  formatCurrency(value: number | undefined): string {
    if (value === undefined || value === null) return '$0.00';
    return `$${value.toFixed(2)}`;
  }

  // 📊 Generar gráfico de impacto de decisiones en ventas
  private generateDecisionsImpactChart(): void {
    console.log('🎨 Generando gráfico de decisiones...');
    const salesData = this.sales();
    console.log('📊 Sales data:', salesData?.length || 0, 'ventas');

    // Datos mock más realistas con variaciones
    const mockData = [
      { month: 'Enero 2025', amount: 185000 },
      { month: 'Febrero 2025', amount: 195000 },
      { month: 'Marzo 2025', amount: 240000 },  // ⬆️ Impacto positivo de Decisión X
      { month: 'Abril 2025', amount: 265000 },
      { month: 'Mayo 2025', amount: 220000 },
      { month: 'Junio 2025', amount: 310000 },  // ⬆️ Impacto positivo de Decisión Y
      { month: 'Julio 2025', amount: 340000 },
      { month: 'Agosto 2025', amount: 360000 },
      { month: 'Septiembre 2025', amount: 385000 },
      { month: 'Octubre 2025', amount: 410000 },
      { month: 'Noviembre 2025', amount: 395000 },
      { month: 'Diciembre 2025', amount: 450000 }
    ];

    let salesByMonth: { month: string; amount: number }[];

    // Si no hay datos reales O hay menos de 3 meses de datos, usar MOCK
    if (!salesData || salesData.length === 0) {
      console.log('📊 Usando datos MOCK (no hay ventas)');
      salesByMonth = mockData;
    } else {
      const realData = this.groupSalesByMonthForChart(salesData);
      if (realData.length < 3) {
        console.log('📊 Usando datos MOCK (menos de 3 meses de datos reales)');
        salesByMonth = mockData;
      } else {
        console.log('📊 Usando datos reales:', realData.length, 'meses');
        salesByMonth = realData;
      }
    }

    // Mock de decisiones - En producción, estas vendrían del backend
    const decisions = [
      { name: 'Revisión Enero', monthIndex: 0, description: 'Análisis inicial de mercado y planificación anual' },
      { name: 'Decisión X', monthIndex: 2, description: 'Expansión de línea de productos premium' },
      { name: 'Decisión Y', monthIndex: 5, description: 'Nueva estrategia de precios y marketing digital' }
    ];

    // 📈 ECharts: Impacto de Decisiones en Ventas
    const decisionsImpactChart: EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        borderColor: 'rgba(195, 164, 98, 0.6)',
        borderWidth: 2,
        textStyle: { color: '#fff', fontSize: 14 },
        confine: true,
        enterable: false,
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: 'rgba(195, 164, 98, 0.5)',
            type: 'dashed'
          }
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';

          const data = params[0];
          const value = typeof data.value === 'number' ? Math.round(data.value) : data.value;
          return `<b>${data.name}</b><br/>Ventas: <span style="color: #c3a462; font-weight: bold;">$${value.toLocaleString('es-AR')}</span>`;
        }
      },
      grid: {
        left: '8%',
        right: '8%',
        bottom: '12%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: salesByMonth.map(s => s.month),
        boundaryGap: false,
        axisLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.3)' }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: 11,
          fontWeight: 500,
          rotate: 0
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: 'Ventas',
        nameTextStyle: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 12,
          padding: [0, 0, 0, 0]
        },
        axisLine: { show: false },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.08)',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
            return `$${value}`;
          }
        }
      },
      series: [{
        name: 'Ventas',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        sampling: 'lttb',
        itemStyle: {
          color: '#c3a462',
          borderColor: '#fff',
          borderWidth: 1
        },
        lineStyle: {
          color: '#c3a462',
          width: 3
        },
        areaStyle: {
          color: 'rgba(195, 164, 98, 0.2)'
        },
        emphasis: {
          disabled: true
        },
        data: salesByMonth.map(s => s.amount),
        markLine: {
          silent: true,
          symbol: 'none',
          animation: false,
          lineStyle: {
            color: 'rgba(59, 130, 246, 0.8)',
            type: 'dashed',
            width: 2
          },
          label: {
            show: true,
            position: 'insideEndTop',
            formatter: '{b}',
            fontSize: 10,
            fontWeight: 'bold',
            color: '#fff',
            backgroundColor: 'rgba(59, 130, 246, 0.9)',
            padding: [4, 8],
            borderRadius: 4
          },
          emphasis: {
            disabled: true
          },
          data: decisions.filter(d => d.monthIndex < salesByMonth.length).map(decision => ({
            name: decision.name,
            xAxis: decision.monthIndex,
            label: {
              formatter: `{b}\n📌`,
              fontSize: 10,
              fontWeight: 'bold'
            }
          }))
        },
        markPoint: {
          symbol: 'pin',
          symbolSize: 45,
          animation: false,
          itemStyle: {
            color: 'rgba(255, 69, 0, 0.9)',
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false
          },
          emphasis: {
            disabled: true
          },
          data: decisions.filter(d => d.monthIndex < salesByMonth.length).map(decision => ({
            name: decision.name,
            xAxis: decision.monthIndex,
            yAxis: salesByMonth[decision.monthIndex]?.amount || 0,
            value: decision.description || ''
          }))
        }
      }]
    };

    console.log('✅ Gráfico de decisiones generado con', salesByMonth.length, 'meses y', decisions.length, 'decisiones');
    this.decisionsImpactChartOptions.set(decisionsImpactChart);
  }

  private groupSalesByMonthForChart(sales: SaleDTO[]): { month: string; amount: number }[] {
    const monthMap = new Map<string, number>();

    sales.forEach(sale => {
      const date = new Date(sale.saleDate || sale.date || Date.now());
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      const saleTotal = this.calculateTotal(sale);
      const currentAmount = monthMap.get(monthKey) || 0;

      monthMap.set(monthKey, currentAmount + saleTotal);
    });

    const result = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, amount]) => {
        const [year, monthNum] = key.split('-');
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return {
          month: `${monthNames[parseInt(monthNum)]} ${year}`,
          amount
        };
      });

    return result;
  }

  private calculateTotal(sale: SaleDTO): number {
    if (typeof sale.saleAmount === 'number') return sale.saleAmount;
    if (typeof sale.amount === 'number') return sale.amount;
    if (typeof (sale as any).total === 'number') return (sale as any).total;

    if (sale.details && sale.details.length) {
      return sale.details.reduce((sum, d) => {
        const sub = (d as any).subtotal;
        if (typeof sub === 'number') return sum + sub;
        const price = (d as any).price || 0;
        const quantity = Number(d.quantity) || 0;
        return sum + (price * quantity);
      }, 0);
    }

    return 0;
  }

  // 📊 Generar gráfico de predicción de ventas con regresión lineal
  private generateSalesPredictionChart(): void {
    console.log('🔮 Generando gráfico de predicción de ventas...');
    const salesData = this.sales();

    // Datos mock para cuando no hay datos reales
    const mockData = [
      { month: 'Enero 2025', amount: 185000 },
      { month: 'Febrero 2025', amount: 210000 },
      { month: 'Marzo 2025', amount: 235000 },
      { month: 'Abril 2025', amount: 265000 },
      { month: 'Mayo 2025', amount: 290000 },
      { month: 'Junio 2025', amount: 315000 },
      { month: 'Julio 2025', amount: 340000 },
      { month: 'Agosto 2025', amount: 365000 },
      { month: 'Septiembre 2025', amount: 390000 }
    ];

    let historicalData: { month: string; amount: number }[];

    // Usar datos mock si no hay datos reales o hay menos de 4 meses
    if (!salesData || salesData.length === 0) {
      console.log('📊 Usando datos MOCK para predicción (no hay ventas)');
      historicalData = mockData;
    } else {
      const realData = this.groupSalesByMonthForChart(salesData);
      if (realData.length < 4) {
        console.log('📊 Usando datos MOCK para predicción (menos de 4 meses de datos)');
        historicalData = mockData;
      } else {
        console.log('📊 Usando datos reales para predicción:', realData.length, 'meses');
        historicalData = realData;
      }
    }

    // ==================== MÉTODOS CIENTÍFICOS DE PREDICCIÓN ====================

    const n = historicalData.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = historicalData.map(d => d.amount);

    // 1️⃣ REGRESIÓN LINEAL: y = mx + b
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const b = (sumY - m * sumX) / n;

    // 2️⃣ COEFICIENTE DE DETERMINACIÓN (R²)
    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => sum + Math.pow(yi - (m * x[i] + b), 2), 0);
    const r2 = 1 - (ssResidual / ssTotal);
    const r2Percentage = (r2 * 100).toFixed(1);

    // 3️⃣ MEDIA MÓVIL EXPONENCIAL (EMA) - para suavizado
    const alpha = 0.3; // Factor de suavizado
    let ema = y[0];
    const emaValues: number[] = [ema];
    for (let i = 1; i < n; i++) {
      ema = alpha * y[i] + (1 - alpha) * ema;
      emaValues.push(ema);
    }

    // 4️⃣ DESVIACIÓN ESTÁNDAR - para intervalos de confianza
    const stdDev = Math.sqrt(ssResidual / (n - 2));
    const confidenceLevel = 1.96; // 95% de confianza

    // 5️⃣ CRECIMIENTO PROMEDIO (para método alternativo)
    const growthRates: number[] = [];
    for (let i = 1; i < n; i++) {
      if (y[i - 1] !== 0) {
        growthRates.push((y[i] - y[i - 1]) / y[i - 1]);
      }
    }
    const avgGrowthRate = growthRates.length > 0
      ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
      : 0;

    // ==================== GENERAR PREDICCIONES CIENTÍFICAS ====================

    const predictionMonths = 6;
    const predictions: { month: string; amount: number; upperBound: number; lowerBound: number }[] = [];
    const lastDate = this.getLastMonthDate(historicalData);
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    for (let i = 1; i <= predictionMonths; i++) {
      // Predicción por regresión lineal
      const linearPrediction = m * (n + i - 1) + b;

      // Predicción por crecimiento exponencial
      const lastValue = y[n - 1];
      const exponentialPrediction = lastValue * Math.pow(1 + avgGrowthRate, i);

      // Predicción ponderada (70% lineal, 30% exponencial)
      let finalPrediction = 0.7 * linearPrediction + 0.3 * exponentialPrediction;
      finalPrediction = Math.max(0, finalPrediction);

      // Intervalos de confianza (95%)
      const margin = confidenceLevel * stdDev * Math.sqrt(1 + 1/n + Math.pow(n + i - 1 - meanY, 2) / sumX2);
      const upperBound = Math.max(0, finalPrediction + margin);
      const lowerBound = Math.max(0, finalPrediction - margin);

      const nextMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1);

      predictions.push({
        month: `${monthNames[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`,
        amount: Math.round(finalPrediction),
        upperBound: Math.round(upperBound),
        lowerBound: Math.round(lowerBound)
      });
    }

    // Combinar datos históricos y predicciones
    const allMonths = [...historicalData.map(d => d.month), ...predictions.map(p => p.month)];
    const historicalAmounts = historicalData.map(d => d.amount);
    const predictedAmounts = Array(historicalData.length).fill(null).concat(predictions.map(p => p.amount));

    // Intervalos de confianza
    const upperBounds = Array(historicalData.length).fill(null).concat(predictions.map(p => p.upperBound));
    const lowerBounds = Array(historicalData.length).fill(null).concat(predictions.map(p => p.lowerBound));

    // Línea de tendencia (regresión lineal)
    const trendLine = x.concat(Array.from({ length: predictionMonths }, (_, i) => n + i))
      .map(xi => m * xi + b);

    // 📈 ECharts: Predicción de Ventas con Regresión Lineal - VERSIÓN PRO
    const predictionChart: EChartsOption = {
      backgroundColor: 'transparent',
      animationDuration: 1500,
      animationEasing: 'cubicOut',
      title: {
        text: this.tr.instant('monthlyReview.charts.prediction.title'),
        subtext: this.tr.instant('monthlyReview.charts.prediction.subtitle', {
          linear: '70',
          exponential: '30',
          r2: r2Percentage,
          confidence: '95'
        }),
        left: 'center',
        top: 10,
        textStyle: {
          color: 'rgba(255, 255, 255, 0.95)',
          fontSize: 16,
          fontWeight: 700
        },
        subtextStyle: {
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: 11,
          fontWeight: 500
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.98)',
        borderColor: 'rgba(195, 164, 98, 0.8)',
        borderWidth: 2,
        padding: [12, 16],
        textStyle: {
          color: '#fff',
          fontSize: 13,
          lineHeight: 20
        },
        confine: true,
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: 'rgba(195, 164, 98, 0.6)',
            width: 1,
            type: 'dashed'
          },
          lineStyle: {
            color: 'rgba(195, 164, 98, 0.6)',
            width: 2,
            type: 'dashed'
          },
          label: {
            backgroundColor: 'rgba(195, 164, 98, 0.9)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 'bold',
            padding: [4, 8],
            borderRadius: 4
          }
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';

          const month = params[0].name;
          const dataIndex = params[0].dataIndex;
          const isHistorical = dataIndex < historicalData.length;

          const seriesNames = {
            historical: this.tr.instant('monthlyReview.charts.prediction.series.historical'),
            prediction: this.tr.instant('monthlyReview.charts.prediction.series.prediction'),
            trend: this.tr.instant('monthlyReview.charts.prediction.series.trend')
          };

          let content = `<div style="min-width: 200px;">`;
          content += `<div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(195, 164, 98, 0.3);">`;
          content += `📅 ${month}`;
          if (!isHistorical) {
            content += ` <span style="background: rgba(96, 165, 250, 0.3); color: #60a5fa; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">${this.tr.instant('monthlyReview.charts.prediction.tooltip.prediction')}</span>`;
          }
          content += `</div>`;

          params.forEach((p: any) => {
            if (p.value === null) return;

            if (p.seriesName === seriesNames.historical) {
              const val = Math.round(p.value);
              content += `<div style="margin: 6px 0; display: flex; align-items: center; justify-content: space-between;">`;
              content += `<span style="color: rgba(195, 164, 98, 1);"><b>📊 ${this.tr.instant('monthlyReview.charts.prediction.tooltip.real')}</b></span>`;
              content += `<span style="color: #c3a462; font-weight: bold; font-size: 16px;">$${val.toLocaleString('es-AR')}</span>`;
              content += `</div>`;
            }

            if (p.seriesName === seriesNames.prediction) {
              const val = Math.round(p.value);
              content += `<div style="margin: 6px 0; display: flex; align-items: center; justify-content: space-between;">`;
              content += `<span style="color: rgba(96, 165, 250, 1);"><b>🔮 ${this.tr.instant('monthlyReview.charts.prediction.tooltip.projected')}</b></span>`;
              content += `<span style="color: #60a5fa; font-weight: bold; font-size: 16px;">$${val.toLocaleString('es-AR')}</span>`;
              content += `</div>`;
            }

            if (p.seriesName === seriesNames.trend) {
              const val = Math.round(p.value);
              content += `<div style="margin: 6px 0; display: flex; align-items: center; justify-content: space-between;">`;
              content += `<span style="color: rgba(255, 99, 132, 0.8);"><b>📈 ${this.tr.instant('monthlyReview.charts.prediction.tooltip.trend')}</b></span>`;
              content += `<span style="color: rgba(255, 99, 132, 0.8); font-weight: bold;">$${val.toLocaleString('es-AR')}</span>`;
              content += `</div>`;
            }
          });

          // Intervalos de confianza para predicciones
          if (!isHistorical && dataIndex < allMonths.length) {
            const upper = upperBounds[dataIndex];
            const lower = lowerBounds[dataIndex];
            if (upper && lower) {
              content += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(195, 164, 98, 0.2); font-size: 11px; color: rgba(147, 197, 253, 0.8);">`;
              content += `<div style="margin: 2px 0;">📊 <b>${this.tr.instant('monthlyReview.charts.prediction.tooltip.confidence')}:</b></div>`;
              content += `<div style="margin-left: 16px;">${this.tr.instant('monthlyReview.charts.prediction.tooltip.max')}: $${upper.toLocaleString('es-AR')}</div>`;
              content += `<div style="margin-left: 16px;">${this.tr.instant('monthlyReview.charts.prediction.tooltip.min')}: $${lower.toLocaleString('es-AR')}</div>`;
              content += `</div>`;
            }
          }

          // Agregar variación porcentual si hay datos históricos y predicción
          const historicalValue = params.find((p: any) => p.seriesName === seriesNames.historical)?.value;
          const predictionValue = params.find((p: any) => p.seriesName === seriesNames.prediction)?.value;

          if (historicalValue && predictionValue) {
            const change = ((predictionValue - historicalValue) / historicalValue * 100).toFixed(1);
            const changeColor = parseFloat(change) >= 0 ? '#10b981' : '#ef4444';
            const arrow = parseFloat(change) >= 0 ? '↗' : '↘';
            content += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(195, 164, 98, 0.2); color: ${changeColor}; font-size: 12px;">`;
            content += `${arrow} ${this.tr.instant('monthlyReview.charts.prediction.tooltip.variation')}: <b>${change}%</b>`;
            content += `</div>`;
          }

          return content + '</div>';
        }
      },
      legend: {
        data: [
          this.tr.instant('monthlyReview.charts.prediction.series.historical'),
          this.tr.instant('monthlyReview.charts.prediction.series.prediction'),
          this.tr.instant('monthlyReview.charts.prediction.series.trend')
        ],
        top: 55,
        textStyle: {
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: 13,
          fontWeight: 500
        },
        itemGap: 25,
        itemWidth: 30,
        itemHeight: 14,
        icon: 'roundRect',
        inactiveColor: 'rgba(255, 255, 255, 0.2)'
      },
      grid: {
        left: '6%',
        right: '6%',
        bottom: '15%',
        top: '25%',
        containLabel: true
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          start: 0,
          end: 100,
          height: 25,
          bottom: '5%',
          handleSize: '110%',
          handleStyle: {
            color: '#c3a462',
            borderColor: '#fff',
            borderWidth: 2,
            shadowBlur: 6,
            shadowColor: 'rgba(195, 164, 98, 0.5)'
          },
          dataBackground: {
            lineStyle: {
              color: 'rgba(195, 164, 98, 0.3)'
            },
            areaStyle: {
              color: 'rgba(195, 164, 98, 0.1)'
            }
          },
          selectedDataBackground: {
            lineStyle: {
              color: '#c3a462'
            },
            areaStyle: {
              color: 'rgba(195, 164, 98, 0.3)'
            }
          },
          fillerColor: 'rgba(195, 164, 98, 0.15)',
          borderColor: 'rgba(195, 164, 98, 0.3)',
          textStyle: {
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: 11
          }
        },
        {
          type: 'inside',
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false
        }
      ],
      xAxis: {
        type: 'category',
        data: allMonths,
        boundaryGap: false,
        axisLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.3)' }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: 10,
          fontWeight: 500,
          rotate: 45,
          interval: 'auto',
          formatter: (value: string) => {
            const parts = value.split(' ');
            if (parts.length === 2) {
              const month = parts[0].substring(0, 3);
              const year = parts[1].substring(2);
              return `${month} '${year}`;
            }
            return value;
          }
        },
        axisTick: { show: false },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: this.tr.instant('monthlyReview.charts.prediction.sales'),
        nameTextStyle: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 12
        },
        axisLine: { show: false },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.08)',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
            return `$${value}`;
          }
        }
      },
      series: [
        {
          name: this.tr.instant('monthlyReview.charts.prediction.series.historical'),
          type: 'line',
          smooth: true,
          showSymbol: false,
          symbol: 'emptyCircle',
          symbolSize: 10,
          z: 10,
          itemStyle: {
            color: '#c3a462',
            borderColor: '#fff',
            borderWidth: 3
          },
          lineStyle: {
            color: '#c3a462',
            width: 4,
            shadowColor: 'rgba(195, 164, 98, 0.5)',
            shadowBlur: 10,
            shadowOffsetY: 5
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(195, 164, 98, 0.4)' },
                { offset: 0.5, color: 'rgba(195, 164, 98, 0.2)' },
                { offset: 1, color: 'rgba(195, 164, 98, 0.05)' }
              ]
            }
          },
          emphasis: {
            focus: 'series',
            scale: true,
            itemStyle: {
              color: '#ffd700',
              borderColor: '#fff',
              borderWidth: 4,
              shadowBlur: 20,
              shadowColor: 'rgba(255, 215, 0, 0.8)'
            },
            lineStyle: {
              width: 5
            }
          },
          markPoint: {
            symbol: 'pin',
            symbolSize: 50,
            label: {
              show: true,
              formatter: '{c}',
              color: '#fff',
              fontSize: 11,
              fontWeight: 'bold'
            },
            itemStyle: {
              color: '#c3a462',
              borderColor: '#fff',
              borderWidth: 2
            },
            data: [
              { type: 'max', name: this.tr.instant('monthlyReview.charts.prediction.markers.maximum') },
              { type: 'min', name: this.tr.instant('monthlyReview.charts.prediction.markers.minimum') }
            ]
          },
          data: historicalAmounts
        },
        {
          name: this.tr.instant('monthlyReview.charts.prediction.series.prediction'),
          type: 'line',
          smooth: true,
          showSymbol: false,
          symbol: 'diamond',
          symbolSize: 12,
          z: 10,
          itemStyle: {
            color: '#60a5fa',
            borderColor: '#fff',
            borderWidth: 3
          },
          lineStyle: {
            color: '#60a5fa',
            width: 4,
            type: [8, 4],
            dashOffset: 5,
            shadowColor: 'rgba(96, 165, 250, 0.5)',
            shadowBlur: 10,
            shadowOffsetY: 5
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(96, 165, 250, 0.35)' },
                { offset: 0.5, color: 'rgba(96, 165, 250, 0.18)' },
                { offset: 1, color: 'rgba(96, 165, 250, 0.05)' }
              ]
            }
          },
          emphasis: {
            focus: 'series',
            scale: true,
            itemStyle: {
              color: '#3b82f6',
              borderColor: '#fff',
              borderWidth: 4,
              shadowBlur: 20,
              shadowColor: 'rgba(59, 130, 246, 0.8)'
            },
            lineStyle: {
              width: 5
            }
          },
          markLine: {
            symbol: 'none',
            silent: true,
            lineStyle: {
              color: 'rgba(96, 165, 250, 0.4)',
              width: 2,
              type: 'solid'
            },
            label: {
              show: true,
              position: 'insideEndTop',
              formatter: this.tr.instant('monthlyReview.charts.prediction.markers.predictionStart'),
              color: '#60a5fa',
              fontSize: 11,
              fontWeight: 'bold',
              backgroundColor: 'rgba(96, 165, 250, 0.2)',
              padding: [4, 8],
              borderRadius: 4
            },
            data: [
              { xAxis: historicalData.length - 1 }
            ]
          },
          data: predictedAmounts
        },
        {
          name: this.tr.instant('monthlyReview.charts.prediction.series.trend'),
          type: 'line',
          smooth: false,
          symbol: 'none',
          z: 5,
          lineStyle: {
            color: 'rgba(255, 99, 132, 0.7)',
            width: 2,
            type: [4, 4]
          },
          emphasis: {
            lineStyle: {
              color: 'rgba(255, 99, 132, 0.9)',
              width: 3
            }
          },
          data: trendLine
        }
      ]
    };

    console.log(`✅ Gráfico de predicción científica generado:`);
    console.log(`   📊 ${historicalData.length} meses históricos + ${predictions.length} meses predichos`);
    console.log(`   📐 Regresión Lineal: y = ${m.toFixed(3)}x + ${b.toFixed(2)}`);
    console.log(`   📈 R² (Bondad de ajuste): ${r2Percentage}%`);
    console.log(`   📉 Tasa de crecimiento promedio: ${(avgGrowthRate * 100).toFixed(2)}%`);
    console.log(`   🎯 Desviación estándar: ${stdDev.toFixed(2)}`);
    console.log(`   📋 Datos históricos:`, historicalAmounts);
    console.log(`   📋 Predicciones:`, predictedAmounts);
    console.log(`   📋 Límites superiores:`, upperBounds);
    console.log(`   📋 Límites inferiores:`, lowerBounds);

    this.salesPredictionChartOptions.set(predictionChart);
  }

  // Helper para obtener la fecha del último mes en el historial
  private getLastMonthDate(data: { month: string; amount: number }[]): Date {
    if (data.length === 0) {
      return new Date();
    }

    const lastMonth = data[data.length - 1].month;
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const parts = lastMonth.split(' ');
    const monthName = parts[0];
    const year = parseInt(parts[1]);
    const monthIndex = monthNames.indexOf(monthName);

    return new Date(year, monthIndex, 1);
  }
}