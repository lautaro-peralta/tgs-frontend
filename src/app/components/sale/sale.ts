import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, Validators, FormGroup, FormControl
} from '@angular/forms';

import { SaleService } from '../../services/sale/sale';
import { ProductService } from '../../services/product/product';
import { ClientService } from '../../services/client/client';
import { StatsService, SalesStats } from '../../services/stats/stats';
import { AuthService } from '../../services/auth/auth';
import { Role } from '../../models/user/user.model';

import {
  SaleDTO, CreateSaleDTO, ApiResponse as ApiSaleResp, SaleDetailDTO, SaleClientDTO
} from '../../models/sale/sale.model';
import { ProductDTO, ApiResponse as ApiProdResp } from '../../models/product/product.model';
import { ClientDTO, ApiResponse as ApiCliResp } from '../../models/client/client.model';

import { forkJoin } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { NgxEchartsModule } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

type SaleForm = {
  id: FormControl<number | null>;
  clientDni: FormControl<string | null>;
  productId: FormControl<number | null>;
  quantity: FormControl<number>;
};

type ProductOffer = {
  productId: number;
  description: string;
  price: number;
  stock: number;
  distributorDni: string;
  distributorName: string;
  zoneName?: string;
};

type Line = {
  productId: number | null;
  distributorDni: string | null;
  quantity: number;
  filter?: string
};

interface DistributorDTO {
  dni: string;
  name: string;
}

@Component({
  selector: 'app-sale',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    NgxEchartsModule
  ],
  templateUrl: './sale.html',
  styleUrls: ['./sale.scss'],
})
export class SaleComponent implements OnInit {
  // --- Inyección ---
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private saleSrv = inject(SaleService);
  private prodSrv = inject(ProductService);
  private cliSrv = inject(ClientService);
  private t = inject(TranslateService);
  private statsSrv = inject(StatsService);
  private authService = inject(AuthService);

  // --- Estado base ---
  sales = signal<SaleDTO[]>([]);
  products = signal<ProductDTO[]>([]);
  clients = signal<ClientDTO[]>([]);
  distributors = signal<DistributorDTO[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  submitted = signal(false);

  // --- Filas expandidas ---
  private expandedSalesSet = signal<Set<number>>(new Set());
  isSaleExpanded = (saleId: number) => this.expandedSalesSet().has(saleId);
  toggleSaleExpanded(saleId: number) {
    const set = new Set(this.expandedSalesSet());
    if (set.has(saleId)) set.delete(saleId); else set.add(saleId);
    this.expandedSalesSet.set(set);
  }

  // --- Usuario y roles ---
  currentUser = this.authService.user;
  isAdmin = computed(() => this.authService.hasRole(Role.ADMIN));
  isDistributor = computed(() => this.authService.hasRole(Role.DISTRIBUTOR));
  isAuthority = computed(() => this.authService.hasRole(Role.AUTHORITY));

  // Permisos específicos por rol
  canCreate = computed(() => this.isAdmin() || this.isDistributor());  // Admin y Distribuidor pueden crear ventas
  currentUserDni = computed(() => {
    const user = this.currentUser();
    const dni = (user as any)?.person?.dni;
    console.log('[SaleComponent] 🔍 Current user DNI:', {
      hasUser: !!user,
      hasPerson: !!(user as any)?.person,
      dni: dni,
      username: user?.username,
      roles: user?.roles
    });
    return dni;
  });

  // --- Stats y Charts ---
  stats = signal<SalesStats | null>(null);
  loadingStats = signal(false);
  showStats = signal(false);

  salesChartOptions = signal<EChartsOption | null>(null);
  topProductsChartOptions = signal<EChartsOption | null>(null);
  distributorsChartOptions = signal<EChartsOption | null>(null);

  // --- Filtros de listado ---
  fTextInput = signal('');
  fTextApplied = signal('');
  fClientDniInput = signal('');
  fClientDniApplied = signal('');

  // --- Filtros de selects ---
  clientSearch = signal('');
  productSearch = signal('');
  selectedClientDni = signal<string | null>(null);
  // ? CAMBIO: Ya no necesitamos selectedDistributorDni - cada l�nea tiene su propio distribuidor

  // --- Líneas de la venta en edición ---
  lines = signal<Line[]>([{ productId: null, distributorDni: null, quantity: 1, filter: '' }]);

  // --- Desplegables (clientes y productos) ---
  clientsOpen = signal(false); // por defecto plegado
  private productOpenSet = signal<Set<number>>(new Set());
  isProductOpen = (index: number) => this.productOpenSet().has(index);
  toggleProductOpen(index: number) {
    const set = new Set(this.productOpenSet());
    if (set.has(index)) set.delete(index); else set.add(index);
    this.productOpenSet.set(set);
  }
  toggleClientsOpen() { this.clientsOpen.set(!this.clientsOpen()); }

  totalSales = computed(() => this.sales().length);
  totalRevenue = computed(() => 
    this.sales().reduce((sum, v) => sum + this.calculateTotal(v), 0)
  );

  // --- Form reactivo (cabecera) ---
  form: FormGroup<SaleForm> = this.fb.group<SaleForm>({
    id: this.fb.control<number | null>(null),
    clientDni: this.fb.control<string | null>(null, {
      validators: [Validators.required, Validators.minLength(6)]
    }),
    productId: this.fb.control<number | null>(null, { validators: [Validators.min(1)] }),
    quantity: this.fb.nonNullable.control(1, { validators: [Validators.min(1)] }),
  });

  // --- UI: abrir/cerrar secciones ---
  isNewOpen = false;
  toggleNew(){ this.isNewOpen = !this.isNewOpen; }
  
  toggleStats() {
    const newValue = !this.showStats();
    console.log('🔄 Toggle stats:', { 
      before: this.showStats(), 
      after: newValue,
      hasStats: !!this.stats()
    });
    this.showStats.set(newValue);
    
    if (newValue && !this.stats()) {
      console.log('📊 Loading stats for first time...');
      this.loadStats();
    }
  }

  // Expuesto al template
  get clientControl() { return this.form.controls.clientDni; }

  // ✅ NUEVO: Formatea fecha ISO a DD/MM/YYYY HH:mm
  formatDateTimeDDMMYYYY(isoDate: string | undefined): string {
    if (!isoDate) return '—';
    
    try {
      const date = new Date(isoDate);
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${day}/${month}/${year}, ${hours}:${minutes}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return '—';
    }
  }
  
  // --- Ciclo de vida ---
  ngOnInit(): void {
    console.log('🚀 Component initialized. showStats:', this.showStats());
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      prods: this.prodSrv.getAllProducts(),
      clis: this.cliSrv.getAllClients(),
      dists: this.http.get<any>('/api/distributors', { withCredentials: true }),
    }).subscribe({
      next: (res: { 
        prods: ApiProdResp<ProductDTO[]> | any; 
        clis: ApiCliResp<ClientDTO[]> | any;
        dists: any;
      }) => {
        // Normalizar productos
        let productList: ProductDTO[] = [];
        if (Array.isArray(res.prods)) {
          productList = res.prods;
        } else if (res.prods?.data && Array.isArray(res.prods.data)) {
          productList = res.prods.data;
        } else if (res.prods?.products && Array.isArray(res.prods.products)) {
          productList = res.prods.products;
        }

        // Normalizar clientes
        let clientList: ClientDTO[] = [];
        if (Array.isArray(res.clis)) {
          clientList = res.clis;
        } else if (res.clis?.data && Array.isArray(res.clis.data)) {
          clientList = res.clis.data;
        } else if (res.clis?.clients && Array.isArray(res.clis.clients)) {
          clientList = res.clis.clients;
        }

        // Normalizar distribuidores
        let distributorList: DistributorDTO[] = [];
        if (Array.isArray(res.dists)) {
          distributorList = res.dists;
        } else if (res.dists?.data && Array.isArray(res.dists.data)) {
          distributorList = res.dists.data;
        } else if (res.dists?.distributors && Array.isArray(res.dists.distributors)) {
          distributorList = res.dists.distributors;
        }
        
        console.log('📦 Products loaded:', productList.length, productList);
        console.log('👥 Clients loaded:', clientList.length, clientList);
        console.log('🚚 Distributors loaded:', distributorList.length, distributorList);
        
        this.products.set(productList);
        this.clients.set(clientList);
        this.distributors.set(distributorList);
        
        this.loadSales();
      },
      error: (err) => { 
        console.error('❌ Error loading catalog:', err);
        this.loadSales(); 
      }
    });
  }

  loadStats() {
    console.log('📊 loadStats() called');
    this.loadingStats.set(true);
    
    const salesData = this.sales();
    
    if (!salesData || salesData.length === 0) {
      console.warn('⚠️ No sales data available');
      this.loadingStats.set(false);
      return;
    }

    const totalRevenue = salesData.reduce((sum, sale) => sum + this.calculateTotal(sale), 0);
    const totalSales = salesData.length;
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    const salesByMonth = this.groupSalesByMonth(salesData);
    const topProducts = this.getTopProducts(salesData);
    const salesByDistributor = this.getSalesByDistributor(salesData);

    const stats: SalesStats = {
      totalSales,
      totalRevenue,
      averageTicket,
      salesByMonth,
      topProducts,
      salesByDistributor
    };

    // 📊 ECharts: Gráfico de ventas por mes (Barras con gradiente premium)
    const salesChart: EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        borderColor: 'rgba(195, 164, 98, 0.6)',
        borderWidth: 2,
        textStyle: { color: '#fff', fontSize: 14 },
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(195, 164, 98, 0.1)'
          }
        },
        formatter: (params: any) => {
          const data = params[0];
          return `<div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 15px;">${data.name}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #c3a462; font-size: 20px; font-weight: bold;">$${data.value.toLocaleString()}</span>
            </div>
          </div>`;
        }
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '8%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: salesByMonth.map(s => s.month),
        axisLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.2)' }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: 12,
          fontWeight: 500
        },
        axisTick: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.08)',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 12,
          formatter: (value: number) => {
            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
            return `$${value}`;
          }
        }
      },
      series: [{
        name: 'Ventas',
        type: 'bar',
        barWidth: '80%',
        barGap: '0%',
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(195, 164, 98, 1)' },
              { offset: 0.5, color: 'rgba(195, 164, 98, 0.8)' },
              { offset: 1, color: 'rgba(195, 164, 98, 0.5)' }
            ]
          },
          shadowColor: 'rgba(195, 164, 98, 0.4)',
          shadowBlur: 10,
          shadowOffsetY: 5
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255, 215, 0, 1)' },
                { offset: 0.5, color: 'rgba(195, 164, 98, 1)' },
                { offset: 1, color: 'rgba(195, 164, 98, 0.7)' }
              ]
            },
            shadowColor: 'rgba(255, 215, 0, 0.6)',
            shadowBlur: 20
          }
        },
        label: {
          show: true,
          position: 'top',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: 11,
          fontWeight: 'bold',
          formatter: (params: any) => {
            const value = params.value;
            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
            return `$${value}`;
          }
        },
        data: salesByMonth.map(s => s.amount)
      }]
    };

    // 🏆 ECharts: Top productos (Podio de ranking)
    const podiumColors = [
      { gradient: ['rgba(255, 215, 0, 1)', 'rgba(255, 193, 7, 0.7)'], medal: '🥇', glow: 'rgba(255, 215, 0, 0.6)' },
      { gradient: ['rgba(192, 192, 192, 1)', 'rgba(169, 169, 169, 0.7)'], medal: '🥈', glow: 'rgba(192, 192, 192, 0.6)' },
      { gradient: ['rgba(205, 127, 50, 1)', 'rgba(184, 115, 51, 0.7)'], medal: '🥉', glow: 'rgba(205, 127, 50, 0.6)' },
      { gradient: ['rgba(59, 130, 246, 0.9)', 'rgba(59, 130, 246, 0.6)'], medal: '④', glow: 'rgba(59, 130, 246, 0.5)' },
      { gradient: ['rgba(156, 163, 175, 0.8)', 'rgba(156, 163, 175, 0.5)'], medal: '⑤', glow: 'rgba(156, 163, 175, 0.4)' }
    ];

    const productsChart: EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        borderColor: 'rgba(195, 164, 98, 0.6)',
        borderWidth: 2,
        textStyle: { color: '#fff', fontSize: 14 },
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(195, 164, 98, 0.1)'
          }
        },
        formatter: (params: any) => {
          const data = params[0];
          const rank = data.dataIndex + 1;
          const medal = podiumColors[data.dataIndex]?.medal || `${rank}°`;
          return `<div style="padding: 10px;">
            <div style="font-size: 28px; text-align: center; margin-bottom: 8px;">${medal}</div>
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 15px; text-align: center;">${data.name}</div>
            <div style="text-align: center;">
              <span style="color: #c3a462; font-size: 20px; font-weight: bold;">${data.value}</span>
              <span style="color: rgba(255,255,255,0.7); font-size: 14px; margin-left: 4px;">unidades</span>
            </div>
          </div>`;
        }
      },
      grid: {
        left: '8%',
        right: '8%',
        bottom: '8%',
        top: '25%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: topProducts.map(p => p.productName),
        axisLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.2)' }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: 11,
          fontWeight: 600,
          interval: 0,
          rotate: 0,
          formatter: (value: string) => {
            return value.length > 12 ? value.substring(0, 12) + '...' : value;
          }
        },
        axisTick: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.08)',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 11
        }
      },
      series: [{
        name: 'Cantidad',
        type: 'bar',
        barWidth: '75%',
        barGap: '10%',
        data: topProducts.map((p, idx) => ({
          value: p.quantity,
          itemStyle: {
            borderRadius: [12, 12, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: podiumColors[idx]?.gradient[0] || 'rgba(156, 163, 175, 0.8)' },
                { offset: 1, color: podiumColors[idx]?.gradient[1] || 'rgba(156, 163, 175, 0.5)' }
              ]
            },
            shadowColor: podiumColors[idx]?.glow || 'rgba(156, 163, 175, 0.4)',
            shadowBlur: idx < 3 ? 15 : 8,
            shadowOffsetY: 8
          }
        })),
        label: {
          show: true,
          position: 'top',
          fontSize: 22,
          fontWeight: 'bold',
          color: '#fff',
          formatter: (params: any) => {
            return podiumColors[params.dataIndex]?.medal || `${params.dataIndex + 1}°`;
          },
          offset: [0, -15],
          backgroundColor: 'transparent',
          padding: 0
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 30,
            shadowOffsetY: 15
          },
          label: {
            fontSize: 28
          }
        }
      }]
    };

    // 🚚 ECharts: Ventas por distribuidor (Barras horizontales)
    const distributorsChart: EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        borderColor: 'rgba(195, 164, 98, 0.6)',
        borderWidth: 2,
        textStyle: { color: '#fff', fontSize: 14 },
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(195, 164, 98, 0.1)'
          }
        },
        formatter: (params: any) => {
          const data = params[0];
          return `<div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 15px;">${data.name}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #c3a462; font-size: 20px; font-weight: bold;">$${data.value.toLocaleString()}</span>
            </div>
          </div>`;
        }
      },
      grid: {
        left: '25%',
        right: '8%',
        bottom: '8%',
        top: '12%',
        containLabel: false
      },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.3)' } },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
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
      yAxis: {
        type: 'category',
        data: salesByDistributor.map(d => d.distributorName),
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.3)' } },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: 12,
          fontWeight: 500,
          overflow: 'truncate',
          width: 150,
          formatter: (value: string) => {
            return value.length > 20 ? value.substring(0, 20) + '...' : value;
          }
        },
        axisTick: {
          show: false
        }
      },
      series: [{
        name: 'Ventas',
        type: 'bar',
        barWidth: '50%',
        barGap: '30%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: 'rgba(195, 164, 98, 0.8)' },
              { offset: 1, color: 'rgba(195, 164, 98, 1)' }
            ]
          },
          borderRadius: [0, 8, 8, 0],
          shadowColor: 'rgba(195, 164, 98, 0.3)',
          shadowBlur: 8,
          shadowOffsetX: 3
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: 'rgba(255, 215, 0, 1)' },
                { offset: 1, color: 'rgba(195, 164, 98, 1)' }
              ]
            },
            shadowBlur: 15,
            shadowColor: 'rgba(255, 215, 0, 0.5)'
          }
        },
        label: {
          show: true,
          position: 'right',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: 12,
          fontWeight: 600,
          formatter: (params: any) => {
            const value = params.value;
            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
            return `$${value.toLocaleString()}`;
          }
        },
        data: salesByDistributor.map(d => d.totalSales)
      }]
    };

    console.log('✅ Stats calculated:', stats);

    this.stats.set(stats);
    this.salesChartOptions.set(salesChart);
    this.topProductsChartOptions.set(productsChart);
    this.distributorsChartOptions.set(distributorsChart);
    this.loadingStats.set(false);
  }

  private groupSalesByMonth(sales: SaleDTO[]): { month: string; amount: number }[] {
    const monthMap = new Map<string, number>();
    
    console.log('📅 Grouping sales by month...');
    
    sales.forEach(sale => {
      const date = new Date(sale.saleDate || sale.date || Date.now());
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      
      const saleTotal = this.calculateTotal(sale);
      const currentAmount = monthMap.get(monthKey) || 0;
      
      console.log(`  Sale #${sale.id}: ${monthKey} -> ${saleTotal} (accumulated: ${currentAmount + saleTotal})`);
      
      monthMap.set(monthKey, currentAmount + saleTotal);
    });

    console.log('📅 Month map final:', Array.from(monthMap.entries()));

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
    
    console.log('📅 Final result:', result);
    return result;
  }

  private getTopProducts(sales: SaleDTO[]): { productId: number; productName: string; quantity: number }[] {
    const productMap = new Map<number, { name: string; quantity: number }>();

    sales.forEach(sale => {
      if (sale.details && sale.details.length > 0) {
        sale.details.forEach(detail => {
          // Use the same logic as detailDescription to get the productId
          const productId = detail.productId ?? (detail as any)?.product?.id ?? null;
          const quantity = Number(detail.quantity) || 0;
          const productName = this.detailDescription(detail);

          // Skip if productId is null or undefined
          if (productId == null) {
            console.warn('⚠️ Product detail without ID found, skipping:', detail);
            return;
          }

          if (productMap.has(productId)) {
            const existing = productMap.get(productId)!;
            existing.quantity += quantity;
          } else {
            productMap.set(productId, { name: productName, quantity });
          }
        });
      }
    });

    const result = Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity: data.quantity
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    console.log('🏆 Top 5 products:', result);
    return result;
  }

  private getSalesByDistributor(sales: SaleDTO[]): { distributorName: string; totalSales: number }[] {
    const distributorMap = new Map<string, number>();

    console.log('🚚 Calculating sales by distributor from', sales.length, 'sales');

    sales.forEach(sale => {
      const distributorName = sale.distributor?.name || 'Sin distribuidor';
      const currentAmount = distributorMap.get(distributorName) || 0;
      const saleTotal = this.calculateTotal(sale);
      
      distributorMap.set(distributorName, currentAmount + saleTotal);
      console.log(`  - ${distributorName}: +${saleTotal} (total: ${currentAmount + saleTotal})`);
    });

    const result = Array.from(distributorMap.entries())
      .map(([distributorName, totalSales]) => ({ distributorName, totalSales }))
      .sort((a, b) => b.totalSales - a.totalSales);

    console.log('🚚 Distributors result:', result);
    return result;
  }

  getStock(id: number | null | undefined): number {
    if (id == null) return 0;
    const p = this.products().find(x => x.id === id);
    const raw = p?.stock;
    const n = typeof raw === 'string' ? Number(raw) : (typeof raw === 'number' ? raw : 0);
    return Number.isFinite(n) ? n : 0;
  }

  clampQuantity(idx: number) {
    const arr = [...this.lines()];
    const l = arr[idx];
    const max = this.getStock(l.productId);
    let val = Number(l.quantity) || 1;
    if (val < 1) val = 1;
    if (max > 0 && val > max) val = max;
    l.quantity = val;
    this.lines.set(arr);
  }

  filteredSales = computed(() => {
  const q = this.fTextApplied().toLowerCase().trim();
  const dni = this.fClientDniApplied().trim();
  
  return this.sales().filter(v => {
    // Si hay filtro de DNI, solo buscar por DNI
    if (dni) {
      const clientDni = v.client?.dni || '';
      return clientDni.includes(dni);
    }
    
    // Si hay filtro de texto general
    if (q) {
      // Primero intentar match exacto con ID
      const matchId = String(v.id) === q;
      if (matchId) return true;
      
      // Si no es un número puro, buscar en otros campos
      const isNumericOnly = /^\d+$/.test(q);
      
      if (isNumericOnly) {
        // Si es solo números, buscar SOLO en ID
        return false;
      } else {
        // Si tiene letras, buscar en descripción de productos, cliente y distribuidor
        const saleDescription = (v.details && v.details.length) 
          ? v.details.map(d => this.detailDescription(d)).join(' ').toLowerCase()
          : '';
        
        const clientName = v.client?.name?.toLowerCase() || '';
        const distributorName = v.distributor?.name?.toLowerCase() || '';
        
        return saleDescription.includes(q) || 
               clientName.includes(q) ||
               distributorName.includes(q);
      }
    }
    
    // Si no hay filtros, mostrar todas
    return true;
  });
});

  // Genera ofertas de productos (product x distributor combinations)
  productOffers = computed(() => {
    const offers: ProductOffer[] = [];
    const allProds = this.products();

    allProds.forEach(p => {
      if (p.distributors && p.distributors.length > 0) {
        p.distributors.forEach(d => {
          offers.push({
            productId: p.id,
            description: p.description,
            price: p.price,
            stock: p.stock,
            distributorDni: d.dni,
            distributorName: d.name,
            zoneName: d.zone?.name
          });
        });
      }
    });

    // ✅ Si es distribuidor (no admin), filtrar solo sus productos
    if (this.isDistributor() && !this.isAdmin()) {
      const userDni = this.currentUserDni();
      if (userDni) {
        return offers.filter(offer => offer.distributorDni === userDni);
      }
      return [];
    }

    return offers;
  });

  filteredClients = computed(() => {
    const q = this.clientSearch().toLowerCase().trim();
    if (!q) return this.clients();
    return this.clients().filter(c =>
      (c.dni || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q)
    );
  });

  filteredProductOffers = computed(() => {
    const q = this.productSearch().toLowerCase().trim();
    let offers = this.productOffers();

    // ? CAMBIO: Ya no filtramos por distribuidor - permitimos mezclar distribuidores

    // Filter by search query
    if (!q) return offers;
    return offers.filter(o =>
      String(o.productId).includes(q) ||
      o.description.toLowerCase().includes(q) ||
      o.distributorName.toLowerCase().includes(q) ||
      (o.zoneName || '').toLowerCase().includes(q)
    );
  });

  applyFilters() {
    this.fTextApplied.set(this.fTextInput());
    this.fClientDniApplied.set(this.fClientDniInput());
  }

  clearFilters() {
    this.fTextInput.set('');
    this.fClientDniInput.set('');
    this.fTextApplied.set('');
    this.fClientDniApplied.set('');
  }

  loadSales() {
    this.saleSrv.getAllSales().subscribe({
      next: (list: SaleDTO[]) => {
        console.log('📋 Sales loaded from backend:', list.length, 'sales');

        if (list.length > 0) {
          console.log('🔍 First sale structure:', list[0]);
          console.log('🔍 Distributor in first sale:', list[0].distributor);
          console.log('🔍 Client in first sale:', list[0].client);
        }

        // Filtrar por distribuidor si no es admin
        let filteredSales = list;
        if (this.isDistributor() && !this.isAdmin()) {
          const userDni = this.currentUserDni();
          console.log('🔍 Filtering sales for distributor DNI:', userDni);

          if (userDni) {
            filteredSales = list.filter(sale => {
              const distributorDni = sale.distributor?.dni;
              const matches = distributorDni === userDni;
              if (!matches) {
                console.log('❌ Filtered out sale:', sale.id, 'distributor:', distributorDni);
              }
              return matches;
            });
            console.log('✅ Filtered sales for distributor:', filteredSales.length, 'of', list.length);
          } else {
            console.warn('⚠️ Distributor DNI not found, showing no sales');
            filteredSales = [];
          }
        } else if (this.isAuthority() && !this.isAdmin()) {
          // Autoridad solo ve ventas con productos LEGALES (NO ilegales)
          console.log('⚖️ Authority user - filtering sales WITHOUT illegal products');

          const allProducts = this.products();
          filteredSales = list.filter(sale => {
            if (!sale.details || sale.details.length === 0) return false;

            // Verificar si algún producto de la venta es ilegal
            const hasIllegalProduct = sale.details.some(detail => {
              const product = allProducts.find(p => p.id === detail.productId);
              return product?.isIllegal === true;
            });

            // Solo mostrar ventas SIN productos ilegales
            return !hasIllegalProduct;
          });

          console.log('✅ Filtered sales for authority:', filteredSales.length, 'of', list.length, '(only legal products)');
        } else if (this.isAdmin()) {
          console.log('👑 Admin user - showing all sales');
        }

        this.sales.set(filteredSales);
        this.loading.set(false);

        if (filteredSales.length > 0) {
          console.log('📊 Auto-loading stats because sales exist');
          this.showStats.set(true);
          this.loadStats();
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message || this.t.instant('sales.errorLoad'));
        this.loading.set(false);
      }
    });
  }

  sumQuantities(v: SaleDTO): number {
    const details = this.getDetails(v) ?? [];
    return details.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
  }

  private getProdById(id: number | null | undefined): ProductDTO | undefined {
    if (id == null) return undefined;
    return this.products().find(p => p.id === id);
  }

  detailDescription(d: SaleDetailDTO): string {
    if (d?.product?.description) return d.product.description;
    const pid = d.productId ?? (d as any)?.product?.id ?? null;
    if (pid != null) {
      const p = this.products().find(x => x.id === Number(pid));
      if (p?.description) return p.description;
      return `#${pid}`;
    }
    return '—';
  }

  detailPrice(d: SaleDetailDTO): number {
    const sub = (d as any).subtotal;
    if (typeof sub === 'number' && Number.isFinite(sub)) return sub / (Number(d.quantity) || 1);
    if (d.product && typeof d.product.price === 'number') return d.product.price;
    const p = this.getProdById(d.productId);
    return p?.price ?? 0;
  }

  getClient(v: SaleDTO): SaleClientDTO | null { return v.client ?? null; }
  hasDetails(v: SaleDTO): boolean { return !!(v.details && v.details.length > 0); }
  getDetails(v: SaleDTO): SaleDetailDTO[] { return v.details ?? []; }
  
  getDistributorById(id: string): DistributorDTO | undefined {
    return this.distributors().find(d => d.dni === id || (d as any).id === id);
  }

  private clientExists(dni: string | null): boolean {
    if (!dni) return false;
    return this.clients().some(c => (c.dni || '') === dni);
  }

  private distributorExists(dni: string | null): boolean {
    if (!dni) return false;
    return this.distributors().some(d => (d.dni || '') === dni);
  }

  // ? CAMBIO: Ahora agrupa las l�neas por distribuidor y retorna m�ltiples payloads
  private buildCreatePayloads(): CreateSaleDTO[] {
    const clientDni = String(this.clientControl.value || '').trim();
    const validLines = this.lines().filter(l => l.productId !== null && l.distributorDni !== null);

    // Agrupar l�neas por distribuidor
    const linesByDistributor = new Map<string, Line[]>();
    validLines.forEach(line => {
      const distDni = line.distributorDni!;
      if (!linesByDistributor.has(distDni)) {
        linesByDistributor.set(distDni, []);
      }
      linesByDistributor.get(distDni)!.push(line);
    });

    // Crear un payload por cada distribuidor
    const payloads: CreateSaleDTO[] = [];
    linesByDistributor.forEach((lines, distributorDni) => {
      const details: SaleDetailDTO[] = lines.map(l => ({
        productId: Number(l.productId),
        quantity: Number(l.quantity),
      }));

      payloads.push({
        clientDni,
        distributorDni,
        details
      });
    });

    return payloads;
  }

  private validateLines(lines: Line[]): string | null {
    if (!lines || lines.length === 0) return this.t.instant('sales.err.addOne');
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.productId == null) return this.t.instant('sales.err.chooseProductLine', { n: i + 1 });
      const quantity = Number(l.quantity);
      if (!quantity || quantity < 1) return this.t.instant('sales.err.validQtyLine', { n: i + 1 });
      const stock = this.getStock(l.productId);
      if (quantity > stock) return this.t.instant('sales.err.noStock', { stock });
    }
    return null;
  }

  calculateTotal(v: SaleDTO): number {
    if (typeof v.saleAmount === 'number') return v.saleAmount;
    if (typeof v.amount === 'number') return v.amount;
    if (typeof v.total === 'number') return v.total;

    if (v.details && v.details.length) {
      return v.details.reduce((sum, d) => {
        const sub = (d as any).subtotal;
        if (typeof sub === 'number') return sum + sub;
        const price = this.detailPrice(d);
        const quantity = Number(d.quantity) || 0;
        return sum + (price * quantity);
      }, 0);
    }

    return 0;
  }

  new() {
    this.form.reset({
      id: null,
      clientDni: null,
      productId: null,
      quantity: 1
    });
    this.lines.set([{ productId: null, distributorDni: null, quantity: 1, filter: '' }]);
    this.submitted.set(false);
    this.error.set(null);
    this.clientSearch.set('');
    this.productSearch.set('');
    this.selectedClientDni.set(null);
    // ? CAMBIO: Ya no usamos selectedDistributorDni global
    this.isNewOpen = false;
  }

  addLine() {
    const arr = [...this.lines()];
    arr.push({ productId: null, distributorDni: null, quantity: 1, filter: '' });
    this.lines.set(arr);
  }

  removeLine(idx: number) {
    const arr = [...this.lines()];
    arr.splice(idx, 1);
    if (arr.length === 0) {
      arr.push({ productId: null, distributorDni: null, quantity: 1, filter: '' });
    }

    // ? CAMBIO: Ya no reseteamos el distribuidor global (no existe m�s)
    this.lines.set(arr);
  }

  // Helper methods for template
  selectClient(client: ClientDTO): void {
    this.selectedClientDni.set(client.dni);
    this.form.patchValue({ clientDni: client.dni });
  }

  selectProductOffer(offer: ProductOffer, lineIndex: number): void {
    const arr = [...this.lines()];
    const line = arr[lineIndex];

    // ? CAMBIO: Cada l�nea tiene su propio distribuidor, sin restricciones globales
    line.productId = offer.productId;
    line.distributorDni = offer.distributorDni;
    this.lines.set(arr);
  }

  trackByClientDni = (_: number, c: ClientDTO) => c.dni;
  trackByOfferId = (_: number, o: ProductOffer) => `${o.productId}-${o.distributorDni}`;

  save() {
    this.submitted.set(true);

    const clientDni = this.clientControl.value;
    if (!this.clientExists(clientDni)) {
      this.error.set(this.t.instant('sales.err.clientMissing'));
      this.clientControl.markAsTouched();
      return;
    }

    const errLines = this.validateLines(this.lines());
    if (errLines) {
      this.error.set(errLines);
      return;
    }

    // ? CAMBIO: Obtener m�ltiples payloads (uno por distribuidor)
    const payloads = this.buildCreatePayloads();

    if (payloads.length === 0) {
      this.error.set('Debe seleccionar al menos un producto');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // ? CAMBIO: Crear m�ltiples ventas en paralelo usando forkJoin
    const createRequests = payloads.map(payload => this.saleSrv.createSale(payload));

    forkJoin(createRequests).subscribe({
      next: (results) => {
        console.log(`? ${results.length} venta(s) creada(s) exitosamente`);
        if (results.length > 1) {
          console.log(`?? Se crearon ${results.length} ventas porque hay productos de ${results.length} distribuidores diferentes`);
        }
        this.new();
        this.loadSales();
        if (this.showStats() && this.stats()) {
          setTimeout(() => this.loadStats(), 500);
        }
      },
      error: (err) => {
        const msg = err?.error?.message || this.t.instant('sales.err.create');
        this.error.set(msg);
        this.loading.set(false);
        console.error('[SALE] Error creating:', err);
      }
    });
  }

}

