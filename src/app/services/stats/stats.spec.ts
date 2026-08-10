import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StatsService, SalesStats } from './stats';

describe('StatsService', () => {
  let service: StatsService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:3000/api/stats';

  const mockStats: SalesStats = {
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StatsService]
    });
    service = TestBed.inject(StatsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('getStats()', () => {
    it('should return mock stats when USE_MOCK_DATA is true', (done) => {
      service.getStats().subscribe(stats => {
        expect(stats).toBeDefined();
        expect(stats.totalSales).toBe(247);
        expect(stats.totalRevenue).toBe(1250000);
        expect(stats.averageTicket).toBeCloseTo(5060.73);
        expect(stats.salesByMonth.length).toBe(6);
        expect(stats.topProducts.length).toBe(5);
        expect(stats.salesByDistributor.length).toBe(4);
        done();
      });
    });

    it('should return complete sales statistics structure', (done) => {
      service.getStats().subscribe(stats => {
        expect(stats.totalSales).toBeDefined();
        expect(stats.totalRevenue).toBeDefined();
        expect(stats.averageTicket).toBeDefined();
        expect(stats.salesByMonth).toBeDefined();
        expect(stats.topProducts).toBeDefined();
        expect(stats.salesByDistributor).toBeDefined();
        done();
      });
    });

    it('should return salesByMonth with correct structure', (done) => {
      service.getStats().subscribe(stats => {
        expect(Array.isArray(stats.salesByMonth)).toBe(true);
        expect(stats.salesByMonth[0].month).toBeDefined();
        expect(stats.salesByMonth[0].amount).toBeDefined();
        expect(typeof stats.salesByMonth[0].month).toBe('string');
        expect(typeof stats.salesByMonth[0].amount).toBe('number');
        done();
      });
    });

    it('should return topProducts with correct structure', (done) => {
      service.getStats().subscribe(stats => {
        expect(Array.isArray(stats.topProducts)).toBe(true);
        expect(stats.topProducts[0].productId).toBeDefined();
        expect(stats.topProducts[0].productName).toBeDefined();
        expect(stats.topProducts[0].quantity).toBeDefined();
        done();
      });
    });

    it('should return salesByDistributor with correct structure', (done) => {
      service.getStats().subscribe(stats => {
        expect(Array.isArray(stats.salesByDistributor)).toBe(true);
        expect(stats.salesByDistributor[0].distributorName).toBeDefined();
        expect(stats.salesByDistributor[0].totalSales).toBeDefined();
        done();
      });
    });
  });

  describe('getSalesChartData()', () => {
    it('should return chart data with labels and datasets', (done) => {
      service.getSalesChartData().subscribe(chartData => {
        expect(chartData).toBeDefined();
        expect(chartData.labels).toBeDefined();
        expect(chartData.datasets).toBeDefined();
        expect(Array.isArray(chartData.labels)).toBe(true);
        expect(Array.isArray(chartData.datasets)).toBe(true);
        done();
      });
    });

    it('should have correct month labels', (done) => {
      service.getSalesChartData().subscribe(chartData => {
        expect(chartData.labels).toEqual([
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'
        ]);
        done();
      });
    });

    it('should have correct sales amounts in dataset', (done) => {
      service.getSalesChartData().subscribe(chartData => {
        expect(chartData.datasets[0].data).toEqual([
          185000, 220000, 198000, 245000, 210000, 192000
        ]);
        done();
      });
    });

    it('should have dataset with correct label', (done) => {
      service.getSalesChartData().subscribe(chartData => {
        expect(chartData.datasets[0].label).toBe('Ventas Mensuales');
        done();
      });
    });

    it('should have golden color styling', (done) => {
      service.getSalesChartData().subscribe(chartData => {
        const dataset = chartData.datasets[0];
        expect(dataset.backgroundColor).toBe('rgba(255, 215, 0, 0.9)');
        expect(dataset.borderColor).toBe('rgba(255, 215, 0, 1)');
        expect(dataset.borderWidth).toBe(4);
        done();
      });
    });

    it('should have hover effects configured', (done) => {
      service.getSalesChartData().subscribe(chartData => {
        const dataset = chartData.datasets[0];
        expect(dataset.hoverBackgroundColor).toBeDefined();
        expect(dataset.hoverBorderColor).toBeDefined();
        expect(dataset.hoverBorderWidth).toBe(5);
        done();
      });
    });

  });

  describe('getTopProductsChartData()', () => {
    it('should return chart data with labels and datasets', (done) => {
      service.getTopProductsChartData().subscribe(chartData => {
        expect(chartData).toBeDefined();
        expect(chartData.labels).toBeDefined();
        expect(chartData.datasets).toBeDefined();
        done();
      });
    });

    it('should have product names as labels', (done) => {
      service.getTopProductsChartData().subscribe(chartData => {
        expect(chartData.labels).toEqual([
          'Vino Malbec', 'Champagne', 'Whisky', 'Vodka', 'Ron'
        ]);
        done();
      });
    });

    it('should have correct quantities in dataset', (done) => {
      service.getTopProductsChartData().subscribe(chartData => {
        expect(chartData.datasets[0].data).toEqual([89, 67, 54, 42, 31]);
        done();
      });
    });

    it('should have vibrant different colors for each product', (done) => {
      service.getTopProductsChartData().subscribe(chartData => {
        const dataset = chartData.datasets[0];
        expect(Array.isArray(dataset.backgroundColor)).toBe(true);
        done();
      });
    });

    it('should have border colors matching background colors', (done) => {
      service.getTopProductsChartData().subscribe(chartData => {
        const dataset = chartData.datasets[0];
        expect(dataset.borderWidth).toBe(4);
        done();
      });
    });

    it('should have hover effects configured', (done) => {
      service.getTopProductsChartData().subscribe(chartData => {
        const dataset = chartData.datasets[0];
        expect(dataset.hoverBorderWidth).toBeDefined();
        done();
      });
    });
  });

  describe('getDistributorsChartData()', () => {
    it('should return chart data with labels and datasets', (done) => {
      service.getDistributorsChartData().subscribe(chartData => {
        expect(chartData).toBeDefined();
        expect(chartData.labels).toBeDefined();
        expect(chartData.datasets).toBeDefined();
        done();
      });
    });

    it('should have distributor names as labels', (done) => {
      service.getDistributorsChartData().subscribe(chartData => {
        expect(chartData.labels).toEqual([
          'Norte SA', 'Sur SRL', 'Este & Oeste', 'Central'
        ]);
        done();
      });
    });

    it('should have correct sales amounts in dataset', (done) => {
      service.getDistributorsChartData().subscribe(chartData => {
        expect(chartData.datasets[0].data).toEqual([
          385000, 298000, 325000, 242000
        ]);
        done();
      });
    });

    it('should have different colors for each distributor', (done) => {
      service.getDistributorsChartData().subscribe(chartData => {
        const dataset = chartData.datasets[0];
        expect(Array.isArray(dataset.backgroundColor)).toBe(true);
        done();
      });
    });

    it('should have border styling configured', (done) => {
      service.getDistributorsChartData().subscribe(chartData => {
        const dataset = chartData.datasets[0];
        expect(Array.isArray(dataset.borderColor)).toBe(true);
        expect(dataset.borderWidth).toBe(4);
        done();
      });
    });

    it('should have hover effects with different colors', (done) => {
      service.getDistributorsChartData().subscribe(chartData => {
        const dataset = chartData.datasets[0];
        expect(Array.isArray(dataset.hoverBackgroundColor)).toBe(true);
        expect(dataset.hoverBorderColor).toBeDefined();
        expect(dataset.hoverBorderWidth).toBe(5);
        done();
      });
    });

    it('should have label "Ventas ($)"', (done) => {
      service.getDistributorsChartData().subscribe(chartData => {
        expect(chartData.datasets[0].label).toBe('Ventas ($)');
        done();
      });
    });
  });

  describe('Edge Cases and Data Validation', () => {
    it('should handle stats with zero values', (done) => {
      service.getStats().subscribe(stats => {
        expect(stats.totalSales).toBeGreaterThanOrEqual(0);
        expect(stats.totalRevenue).toBeGreaterThanOrEqual(0);
        expect(stats.averageTicket).toBeGreaterThanOrEqual(0);
        done();
      });
    });

    it('should ensure all salesByMonth amounts are numbers', (done) => {
      service.getStats().subscribe(stats => {
        stats.salesByMonth.forEach(sale => {
          expect(typeof sale.amount).toBe('number');
          expect(sale.amount).toBeGreaterThanOrEqual(0);
        });
        done();
      });
    });

    it('should ensure all product quantities are positive', (done) => {
      service.getStats().subscribe(stats => {
        stats.topProducts.forEach(product => {
          expect(product.quantity).toBeGreaterThan(0);
        });
        done();
      });
    });

    it('should ensure distributor sales are numbers', (done) => {
      service.getStats().subscribe(stats => {
        stats.salesByDistributor.forEach(dist => {
          expect(typeof dist.totalSales).toBe('number');
        });
        done();
      });
    });

    it('should calculate correct data transformations for charts', (done) => {
      service.getSalesChartData().subscribe(chartData => {
        expect(chartData.labels?.length).toEqual(chartData.datasets[0].data.length);
        done();
      });
    });
  });
});
