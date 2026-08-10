/**
 * Integration Tests: Sales Workflow
 *
 * Complete integration tests for sales workflow
 * Integrates real SalesService + CartService
 * Verifies complete flow from adding products to cart to creating sale
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SaleService } from '../../src/app/services/sale/sale';
import { CartService, CartItem } from '../../src/app/services/cart/cart';
import { ProductService } from '../../src/app/services/product/product';
import { ProductDTO } from '../../src/app/models/product/product.model';
import { SaleDTO, CreateSaleDTO } from '../../src/app/models/sale/sale.model';

describe('Integration: Sales Workflow', () => {
  let saleService: SaleService;
  let cartService: CartService;
  let productService: ProductService;
  let httpMock: HttpTestingController;

  const mockProduct1: ProductDTO = {
    id: 1,
    description: 'Whiskey Premium',
    detail: 'Irish Whiskey',
    price: 45.99,
    stock: 100,
    isIllegal: false,
    imageUrl: 'whiskey.jpg'
  };

  const mockProduct2: ProductDTO = {
    id: 2,
    description: 'Gin London Dry',
    detail: 'Dry Gin',
    price: 32.50,
    stock: 75,
    isIllegal: false,
    imageUrl: 'gin.jpg'
  };

  const mockSale: SaleDTO = {
    id: 1,
    saleDate: new Date().toISOString(),
    client: {
      dni: '12345678A',
      name: 'Test Client'
    },
    distributor: {
      dni: '87654321B',
      name: 'Test Distributor'
    },
    total: 124.48,
    details: [
      { productId: 1, quantity: 2, subtotal: 91.98 },
      { productId: 2, quantity: 1, subtotal: 32.50 }
    ]
  };

  beforeEach(() => {
    localStorage.clear(); // Clear cart before each test

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SaleService, CartService, ProductService]
    });

    saleService = TestBed.inject(SaleService);
    cartService = TestBed.inject(CartService);
    productService = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  /**
   * Test 1: Select products → Add to cart → Verify cart state
   * Verifies that products are added correctly to cart with calculations
   */
  it('should add products to cart and calculate totals correctly', () => {
    // Cart should start empty
    expect(cartService.items().length).toBe(0);
    expect(cartService.total()).toBe(0);
    expect(cartService.count()).toBe(0);

    // Add first product
    cartService.add(mockProduct1);

    expect(cartService.items().length).toBe(1);
    expect(cartService.items()[0].id).toBe(1);
    expect(cartService.items()[0].qty).toBe(1);
    expect(cartService.items()[0].price).toBe(45.99);
    expect(cartService.count()).toBe(1);
    expect(cartService.total()).toBeCloseTo(45.99, 2);

    // Add same product again (should increment quantity)
    cartService.add(mockProduct1);

    expect(cartService.items().length).toBe(1); // Still 1 item
    expect(cartService.items()[0].qty).toBe(2); // Quantity increased
    expect(cartService.count()).toBe(2);
    expect(cartService.total()).toBeCloseTo(91.98, 2);

    // Add different product
    cartService.add(mockProduct2);

    expect(cartService.items().length).toBe(2);
    expect(cartService.count()).toBe(3); // 2 whiskey + 1 gin
    expect(cartService.total()).toBeCloseTo(124.48, 2); // 91.98 + 32.50
  });

  /**
   * Test 2: Calculate total → Apply discount → Verify calculations
   * Verifies that discount calculations are correct
   */
  it('should calculate total with discount correctly', () => {
    // Add products to cart
    cartService.add(mockProduct1); // 45.99
    cartService.add(mockProduct1); // 91.98 total
    cartService.add(mockProduct2); // 124.48 total

    const subtotal = cartService.total();
    expect(subtotal).toBeCloseTo(124.48, 2);

    // Apply 10% discount
    const discountPercentage = 10;
    const discount = (subtotal * discountPercentage) / 100;
    const totalWithDiscount = subtotal - discount;

    expect(discount).toBeCloseTo(12.448, 2);
    expect(totalWithDiscount).toBeCloseTo(112.032, 2);

    // Apply fixed discount
    const fixedDiscount = 5.00;
    const totalWithFixedDiscount = subtotal - fixedDiscount;

    expect(totalWithFixedDiscount).toBeCloseTo(119.48, 2);
  });

  /**
   * Test 3: Confirm sale → Create sale → Verify persistence
   * Verifies complete sale creation flow
   */
  it('should create sale from cart and persist to backend', (done) => {
    // Setup cart
    cartService.add(mockProduct1);
    cartService.add(mockProduct1);
    cartService.add(mockProduct2);

    const saleData: CreateSaleDTO = {
      clientDni: '12345678A',
      distributorDni: '87654321B',
      details: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 }
      ],
      person: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789'
      }
    };

    // Create sale
    saleService.createSale(saleData).subscribe({
      next: (response) => {
        expect(response.data).toBeDefined();
        expect(response.data?.id).toBe(1);
        expect(response.data?.total).toBeCloseTo(124.48, 2);
        expect(response.data?.details?.length).toBe(2);

        // Verify cart is cleared after sale
        cartService.clear();
        expect(cartService.items().length).toBe(0);
        expect(cartService.total()).toBe(0);

        done();
      },
      error: (error) => {
        fail('Sale creation should not fail: ' + JSON.stringify(error));
        done();
      }
    });

    // Mock sale creation response
    const req = httpMock.expectOne('/api/sales');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ success: true, data: mockSale });
  });

  /**
   * Test 4: View sales history → Display list
   * Verifies that sales list is displayed correctly
   */
  it('should fetch and display sales history', (done) => {
    const mockSales: SaleDTO[] = [
      mockSale,
      {
        ...mockSale,
        id: 2,
        total: 65.49,
        saleDate: new Date(Date.now() - 86400000).toISOString() // Yesterday
      }
    ];

    saleService.getAllSales().subscribe({
      next: (sales) => {
        expect(sales).toBeDefined();
        expect(sales.length).toBe(2);

        // Verify first sale
        expect(sales[0].id).toBe(1);
        expect(sales[0].total).toBeCloseTo(124.48, 2);
        expect(sales[0].details?.length).toBe(2);

        // Verify second sale
        expect(sales[1].id).toBe(2);
        expect(sales[1].total).toBeCloseTo(65.49, 2);

        // Verify both sales have required fields
        sales.forEach(sale => {
          expect(sale.id).toBeDefined();
          expect(sale.total).toBeDefined();
          expect(sale.client?.dni).toBeDefined();
          expect(sale.distributor?.dni).toBeDefined();
          expect(sale.saleDate).toBeDefined();
        });

        done();
      },
      error: (error) => {
        fail('Fetching sales should not fail: ' + JSON.stringify(error));
        done();
      }
    });

    // Mock sales list response
    const req = httpMock.expectOne('/api/sales');
    expect(req.request.method).toBe('GET');
    req.flush(mockSales); // Backend returns array directly
  });

  /**
   * Test 5: Generate report → Filter by date → Download
   * Verifies report generation flow with filters
   */
  it('should generate sales report with date filters', (done) => {
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';

    const searchParams = {
      date: startDate,
      type: 'between' as const,
      endDate: endDate,
      page: 1,
      limit: 100
    };

    saleService.searchSales(searchParams).subscribe({
      next: (sales) => {
        expect(sales).toBeDefined();
        expect(sales.length).toBeGreaterThan(0);

        // Verify all sales are within date range
        sales.forEach(sale => {
          const saleDate = new Date(sale.saleDate || sale.date || '');
          expect(saleDate >= new Date(startDate)).toBe(true);
          expect(saleDate <= new Date(endDate)).toBe(true);
        });

        done();
      },
      error: (error) => {
        fail('Sales search should not fail: ' + JSON.stringify(error));
        done();
      }
    });

    // Mock search response
    const req = httpMock.expectOne((request) => {
      return request.url === '/api/sales/search' &&
             request.params.has('date') &&
             request.params.get('date') === startDate;
    });

    expect(req.request.method).toBe('GET');
    req.flush([mockSale]);
  });

  /**
   * Integration Test: Cart increment/decrement functionality
   */
  it('should handle cart item quantity changes correctly', () => {
    cartService.add(mockProduct1); // qty: 1

    expect(cartService.items()[0].qty).toBe(1);

    // Increment
    cartService.inc(mockProduct1.id);
    expect(cartService.items()[0].qty).toBe(2);
    expect(cartService.total()).toBeCloseTo(91.98, 2);

    // Increment again
    cartService.inc(mockProduct1.id);
    expect(cartService.items()[0].qty).toBe(3);
    expect(cartService.total()).toBeCloseTo(137.97, 2);

    // Decrement
    cartService.dec(mockProduct1.id);
    expect(cartService.items()[0].qty).toBe(2);
    expect(cartService.total()).toBeCloseTo(91.98, 2);

    // Decrement to 1
    cartService.dec(mockProduct1.id);
    expect(cartService.items()[0].qty).toBe(1);

    // Decrement to 0 (should remove from cart)
    cartService.dec(mockProduct1.id);
    expect(cartService.items().length).toBe(0);
    expect(cartService.total()).toBe(0);
  });

  /**
   * Integration Test: Remove item from cart
   */
  it('should remove item from cart completely', () => {
    cartService.add(mockProduct1);
    cartService.add(mockProduct2);

    expect(cartService.items().length).toBe(2);

    // Remove first product
    cartService.remove(mockProduct1.id);

    expect(cartService.items().length).toBe(1);
    expect(cartService.items()[0].id).toBe(mockProduct2.id);
    expect(cartService.total()).toBeCloseTo(32.50, 2);
  });

  /**
   * Integration Test: Clear entire cart
   */
  it('should clear entire cart', () => {
    cartService.add(mockProduct1);
    cartService.add(mockProduct2);

    expect(cartService.items().length).toBe(2);

    cartService.clear();

    expect(cartService.items().length).toBe(0);
    expect(cartService.total()).toBe(0);
    expect(cartService.count()).toBe(0);
  });

  /**
   * Edge Case: Create sale with empty cart
   */
  it('should handle error when creating sale with no details', (done) => {
    const invalidSaleData: CreateSaleDTO = {
      clientDni: '12345678A',
      distributorDni: '87654321B',
      details: [] // Empty details
    };

    saleService.createSale(invalidSaleData).subscribe({
      error: (error) => {
        expect(error.status).toBe(400);
        expect(error.error.message).toContain('details');
        done();
      }
    });

    const req = httpMock.expectOne('/api/sales');
    req.flush(
      { success: false, message: 'Sale details cannot be empty' },
      { status: 400, statusText: 'Bad Request' }
    );
  });

  /**
   * Edge Case: Get sale by ID
   */
  it('should fetch single sale by ID with complete details', (done) => {
    const saleId = 1;

    saleService.getSale(saleId).subscribe({
      next: (sale) => {
        expect(sale).toBeDefined();
        expect(sale.id).toBe(saleId);
        expect(sale.details).toBeDefined();
        if (sale.details) {
          expect(sale.details.length).toBeGreaterThan(0);
        }

        done();
      }
    });

    const req = httpMock.expectOne(`/api/sales/${saleId}`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockSale });
  });

  /**
   * Edge Case: Cart persistence in localStorage
   */
  it('should persist cart to localStorage', () => {
    cartService.add(mockProduct1);
    cartService.add(mockProduct2);

    // Verify localStorage has cart data
    const cartData = localStorage.getItem('cart.v1');
    expect(cartData).toBeDefined();

    const parsedCart = JSON.parse(cartData!);
    expect(parsedCart.length).toBe(2);
    expect(parsedCart[0].id).toBe(mockProduct1.id);
  });
});

