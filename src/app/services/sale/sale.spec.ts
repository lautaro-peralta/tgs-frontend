import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { SaleService } from './sale';
import { SaleDTO, CreateSaleDTO, UpdateSaleDTO } from '../../models/sale/sale.model';

describe('SaleService', () => {
  let service: SaleService;
  let httpMock: HttpTestingController;

  const mockSale: SaleDTO = {
    id: 1,
    total: 100.50,
    date: new Date().toISOString(),
    client: { dni: '12345678', name: 'Test Client' },
    distributor: { dni: '87654321', name: 'Test Distributor' },
    details: [
      { productId: 1, quantity: 2, subtotal: 100.50 }
    ]
  };

  const mockSalesArray: SaleDTO[] = [
    mockSale,
    { ...mockSale, id: 2, total: 200.00 }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SaleService]
    });
    service = TestBed.inject(SaleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllSales', () => {
    it('should return sales array when response has data property', () => {
      service.getAllSales().subscribe(sales => {
        expect(sales).toEqual(mockSalesArray);
        expect(sales.length).toBe(2);
      });

      const req = httpMock.expectOne('/api/sales');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ success: true, message: 'ok', data: mockSalesArray });
    });
  });

  describe('getMyPurchases', () => {
    it('should return purchases array when response has data property', () => {
      service.getMyPurchases().subscribe(purchases => {
        expect(purchases).toEqual(mockSalesArray);
      });

      const req = httpMock.expectOne('/api/sales/my-purchases');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ success: true, message: 'ok', data: mockSalesArray });
    });
  });

  describe('getSale', () => {
    it('should return sale when response has data property', () => {
      service.getSale(1).subscribe(sale => {
        expect(sale).toEqual(mockSale);
      });

      const req = httpMock.expectOne('/api/sales/1');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ data: mockSale });
    });
  });

  describe('createSale', () => {
    it('should create sale with basic payload', () => {
      const createPayload: CreateSaleDTO = {
        distributorDni: '87654321',
        details: [
          { productId: 1, quantity: 2 }
        ]
      };

      service.createSale(createPayload).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/sales');
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.body.distributorDni).toBe('87654321');
      expect(req.request.body.details).toBeDefined();
      req.flush({ data: mockSale });
    });

    it('should create sale with clientDni', () => {
      const createPayload: CreateSaleDTO = {
        clientDni: '12345678',
        distributorDni: '87654321',
        details: [
          { productId: 1, quantity: 2 }
        ]
      };

      service.createSale(createPayload).subscribe();

      const req = httpMock.expectOne('/api/sales');
      expect(req.request.body.clientDni).toBe('12345678');
      req.flush({ data: mockSale });
    });

    it('should create sale with person data including optional fields', () => {
      const createPayload: CreateSaleDTO = {
        distributorDni: '87654321',
        details: [{ productId: 1, quantity: 2 }],
        person: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '123456789',
          address: '123 Test St'
        }
      };

      service.createSale(createPayload).subscribe();

      const req = httpMock.expectOne('/api/sales');
      expect(req.request.body.person).toBeDefined();
      expect(req.request.body.person.name).toBe('Test User');
      expect(req.request.body.person.email).toBe('test@example.com');
      expect(req.request.body.person.phone).toBe('123456789');
      expect(req.request.body.person.address).toBe('123 Test St');
      req.flush({ data: mockSale });
    });

    it('should create sale with person data without optional fields', () => {
      const createPayload: CreateSaleDTO = {
        distributorDni: '87654321',
        details: [{ productId: 1, quantity: 2 }],
        person: {
          name: 'Test User',
          email: 'test@example.com'
        }
      };

      service.createSale(createPayload).subscribe();

      const req = httpMock.expectOne('/api/sales');
      expect(req.request.body.person.phone).toBeUndefined();
      expect(req.request.body.person.address).toBeUndefined();
      req.flush({ data: mockSale });
    });

    it('should handle empty details array', () => {
      const createPayload: CreateSaleDTO = {
        distributorDni: '87654321',
        details: []
      };

      service.createSale(createPayload).subscribe();

      const req = httpMock.expectOne('/api/sales');
      expect(req.request.body.details).toEqual([]);
      req.flush({ data: mockSale });
    });

    it('should handle undefined details', () => {
      const createPayload: CreateSaleDTO = {
        distributorDni: '87654321'
      } as CreateSaleDTO;

      service.createSale(createPayload).subscribe();

      const req = httpMock.expectOne('/api/sales');
      expect(req.request.body.details).toEqual([]);
      req.flush({ data: mockSale });
    });

    it('should normalize productId and quantity to numbers', () => {
      const createPayload: CreateSaleDTO = {
        distributorDni: '87654321',
        details: [
          { productId: '5' as any, quantity: '10' as any }
        ]
      };

      service.createSale(createPayload).subscribe();

      const req = httpMock.expectOne('/api/sales');
      expect(req.request.body.details[0].productId).toBe(5);
      expect(req.request.body.details[0].quantity).toBe(10);
      req.flush({ data: mockSale });
    });

    it('should trim whitespace from DNI fields', () => {
      const createPayload: CreateSaleDTO = {
        clientDni: '  12345678  ',
        distributorDni: '  87654321  ',
        details: []
      };

      service.createSale(createPayload).subscribe();

      const req = httpMock.expectOne('/api/sales');
      expect(req.request.body.clientDni).toBe('12345678');
      expect(req.request.body.distributorDni).toBe('87654321');
      req.flush({ data: mockSale });
    });
  });

  describe('updateSale', () => {
    it('should update sale with payload', () => {
      const updatePayload: UpdateSaleDTO = {
        distributorDni: '99999999'
      };

      service.updateSale(1, updatePayload).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/sales/1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.body).toEqual(updatePayload);
      req.flush({ data: mockSale });
    });

    it('should update sale with different id', () => {
      const updatePayload: UpdateSaleDTO = {
        distributorDni: '11111111'
      };

      service.updateSale(999, updatePayload).subscribe();

      const req = httpMock.expectOne('/api/sales/999');
      expect(req.request.method).toBe('PATCH');
      req.flush({ data: mockSale });
    });
  });

  describe('deleteSale', () => {
    it('should delete sale by id', () => {
      service.deleteSale(1).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/sales/1');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ success: true });
    });

    it('should delete sale with different id', () => {
      service.deleteSale(42).subscribe();

      const req = httpMock.expectOne('/api/sales/42');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });

  describe('searchSales', () => {
    it('should search with query parameter', () => {
      service.searchSales({ q: 'test' }).subscribe(sales => {
        expect(sales).toEqual(mockSalesArray);
      });

      const req = httpMock.expectOne(req => req.url === '/api/sales/search');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.params.get('q')).toBe('test');
      req.flush({ success: true, message: 'ok', data: mockSalesArray });
    });

    it('should search with all parameters', () => {
      const params = {
        q: 'search term',
        by: 'client' as const,
        date: '2024-01-01',
        type: 'exact' as const,
        endDate: '2024-12-31',
        page: 1,
        limit: 10
      };

      service.searchSales(params).subscribe();

      const req = httpMock.expectOne(req => req.url === '/api/sales/search');
      expect(req.request.params.get('q')).toBe('search term');
      expect(req.request.params.get('by')).toBe('client');
      expect(req.request.params.get('date')).toBe('2024-01-01');
      expect(req.request.params.get('type')).toBe('exact');
      req.flush({ data: mockSalesArray });
    });

    it('should return sales array when response has data property', () => {
      service.searchSales({}).subscribe(sales => {
        expect(sales).toEqual(mockSalesArray);
      });

      const req = httpMock.expectOne(req => req.url === '/api/sales/search');
      req.flush({ data: mockSalesArray });
    });

    it('should search by distributor', () => {
      service.searchSales({ by: 'distributor' }).subscribe();

      const req = httpMock.expectOne(req => req.url === '/api/sales/search');
      expect(req.request.params.get('by')).toBe('distributor');
      req.flush({ success: true, message: 'ok', data: mockSalesArray });
    });

    it('should search by zone', () => {
      service.searchSales({ by: 'zone' }).subscribe();

      const req = httpMock.expectOne(req => req.url === '/api/sales/search');
      expect(req.request.params.get('by')).toBe('zone');
      req.flush({ success: true, message: 'ok', data: mockSalesArray });
    });

    it('should search with date type before', () => {
      service.searchSales({ date: '2024-06-01', type: 'before' }).subscribe();

      const req = httpMock.expectOne(req => req.url === '/api/sales/search');
      expect(req.request.params.get('type')).toBe('before');
      req.flush({ success: true, message: 'ok', data: mockSalesArray });
    });

    it('should search with date type after', () => {
      service.searchSales({ date: '2024-01-01', type: 'after' }).subscribe();

      const req = httpMock.expectOne(req => req.url === '/api/sales/search');
      expect(req.request.params.get('type')).toBe('after');
      req.flush({ success: true, message: 'ok', data: mockSalesArray });
    });

    it('should search with date type between', () => {
      service.searchSales({
        date: '2024-01-01',
        type: 'between',
        endDate: '2024-12-31'
      }).subscribe();

      const req = httpMock.expectOne(req => req.url === '/api/sales/search');
      expect(req.request.params.get('type')).toBe('between');
      expect(req.request.params.get('endDate')).toBe('2024-12-31');
      req.flush({ success: true, message: 'ok', data: mockSalesArray });
    });
  });
});
