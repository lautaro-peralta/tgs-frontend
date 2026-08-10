/**
 * Integration Tests: Product CRUD
 *
 * Complete integration tests for product CRUD
 * Integrates real ProductService with HTTP response simulation
 * Verifies complete flow of creating, reading, updating and deleting products
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductService } from '../../src/app/services/product/product';
import { ProductDTO, CreateProductDTO, UpdateProductDTO } from '../../src/app/models/product/product.model';

describe('Integration: Product CRUD', () => {
  let productService: ProductService;
  let httpMock: HttpTestingController;

  const mockProduct: ProductDTO = {
    id: 1,
    description: 'Test Product',
    detail: 'Test Legal Description',
    price: 99.99,
    stock: 100,
    isIllegal: false,
    imageUrl: 'https://example.com/image.jpg'
  };

  const mockProducts: ProductDTO[] = [
    mockProduct,
    {
      id: 2,
      description: 'Product 2',
      detail: 'Legal 2',
      price: 49.99,
      stock: 50,
      isIllegal: false,
      imageUrl: undefined
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductService]
    });

    productService = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  /**
   * Test 1: List products → Display in observable
   * Verifies that service fetches products and observable emits correctly
   */
  it('should fetch products list and emit to subscribers', (done) => {
    // Subscribe to getAllProducts()
    productService.getAllProducts().subscribe({
      next: (products) => {
        // Verify products are received
        expect(products).toBeDefined();
        expect(products.length).toBe(2);
        expect(products[0].description).toBe('Test Product');
        expect(products[1].description).toBe('Product 2');

        // Verify product structure
        expect(products[0].id).toBeDefined();
        expect(products[0].price).toBe(99.99);
        expect(products[0].stock).toBe(100);

        done();
      },
      error: (error) => {
        fail('Should not error: ' + JSON.stringify(error));
        done();
      }
    });

    // Mock HTTP response
    const req = httpMock.expectOne('/api/products');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);

    // Simulate backend response format (with data wrapper)
    req.flush({ data: mockProducts });
  });

  /**
   * Test 2: Create product → Refresh list → New product appears
   * Verifies complete flow of creation and list update
   */
  it('should create product and update list with new item', (done) => {
    const newProductData: CreateProductDTO = {
      description: 'New Product',
      detail: 'New Legal',
      price: 79.99,
      stock: 25,
      isIllegal: false
    };

    const createdProduct: ProductDTO = {
      id: 3,
      ...newProductData,
      imageUrl: undefined
    };

    let stepsCompleted = 0;

    // Step 1: Create product
    productService.createProduct(newProductData).subscribe({
      next: (response) => {
        expect(response.success).toBe(true);
        expect(response.data?.id).toBe(3);
        expect(response.data?.description).toBe('New Product');

        stepsCompleted++;

        // Step 2: Fetch updated list
        productService.getAllProducts().subscribe({
          next: (products) => {
            // Verify new product is in list
            expect(products.length).toBe(3);
            const newProduct = products.find(p => p.id === 3);
            expect(newProduct).toBeDefined();
            expect(newProduct?.description).toBe('New Product');

            stepsCompleted++;
            if (stepsCompleted === 2) done();
          }
        });

        // Mock list response with new product
        const listReq = httpMock.expectOne('/api/products');
        listReq.flush({ data: [...mockProducts, createdProduct] });
      }
    });

    // Mock create response
    const createReq = httpMock.expectOne('/api/products');
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(newProductData);
    createReq.flush({ success: true, data: createdProduct });
  });

  /**
   * Test 3: Edit product → Update reflected in list
   * Verifies that changes are reflected correctly
   */
  it('should update product and reflect changes immediately', (done) => {
    const productId = 1;
    const updateData: UpdateProductDTO = {
      description: 'Updated Product',
      price: 109.99
    };

    const updatedProduct: ProductDTO = {
      ...mockProduct,
      ...updateData
    };

    // Update product
    productService.updateProduct(productId, updateData).subscribe({
      next: (response) => {
        expect(response.success).toBe(true);
        expect(response.data?.description).toBe('Updated Product');
        expect(response.data?.price).toBe(109.99);

        // Verify original fields are preserved
        expect(response.data?.id).toBe(1);
        expect(response.data?.stock).toBe(100);

        done();
      },
      error: (error) => {
        fail('Update should not fail: ' + JSON.stringify(error));
        done();
      }
    });

    // Mock update response
    const req = httpMock.expectOne(`/api/products/${productId}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(updateData);
    req.flush({ success: true, data: updatedProduct });
  });

  /**
   * Test 4: Delete product → Remove from list
   * Verifies that product disappears from list after deletion
   */
  it('should delete product and remove from list', (done) => {
    const productId = 1;

    let stepsCompleted = 0;

    // Step 1: Delete product
    productService.deleteProduct(productId).subscribe({
      next: (response) => {
        expect(response.success).toBe(true);
        stepsCompleted++;

        // Step 2: Fetch updated list (product should be gone)
        productService.getAllProducts().subscribe({
          next: (products) => {
            // Verify product is removed
            expect(products.length).toBe(1);
            expect(products.find(p => p.id === productId)).toBeUndefined();
            expect(products[0].id).toBe(2); // Only second product remains

            stepsCompleted++;
            if (stepsCompleted === 2) done();
          }
        });

        // Mock list response without deleted product
        const listReq = httpMock.expectOne('/api/products');
        listReq.flush({ data: [mockProducts[1]] });
      }
    });

    // Mock delete response
    const deleteReq = httpMock.expectOne(`/api/products/${productId}`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush({ success: true, message: 'Product deleted' });
  });

  /**
   * Test 5: Network error → Retry logic
   * Verifies error handling and retries
   */
  it('should handle network errors and retry successfully', (done) => {
    let attemptCount = 0;

    const attemptFetch = () => {
      attemptCount++;

      productService.getAllProducts().subscribe({
        next: (products) => {
          expect(products).toBeDefined();
          expect(attemptCount).toBe(2); // Success on second attempt
          done();
        },
        error: (error) => {
          expect(error).toBeDefined();
          expect(attemptCount).toBe(1); // First attempt failed

          // Retry after error
          attemptFetch();
        }
      });

      const req = httpMock.expectOne('/api/products');

      if (attemptCount === 1) {
        // First attempt: Network error
        req.error(new ProgressEvent('Network error'));
      } else {
        // Second attempt: Success
        req.flush({ data: mockProducts });
      }
    };

    attemptFetch();
  });

  /**
   * Integration Test: Search products with filters
   */
  it('should search products with filters and return filtered results', (done) => {
    const searchParams = {
      q: 'Test',
      by: 'description' as const,
      min: 50,
      max: 150,
      page: 1,
      limit: 10
    };

    productService.searchProducts(searchParams).subscribe({
      next: (products) => {
        expect(products).toBeDefined();
        expect(products.length).toBe(1);
        expect(products[0].description).toContain('Test');
        expect(products[0].price).toBeGreaterThanOrEqual(50);
        expect(products[0].price).toBeLessThanOrEqual(150);

        done();
      }
    });

    const req = httpMock.expectOne((request) => {
      return request.url === '/api/products/search' &&
             request.params.has('q') &&
             request.params.get('q') === 'Test';
    });

    expect(req.request.method).toBe('GET');
    req.flush({ data: [mockProduct] });
  });

  /**
   * Integration Test: Get single product by ID
   */
  it('should fetch single product by ID', (done) => {
    const productId = 1;

    productService.getProduct(productId).subscribe({
      next: (product) => {
        expect(product).toBeDefined();
        expect(product.id).toBe(productId);
        expect(product.description).toBe('Test Product');

        done();
      }
    });

    const req = httpMock.expectOne(`/api/products/${productId}`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockProduct });
  });

  /**
   * Edge Case: Create product with missing optional fields
   */
  it('should create product with only required fields', (done) => {
    const minimalProduct: CreateProductDTO = {
      description: 'Minimal Product',
      detail: 'Legal',
      price: 19.99,
      stock: 10,
      isIllegal: false
    };

    productService.createProduct(minimalProduct).subscribe({
      next: (response) => {
        expect(response.success).toBe(true);
        expect(response.data?.imageUrl).toBeUndefined();
        done();
      }
    });

    const req = httpMock.expectOne('/api/products');
    req.flush({
      success: true,
      data: {
        id: 4,
        ...minimalProduct,
        imageUrl: undefined
      }
    });
  });

  /**
   * Edge Case: Update product with validation error
   */
  it('should handle validation errors when updating product', (done) => {
    const invalidUpdate: UpdateProductDTO = {
      price: -10 // Invalid negative price
    };

    productService.updateProduct(1, invalidUpdate).subscribe({
      error: (error) => {
        expect(error.status).toBe(400);
        expect(error.error.message).toContain('Invalid');
        done();
      }
    });

    const req = httpMock.expectOne('/api/products/1');
    req.flush(
      { success: false, message: 'Invalid price value' },
      { status: 400, statusText: 'Bad Request' }
    );
  });

  /**
   * Edge Case: Delete non-existent product
   */
  it('should handle 404 when deleting non-existent product', (done) => {
    const nonExistentId = 999;

    productService.deleteProduct(nonExistentId).subscribe({
      error: (error) => {
        expect(error.status).toBe(404);
        done();
      }
    });

    const req = httpMock.expectOne(`/api/products/${nonExistentId}`);
    req.flush(
      { success: false, message: 'Product not found' },
      { status: 404, statusText: 'Not Found' }
    );
  });
});
