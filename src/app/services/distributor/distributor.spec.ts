import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DistributorService } from './distributor';
import { DistributorDTO, CreateDistributorDTO, PatchDistributorDTO } from '../../models/distributor/distributor.model';

describe('DistributorService', () => {
  let service: DistributorService;
  let httpMock: HttpTestingController;
  const baseUrl = '/api/distributors';

  const mockDistributor: DistributorDTO = {
    dni: '87654321A',
    name: 'Test Distributor',
    phone: '987654321',
    email: 'distributor@test.com',
    address: '123 Test St',
    zoneId: 1,
    zone: {
      id: 1,
      name: 'Zone Norte',
      isHeadquarters: false
    },
    products: [
      { id: 1, description: 'Product 1' },
      { id: 2, description: 'Product 2' }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DistributorService]
    });
    service = TestBed.inject(DistributorService);
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

  describe('getAll()', () => {
    it('should retrieve all distributors successfully', (done) => {
      const mockResponse = [mockDistributor];

      service.getAll().subscribe({
        next: (distributors) => {
          expect(distributors.length).toBe(1);
          expect(distributors[0].dni).toBe('87654321A');
          done();
        }
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle API response with data wrapper', (done) => {
      const mockResponse = {
        data: [mockDistributor],
        success: true,
        message: 'Success'
      };

      service.getAll().subscribe({
        next: (distributors) => {
          expect(distributors.length).toBe(1);
          done();
        }
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(mockResponse);
    });

    it('should handle empty distributor list', (done) => {
      service.getAll().subscribe({
        next: (distributors) => {
          expect(distributors.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush([]);
    });

    it('should handle 500 server error', (done) => {
      service.getAll().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should normalize distributor fields', (done) => {
      const rawResponse = [{
        DNI: '12345678',
        nombre: 'Distribuidor',
        telefono: '111222333',
        email: 'test@test.com'
      }];

      service.getAll().subscribe({
        next: (distributors) => {
          expect(distributors[0].dni).toBe('12345678');
          expect(distributors[0].name).toBe('Distribuidor');
          expect(distributors[0].phone).toBe('111222333');
          done();
        }
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(rawResponse);
    });
  });

  describe('getOne()', () => {
    it('should retrieve distributor by DNI', (done) => {
      const dni = '87654321A';

      service.getOne(dni).subscribe({
        next: (distributor) => {
          expect(distributor.dni).toBe(dni);
          expect(distributor.name).toBe('Test Distributor');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${dni}`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockDistributor });
    });

    it('should encode special characters in DNI', (done) => {
      const dni = '12345678-A';

      service.getOne(dni).subscribe({
        next: (distributor) => {
          expect(distributor).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/12345678-A`);
      req.flush({ data: mockDistributor });
    });

    it('should handle 404 when distributor not found', (done) => {
      service.getOne('99999999').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/99999999`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });

    it('should normalize zone data when present', (done) => {
      const response = {
        data: {
          dni: '12345678',
          name: 'Test',
          phone: '111',
          email: 'test@test.com',
          zona: {
            id: 5,
            nombre: 'Zone Sur',
            isHeadquarters: true
          }
        }
      };

      service.getOne('12345678').subscribe({
        next: (distributor) => {
          expect(distributor.zone).toBeDefined();
          expect(distributor.zone?.id).toBe(5);
          expect(distributor.zone?.name).toBe('Zone Sur');
          expect(distributor.zone?.isHeadquarters).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/12345678`);
      req.flush(response);
    });

    it('should normalize zone when only zoneId is present', (done) => {
      const response = {
        data: {
          dni: '12345678',
          name: 'Test',
          phone: '111',
          email: 'test@test.com',
          zoneId: 10
        }
      };

      service.getOne('12345678').subscribe({
        next: (distributor) => {
          expect(distributor.zone).toBeDefined();
          expect(distributor.zone?.id).toBe(10);
          expect(distributor.zone?.name).toBe('');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/12345678`);
      req.flush(response);
    });

    it('should handle products as string', (done) => {
      const response = {
        data: {
          dni: '12345678',
          name: 'Test',
          phone: '111',
          email: 'test@test.com',
          products: 'Information not available'
        }
      };

      service.getOne('12345678').subscribe({
        next: (distributor) => {
          expect(distributor.products).toEqual([]);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/12345678`);
      req.flush(response);
    });
  });

  describe('create()', () => {
    it('should create new distributor successfully', (done) => {
      const createData: CreateDistributorDTO = {
        dni: '87654321A',
        name: 'New Distributor',
        phone: '987654321',
        email: 'new@test.com',
        address: '123 Main St',
        zoneId: 1,
        productsIds: [1, 2]
      };

      service.create(createData).subscribe({
        next: (distributor) => {
          expect(distributor.dni).toBe('87654321A');
          done();
        }
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.zoneId).toBe('1'); // Should be string
      expect(req.request.body.address).toBe('123 Main St');
      req.flush({ data: mockDistributor });
    });

    it('should convert zoneId to string', (done) => {
      const createData: CreateDistributorDTO = {
        dni: '87654321A',
        name: 'New Distributor',
        phone: '987654321',
        email: 'new@test.com',
        zoneId: 5,
        productsIds: []
      };

      service.create(createData).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.body.zoneId).toBe('5');
      expect(typeof req.request.body.zoneId).toBe('string');
      req.flush({ data: mockDistributor });
    });

    it('should use default address if not provided', (done) => {
      const createData: CreateDistributorDTO = {
        dni: '87654321A',
        name: 'New Distributor',
        phone: '987654321',
        email: 'new@test.com',
        zoneId: 1,
        productsIds: []
      };

      service.create(createData).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.body.address).toBe('-');
      req.flush({ data: mockDistributor });
    });

    it('should include username and password when provided', (done) => {
      const createData: CreateDistributorDTO = {
        dni: '87654321A',
        name: 'New Distributor',
        phone: '987654321',
        email: 'new@test.com',
        zoneId: 1,
        productsIds: [],
        username: 'testuser',
        password: 'Test123!'
      };

      service.create(createData).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.body.username).toBe('testuser');
      expect(req.request.body.password).toBe('Test123!');
      req.flush({ data: mockDistributor });
    });

    it('should filter invalid productsIds', (done) => {
      const createData: CreateDistributorDTO = {
        dni: '87654321A',
        name: 'New Distributor',
        phone: '987654321',
        email: 'new@test.com',
        zoneId: 1,
        productsIds: [1, NaN, 2, undefined as any, 3]
      };

      service.create(createData).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.body.productsIds).toEqual([1, 2, 3]);
      req.flush({ data: mockDistributor });
    });

    it('should handle 409 duplicate DNI error', (done) => {
      const createData: CreateDistributorDTO = {
        dni: '87654321A',
        name: 'New Distributor',
        phone: '987654321',
        email: 'new@test.com',
        zoneId: 1,
        productsIds: []
      };

      service.create(createData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(409);
          done();
        }
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush('Duplicate DNI', { status: 409, statusText: 'Conflict' });
    });

    it('should trim whitespace from fields', (done) => {
      const createData: CreateDistributorDTO = {
        dni: '  87654321A  ',
        name: '  New Distributor  ',
        phone: '  987654321  ',
        email: '  new@test.com  ',
        zoneId: 1,
        productsIds: []
      };

      service.create(createData).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.body.dni).toBe('87654321A');
      expect(req.request.body.name).toBe('New Distributor');
      expect(req.request.body.phone).toBe('987654321');
      expect(req.request.body.email).toBe('new@test.com');
      req.flush({ data: mockDistributor });
    });
  });

  describe('update()', () => {
    it('should update existing distributor', (done) => {
      const dni = '87654321A';
      const patchData: PatchDistributorDTO = {
        name: 'Updated Name',
        phone: '111222333'
      };

      service.update(dni, patchData).subscribe({
        next: (distributor) => {
          expect(distributor.dni).toBe(dni);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${dni}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body.name).toBe('Updated Name');
      expect(req.request.body.phone).toBe('111222333');
      req.flush({ data: mockDistributor });
    });

    it('should only send provided fields', (done) => {
      const dni = '87654321A';
      const patchData: PatchDistributorDTO = {
        phone: '111222333'
      };

      service.update(dni, patchData).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(`${baseUrl}/${dni}`);
      expect(req.request.body.phone).toBe('111222333');
      expect(req.request.body.name).toBeUndefined();
      expect(req.request.body.email).toBeUndefined();
      req.flush({ data: mockDistributor });
    });

    it('should convert zoneId to string on update', (done) => {
      const dni = '87654321A';
      const patchData: PatchDistributorDTO = {
        zoneId: 10
      };

      service.update(dni, patchData).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(`${baseUrl}/${dni}`);
      expect(req.request.body.zoneId).toBe('10');
      expect(typeof req.request.body.zoneId).toBe('string');
      req.flush({ data: mockDistributor });
    });

    it('should handle 404 when updating non-existent distributor', (done) => {
      const patchData: PatchDistributorDTO = {
        name: 'Updated'
      };

      service.update('99999999', patchData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/99999999`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });

    it('should filter invalid productsIds on update', (done) => {
      const dni = '87654321A';
      const patchData: PatchDistributorDTO = {
        productsIds: [1, NaN, 2, null as any, 3]
      };

      service.update(dni, patchData).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(`${baseUrl}/${dni}`);
      expect(req.request.body.productsIds).toEqual([1, 2, 3]);
      req.flush({ data: mockDistributor });
    });

    it('should trim whitespace from updated fields', (done) => {
      const dni = '87654321A';
      const patchData: PatchDistributorDTO = {
        name: '  Updated Name  ',
        email: '  updated@test.com  '
      };

      service.update(dni, patchData).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(`${baseUrl}/${dni}`);
      expect(req.request.body.name).toBe('Updated Name');
      expect(req.request.body.email).toBe('updated@test.com');
      req.flush({ data: mockDistributor });
    });
  });

  describe('delete()', () => {
    it('should delete distributor successfully', (done) => {
      const dni = '87654321A';

      service.delete(dni).subscribe({
        next: (response) => {
          expect(response.message).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/${dni}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Distributor deleted successfully' });
    });

    it('should encode special characters in DNI for delete', (done) => {
      const dni = '12345678-A';

      service.delete(dni).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(`${baseUrl}/12345678-A`);
      req.flush({ message: 'Deleted' });
    });

    it('should handle 404 when deleting non-existent distributor', (done) => {
      service.delete('99999999').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/99999999`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('search()', () => {
    it('should search distributors with query', (done) => {
      service.search({ q: 'Test' }).subscribe({
        next: (distributors) => {
          expect(distributors).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(req =>
        req.url.includes(`${baseUrl}/search`) &&
        req.params.get('q') === 'Test'
      );
      expect(req.request.method).toBe('GET');
      req.flush([mockDistributor]);
    });

    it('should search by name', (done) => {
      service.search({ q: 'Distributor', by: 'name' }).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(req =>
        req.url.includes(`${baseUrl}/search`) &&
        req.params.get('by') === 'name'
      );
      req.flush([]);
    });

    it('should search by zone', (done) => {
      service.search({ q: 'Norte', by: 'zone' }).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(req =>
        req.url.includes(`${baseUrl}/search`) &&
        req.params.get('by') === 'zone'
      );
      req.flush([]);
    });

    it('should search with pagination', (done) => {
      service.search({ q: 'Test', page: 2, limit: 10 }).subscribe({
        next: () => done()
      });

      const req = httpMock.expectOne(req =>
        req.url.includes(`${baseUrl}/search`) &&
        req.params.get('page') === '2' &&
        req.params.get('limit') === '10'
      );
      req.flush([]);
    });

    it('should handle empty search results', (done) => {
      service.search({ q: 'NonExistent' }).subscribe({
        next: (distributors) => {
          expect(distributors.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(req =>
        req.url.includes(`${baseUrl}/search`)
      );
      req.flush([]);
    });

    it('should normalize search results', (done) => {
      const rawResults = [{
        DNI: '11111111',
        nombre: 'Dist 1',
        telefono: '111',
        email: 'dist1@test.com'
      }];

      service.search({ q: 'Test' }).subscribe({
        next: (distributors) => {
          expect(distributors[0].dni).toBe('11111111');
          expect(distributors[0].name).toBe('Dist 1');
          done();
        }
      });

      const req = httpMock.expectOne(req =>
        req.url.includes(`${baseUrl}/search`)
      );
      req.flush(rawResults);
    });
  });

  describe('Error Handling', () => {
    it('should handle network error', (done) => {
      service.getAll().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(baseUrl);
      req.error(new ProgressEvent('Network error'));
    });

    it('should handle timeout', (done) => {
      service.getAll().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(408);
          done();
        }
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush('Timeout', { status: 408, statusText: 'Request Timeout' });
    });
  });
});
