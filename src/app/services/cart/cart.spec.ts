import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CartService, CartItem } from './cart';
import { ProductOffer } from '../../models/product/product.model';

describe('CartService', () => {
  let service: CartService;
  let httpMock: HttpTestingController;

  const mockOfferA: ProductOffer = {
    offerId: '1-11111111',
    productId: 1,
    description: 'Whisky Premium',
    detail: 'Premium whisky',
    imageUrl: 'whisky.jpg',
    price: 5000,
    stock: 10,
    isIllegal: false,
    distributorDni: '11111111',
    distributorName: 'Distribuidor Norte',
    zone: { id: 1, name: 'Zona Norte', isHeadquarters: false }
  };

  const mockOfferB: ProductOffer = {
    offerId: '2-11111111',
    productId: 2,
    description: 'Wine Malbec',
    detail: 'Argentine wine',
    imageUrl: 'wine.jpg',
    price: 3000,
    stock: 20,
    isIllegal: false,
    distributorDni: '11111111',
    distributorName: 'Distribuidor Norte',
    zone: { id: 1, name: 'Zona Norte', isHeadquarters: false }
  };

  const mockOfferC: ProductOffer = {
    offerId: '3-22222222',
    productId: 3,
    description: 'Vodka Imported',
    detail: 'Imported vodka',
    imageUrl: 'vodka.jpg',
    price: 4500,
    stock: 15,
    isIllegal: false,
    distributorDni: '22222222',
    distributorName: 'Distribuidor Sur',
    zone: { id: 2, name: 'Zona Sur', isHeadquarters: true }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CartService]
    });
    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);

    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty cart', () => {
      expect(service.items()).toEqual([]);
    });

    it('should initialize with count 0', () => {
      expect(service.count()).toBe(0);
    });

    it('should initialize with total 0', () => {
      expect(service.total()).toBe(0);
    });

    it('should load cart from localStorage if exists', () => {
      const savedCart: CartItem[] = [
        { offerId: '1-11111111', productId: 1, distributorDni: '11111111', distributorName: 'Distribuidor Norte', description: 'Product 1', price: 100, qty: 2, imageUrl: null }
      ];
      localStorage.setItem('cart.v1', JSON.stringify(savedCart));

      const freshService = TestBed.runInInjectionContext(() => new CartService());

      expect(freshService.items()).toEqual(savedCart);
      expect(freshService.count()).toBe(2);
      expect(freshService.total()).toBe(200);
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('cart.v1', 'invalid json data');

      const freshService = TestBed.runInInjectionContext(() => new CartService());

      expect(freshService.items()).toEqual([]);
    });
  });

  describe('add()', () => {
    it('should add a new offer to the cart', () => {
      service.add(mockOfferA);

      expect(service.items().length).toBe(1);
      expect(service.items()[0]).toEqual({
        offerId: '1-11111111',
        productId: 1,
        distributorDni: '11111111',
        distributorName: 'Distribuidor Norte',
        description: 'Whisky Premium',
        price: 5000,
        imageUrl: 'whisky.jpg',
        qty: 1,
        zone: { id: 1, name: 'Zona Norte', isHeadquarters: false }
      });
    });

    it('should increment quantity if the same offer already exists', () => {
      service.add(mockOfferA);
      service.add(mockOfferA);

      expect(service.items().length).toBe(1);
      expect(service.items()[0].qty).toBe(2);
    });

    it('should treat the same product from different distributors as separate offers', () => {
      const sameProductOtherDistributor: ProductOffer = {
        ...mockOfferA,
        offerId: '1-22222222',
        distributorDni: '22222222',
        distributorName: 'Distribuidor Sur'
      };

      service.add(mockOfferA);
      service.add(sameProductOtherDistributor);

      expect(service.items().length).toBe(2);
    });

    it('should persist cart to localStorage when adding', () => {
      service.add(mockOfferA);

      const stored = localStorage.getItem('cart.v1');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(1);
      expect(parsed[0].offerId).toBe('1-11111111');
    });

    it('should update count and total when adding offers', () => {
      service.add(mockOfferA); // 5000
      service.add(mockOfferB); // 3000

      expect(service.count()).toBe(2);
      expect(service.total()).toBe(8000);
    });
  });

  describe('inc()', () => {
    beforeEach(() => service.add(mockOfferA));

    it('should increment quantity for the given offer', () => {
      service.inc('1-11111111');

      expect(service.items()[0].qty).toBe(2);
      expect(service.total()).toBe(10000);
    });

    it('should do nothing if the offer is not in the cart', () => {
      service.inc('non-existent');

      expect(service.items()[0].qty).toBe(1);
    });
  });

  describe('dec()', () => {
    it('should decrement quantity for the given offer', () => {
      service.add(mockOfferA);
      service.inc('1-11111111'); // qty = 2

      service.dec('1-11111111');

      expect(service.items()[0].qty).toBe(1);
    });

    it('should remove the offer once quantity reaches 0', () => {
      service.add(mockOfferA); // qty = 1

      service.dec('1-11111111');

      expect(service.items().length).toBe(0);
    });
  });

  describe('remove()', () => {
    it('should remove the offer by offerId', () => {
      service.add(mockOfferA);
      service.add(mockOfferB);

      service.remove('1-11111111');

      expect(service.items().length).toBe(1);
      expect(service.items()[0].offerId).toBe('2-11111111');
    });
  });

  describe('clear()', () => {
    it('should empty the cart and reset count/total', () => {
      service.add(mockOfferA);
      service.add(mockOfferB);

      service.clear();

      expect(service.items().length).toBe(0);
      expect(service.count()).toBe(0);
      expect(service.total()).toBe(0);

      const stored = localStorage.getItem('cart.v1');
      expect(JSON.parse(stored!)).toEqual([]);
    });
  });

  describe('distributorGroups', () => {
    it('should group items from the same distributor into a single group', () => {
      service.add(mockOfferA);
      service.add(mockOfferB);

      const groups = service.distributorGroups();

      expect(groups.length).toBe(1);
      expect(groups[0].dni).toBe('11111111');
      expect(groups[0].items.length).toBe(2);
      expect(groups[0].subtotal).toBe(8000);
    });

    it('should create separate groups per distributor', () => {
      service.add(mockOfferA); // Norte
      service.add(mockOfferC); // Sur

      const groups = service.distributorGroups();

      expect(groups.length).toBe(2);
      expect(groups.map(g => g.dni).sort()).toEqual(['11111111', '22222222']);
    });

    it('should be empty when the cart is empty', () => {
      expect(service.distributorGroups()).toEqual([]);
    });
  });

  describe('hasMultipleDistributors', () => {
    it('should be false with a single distributor', () => {
      service.add(mockOfferA);
      service.add(mockOfferB);

      expect(service.hasMultipleDistributors()).toBeFalse();
    });

    it('should be true with more than one distributor', () => {
      service.add(mockOfferA);
      service.add(mockOfferC);

      expect(service.hasMultipleDistributors()).toBeTrue();
    });
  });

  describe('checkout()', () => {
    it('should create one sale per distributor and report success', () => {
      service.add(mockOfferA); // Distribuidor Norte
      service.add(mockOfferC); // Distribuidor Sur

      let results: any[] | undefined;
      service.checkout('12345678').subscribe(r => (results = r));

      const reqs = httpMock.match('/api/sales');
      expect(reqs.length).toBe(2);

      reqs.forEach(req => {
        expect(req.request.method).toBe('POST');
        expect(req.request.body.clientDni).toBe('12345678');
        const dni = req.request.body.distributorDni;
        req.flush({ success: true, message: 'ok', data: { id: dni === '11111111' ? 100 : 200 } });
      });

      expect(results?.length).toBe(2);
      expect(results?.every(r => r.success)).toBeTrue();
    });

    it('should report partial failure when one distributor request fails', () => {
      service.add(mockOfferA);
      service.add(mockOfferC);

      let results: any[] | undefined;
      service.checkout('12345678').subscribe(r => (results = r));

      const reqs = httpMock.match('/api/sales');
      reqs[0].flush({ success: true, message: 'ok', data: { id: 1 } });
      reqs[1].flush({ message: 'Distribuidor sin stock' }, { status: 400, statusText: 'Bad Request' });

      expect(results?.filter(r => r.success).length).toBe(1);
      expect(results?.filter(r => !r.success).length).toBe(1);
      expect(results?.find(r => !r.success)?.error).toBe('Distribuidor sin stock');
    });

    it('should not clear the cart by itself (caller decides)', () => {
      service.add(mockOfferA);

      service.checkout('12345678').subscribe();

      const req = httpMock.expectOne('/api/sales');
      req.flush({ success: true, message: 'ok', data: { id: 1 } });

      expect(service.items().length).toBe(1);
    });
  });
});
