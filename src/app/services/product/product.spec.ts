import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ProductService } from './product';
import { ProductDTO, CreateProductDTO, UpdateProductDTO } from '../../models/product/product.model';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  const mockProduct: ProductDTO = {
    id: 1,
    description: 'Test Product Description',
    detail: 'Additional details',
    price: 99.99,
    stock: 100,
    isIllegal: false
  };

  const mockProductsArray: ProductDTO[] = [
    mockProduct,
    { ...mockProduct, id: 2, description: 'Product 2', price: 149.99 }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductService]
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllProducts', () => {
    it('should return products array when response has data property', () => {
      service.getAllProducts().subscribe(products => {
        expect(products).toEqual(mockProductsArray);
        expect(products.length).toBe(2);
      });

      // Use URL matcher to ignore cache-busting query parameters (_t, _r)
      const req = httpMock.expectOne((request) => {
        const url = new URL(request.url, 'http://localhost');
        return url.pathname === '/api/products' && request.method === 'GET';
      });
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ data: mockProductsArray });
    });
  });

  describe('list', () => {
    it('should be an alias for getAllProducts', () => {
      service.list().subscribe(products => {
        expect(products).toEqual(mockProductsArray);
      });

      // Use URL matcher to ignore cache-busting query parameters (_t, _r)
      const req = httpMock.expectOne((request) => {
        const url = new URL(request.url, 'http://localhost');
        return url.pathname === '/api/products' && request.method === 'GET';
      });
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockProductsArray });
    });
  });

  describe('getProduct', () => {
    it('should return product when response has data property', () => {
      service.getProduct(1).subscribe(product => {
        expect(product).toEqual(mockProduct);
      });

      const req = httpMock.expectOne('/api/products/1');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ data: mockProduct });
    });

    it('should get product with different id', () => {
      service.getProduct(42).subscribe(product => {
        expect(product).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/products/42');
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockProduct });
    });
  });

  describe('createProduct', () => {
    it('should create product with full payload', () => {
      const createPayload: CreateProductDTO = {
        description: 'New Product Description',
        detail: 'New product details',
        price: 199.99,
        stock: 50,
        isIllegal: false
      };

      service.createProduct(createPayload).subscribe(response => {
        expect(response.data).toEqual(mockProduct);
      });

      const req = httpMock.expectOne('/api/products');
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.body).toEqual(createPayload);
      req.flush({ data: mockProduct });
    });

    it('should create product with minimal payload', () => {
      const createPayload: CreateProductDTO = {
        description: 'Minimal Product',
        detail: 'Details',
        price: 10.00,
        stock: 5,
        isIllegal: false
      };

      service.createProduct(createPayload).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/products');
      expect(req.request.method).toBe('POST');
      req.flush({ data: mockProduct });
    });
  });

  describe('updateProduct', () => {
    it('should update product with full payload', () => {
      const updatePayload: UpdateProductDTO = {
        description: 'Updated Product Description',
        detail: 'Updated details',
        price: 299.99,
        stock: 200
      };

      service.updateProduct(1, updatePayload).subscribe(response => {
        expect(response.data).toEqual(mockProduct);
      });

      const req = httpMock.expectOne('/api/products/1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.body).toEqual(updatePayload);
      req.flush({ data: mockProduct });
    });

    it('should update product with partial payload', () => {
      const updatePayload: UpdateProductDTO = {
        price: 149.99
      };

      service.updateProduct(5, updatePayload).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/products/5');
      expect(req.request.method).toBe('PATCH');
      req.flush({ data: mockProduct });
    });

    it('should update product description only', () => {
      const updatePayload: UpdateProductDTO = {
        description: 'New Description'
      };

      service.updateProduct(10, updatePayload).subscribe();

      const req = httpMock.expectOne('/api/products/10');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updatePayload);
      req.flush({ data: mockProduct });
    });
  });

  describe('deleteProduct', () => {
    it('should delete product by id', () => {
      service.deleteProduct(1).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/products/1');
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ success: true });
    });

    it('should delete product with different id', () => {
      service.deleteProduct(99).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne('/api/products/99');
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });

  describe('searchProducts', () => {
    it('should search with query parameter', () => {
      service.searchProducts({ q: 'test' }).subscribe(products => {
        expect(products).toEqual(mockProductsArray);
      });

      const req = httpMock.expectOne(r => r.url === '/api/products/search');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.params.get('q')).toBe('test');
      req.flush({ data: mockProductsArray });
    });

    it('should search with by description', () => {
      service.searchProducts({ by: 'description' }).subscribe(products => {
        expect(products).toBeTruthy();
      });

      const req = httpMock.expectOne(r => r.url === '/api/products/search');
      expect(req.request.params.get('by')).toBe('description');
      req.flush({ data: mockProductsArray });
    });

    it('should search with by legal', () => {
      service.searchProducts({ by: 'legal' }).subscribe(products => {
        expect(products).toBeTruthy();
      });

      const req = httpMock.expectOne(r => r.url === '/api/products/search');
      expect(req.request.params.get('by')).toBe('legal');
      req.flush({ data: mockProductsArray });
    });

    it('should search with price range', () => {
      service.searchProducts({ min: 10, max: 100 }).subscribe(products => {
        expect(products).toBeTruthy();
      });

      const req = httpMock.expectOne(r => r.url === '/api/products/search');
      expect(req.request.params.get('min')).toBe('10');
      expect(req.request.params.get('max')).toBe('100');
      req.flush({ data: mockProductsArray });
    });

    it('should search with pagination', () => {
      service.searchProducts({ page: 2, limit: 20 }).subscribe(products => {
        expect(products).toBeTruthy();
      });

      const req = httpMock.expectOne(r => r.url === '/api/products/search');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('20');
      req.flush({ data: mockProductsArray });
    });

    it('should search with all parameters', () => {
      const params = {
        q: 'search term',
        by: 'description' as const,
        min: 50,
        max: 500,
        page: 1,
        limit: 10
      };

      service.searchProducts(params).subscribe(products => {
        expect(products).toEqual(mockProductsArray);
      });

      const req = httpMock.expectOne(r => r.url === '/api/products/search');
      expect(req.request.params.get('q')).toBe('search term');
      expect(req.request.params.get('by')).toBe('description');
      expect(req.request.params.get('min')).toBe('50');
      expect(req.request.params.get('max')).toBe('500');
      req.flush({ data: mockProductsArray });
    });

    it('should search with empty params', () => {
      service.searchProducts({}).subscribe(products => {
        expect(products).toBeTruthy();
      });

      const req = httpMock.expectOne(r => r.url === '/api/products/search');
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockProductsArray });
    });
  });
});
