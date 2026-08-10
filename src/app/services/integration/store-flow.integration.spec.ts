import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductService } from '../product/product';
import { CartService, CartItem } from '../cart/cart';
import { ProductDTO, ProductOffer } from '../../models/product/product.model';

/**
 * Integration Tests: Store Flow (Product → Offer → Cart → Checkout)
 *
 * Verifica el flujo real de la tienda: los productos traídos del backend se
 * convierten en ofertas por distribuidor (misma transformación que hace
 * StoreComponent), se agregan al carrito centralizado (CartService) y se
 * despachan al checkout, que crea una venta por cada distribuidor presente.
 */
describe('Store Flow Integration Tests', () => {
  let productService: ProductService;
  let cartService: CartService;
  let httpMock: HttpTestingController;

  const mockProduct1: ProductDTO = {
    id: 1,
    description: 'Whisky Premium',
    price: 5000,
    stock: 10,
    imageUrl: 'whisky.jpg',
    detail: 'Premium whisky',
    isIllegal: false,
    distributors: [{ dni: '11111111', name: 'Distribuidor Norte', zone: { id: 1, name: 'Zona Norte', isHeadquarters: false } }]
  };

  const mockProduct2: ProductDTO = {
    id: 2,
    description: 'Wine Malbec',
    price: 3000,
    stock: 20,
    imageUrl: 'wine.jpg',
    detail: 'Argentine wine',
    isIllegal: false,
    distributors: [{ dni: '11111111', name: 'Distribuidor Norte', zone: { id: 1, name: 'Zona Norte', isHeadquarters: false } }]
  };

  const mockProduct3: ProductDTO = {
    id: 3,
    description: 'Vodka Imported',
    price: 4500,
    stock: 15,
    imageUrl: 'vodka.jpg',
    detail: 'Imported vodka',
    isIllegal: false,
    distributors: [{ dni: '22222222', name: 'Distribuidor Sur', zone: { id: 2, name: 'Zona Sur', isHeadquarters: true } }]
  };

  /** Replica la transformación producto -> oferta que hace StoreComponent */
  function toOffers(products: ProductDTO[]): ProductOffer[] {
    const offers: ProductOffer[] = [];
    products.forEach(p => {
      (p.distributors ?? []).forEach(dist => {
        offers.push({
          offerId: `${p.id}-${dist.dni}`,
          productId: p.id,
          description: p.description,
          detail: p.detail,
          imageUrl: p.imageUrl,
          price: p.price,
          stock: p.stock,
          isIllegal: p.isIllegal,
          distributorDni: dist.dni,
          distributorName: dist.name,
          zone: dist.zone
        });
      });
    });
    return offers;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductService, CartService]
    });

    productService = TestBed.inject(ProductService);
    cartService = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);

    localStorage.clear();
    cartService.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Complete Shopping Flow', () => {
    it('should browse products, convert them to offers, add to cart, and calculate totals', fakeAsync(() => {
      productService.getAllProducts().subscribe(products => {
        expect(products.length).toBe(3);

        const offers = toOffers(products);

        cartService.add(offers[0]); // Whisky: 5000
        cartService.add(offers[1]); // Wine: 3000
        cartService.add(offers[0]); // Whisky again: +5000

        expect(cartService.items().length).toBe(2);
        expect(cartService.count()).toBe(3); // 2 whisky + 1 wine
        expect(cartService.total()).toBe(13000); // (5000*2) + 3000
      });

      // Use URL matcher to ignore cache-busting query parameters (_t, _r)
      const req = httpMock.expectOne((request) => {
        const url = new URL(request.url, 'http://localhost');
        return url.pathname === '/api/products' && request.method === 'GET';
      });
      req.flush({
        success: true,
        message: 'Products retrieved',
        data: [mockProduct1, mockProduct2, mockProduct3]
      });

      tick();
      flush();
    }));

    it('should fetch a single product and add its offer to the cart', fakeAsync(() => {
      productService.getProduct(1).subscribe(product => {
        const [offer] = toOffers([product]);
        cartService.add(offer);

        expect(cartService.items().length).toBe(1);
        expect(cartService.items()[0].productId).toBe(1);
        expect(cartService.items()[0].price).toBe(5000);
      });

      const req = httpMock.expectOne('/api/products/1');
      req.flush({
        success: true,
        message: 'Product retrieved',
        data: mockProduct1
      });

      tick();
      flush();
    }));
  });

  describe('Cart Management Integration', () => {
    let offer1: ProductOffer, offer2: ProductOffer, offer3: ProductOffer;

    beforeEach(() => {
      [offer1, offer2, offer3] = toOffers([mockProduct1, mockProduct2, mockProduct3]);
    });

    it('should manage cart quantities and update totals', () => {
      cartService.add(offer1);
      cartService.add(offer2);

      expect(cartService.count()).toBe(2);
      expect(cartService.total()).toBe(8000); // 5000 + 3000

      cartService.inc(offer1.offerId);
      expect(cartService.count()).toBe(3);
      expect(cartService.total()).toBe(13000);

      cartService.dec(offer1.offerId);
      expect(cartService.count()).toBe(2);
      expect(cartService.total()).toBe(8000);
    });

    it('should remove offers from cart and recalculate totals', () => {
      cartService.add(offer1);
      cartService.add(offer2);
      cartService.add(offer3);

      expect(cartService.total()).toBe(12500); // 5000 + 3000 + 4500

      cartService.remove(offer2.offerId);
      expect(cartService.total()).toBe(9500);
    });

    it('should persist cart state across operations', () => {
      cartService.add(offer1);
      cartService.add(offer2);

      const stored = localStorage.getItem('cart.v1');
      const parsed = JSON.parse(stored!);

      expect(parsed.length).toBe(2);
      expect(cartService.items().length).toBe(parsed.length);
    });
  });

  describe('Multi-Distributor Checkout Flow', () => {
    it('should group offers by distributor and check out one sale per distributor', () => {
      const [offer1, offer2, offer3] = toOffers([mockProduct1, mockProduct2, mockProduct3]);

      cartService.add(offer1); // Distribuidor Norte
      cartService.add(offer2); // Distribuidor Norte
      cartService.add(offer3); // Distribuidor Sur

      expect(cartService.distributorGroups().length).toBe(2);
      expect(cartService.hasMultipleDistributors()).toBeTrue();

      let results: { success: boolean }[] | undefined;
      cartService.checkout('12345678').subscribe(r => (results = r));

      const reqs = httpMock.match('/api/sales');
      expect(reqs.length).toBe(2);
      reqs.forEach(req => req.flush({ success: true, message: 'ok', data: { id: 1 } }));

      expect(results?.length).toBe(2);
      expect(results?.every(r => r.success)).toBeTrue();
    });

    it('should leave the cart untouched on checkout so the caller decides when to clear it', () => {
      const [offer1] = toOffers([mockProduct1]);
      cartService.add(offer1);

      cartService.checkout('12345678').subscribe();

      const req = httpMock.expectOne('/api/sales');
      req.flush({ success: true, message: 'ok', data: { id: 1 } });

      expect(cartService.items().length).toBe(1);
    });
  });

  describe('Product Service Error Handling in Cart Flow', () => {
    it('should handle product fetch error gracefully', fakeAsync(() => {
      productService.getAllProducts().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(cartService.items().length).toBe(0);
        }
      });

      const req = httpMock.expectOne((request) => {
        const url = new URL(request.url, 'http://localhost');
        return url.pathname === '/api/products' && request.method === 'GET';
      });
      req.flush(
        { success: false, message: 'Server error' },
        { status: 500, statusText: 'Internal Server Error' }
      );

      tick();
      flush();
    }));

    it('should handle product not found when preparing to add to cart', fakeAsync(() => {
      productService.getProduct(999).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(cartService.items().length).toBe(0);
        }
      });

      const req = httpMock.expectOne('/api/products/999');
      req.flush(
        { success: false, message: 'Product not found' },
        { status: 404, statusText: 'Not Found' }
      );

      tick();
      flush();
    }));
  });

  describe('Cart Persistence and Recovery', () => {
    it('should restore cart from localStorage on service initialization', () => {
      const savedCart: CartItem[] = [
        {
          offerId: '1-11111111',
          productId: 1,
          distributorDni: '11111111',
          distributorName: 'Distribuidor Norte',
          description: 'Whisky Premium',
          price: 5000,
          qty: 2,
          imageUrl: 'whisky.jpg'
        }
      ];
      localStorage.setItem('cart.v1', JSON.stringify(savedCart));

      const freshService = TestBed.runInInjectionContext(() => new CartService());

      expect(freshService.count()).toBe(2);
      expect(freshService.total()).toBe(10000);
    });

    it('should handle corrupted cart data in localStorage', () => {
      localStorage.setItem('cart.v1', 'invalid json {]');

      const freshService = TestBed.runInInjectionContext(() => new CartService());

      expect(freshService.items()).toEqual([]);
      expect(freshService.count()).toBe(0);
    });
  });
});
