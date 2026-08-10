import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminService } from './admin';
import { ApiResponse, AdminDTO, CreateAdminDTO, PatchAdminDTO } from '../../models/admin/admin.model';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/admin';

  const mockAdmin: AdminDTO = {
    dni: '12345678',
    name: 'Admin User',
    email: 'admin@test.com',
    phone: '555-0001'
  };

  const mockAdmin2: AdminDTO = {
    dni: '87654321',
    name: 'Super Admin',
    email: 'superadmin@test.com',
    phone: '555-0002'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminService]
    });
    service = TestBed.inject(AdminService);
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

  describe('list()', () => {
    it('should fetch all admins', () => {
      const mockResponse: ApiResponse<AdminDTO[]> = {
        message: 'Admins retrieved successfully',
        data: [mockAdmin, mockAdmin2]
      };

      service.list().subscribe(response => {
        expect(response.data.length).toBe(2);
        expect(response.data[0]).toEqual(mockAdmin);
        expect(response.data[1]).toEqual(mockAdmin2);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle empty admin list', () => {
      const mockResponse: ApiResponse<AdminDTO[]> = {
        message: 'No admins found',
        data: []
      };

      service.list().subscribe(response => {
        expect(response.data).toEqual([]);
        expect(response.data.length).toBe(0);
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockResponse);
    });

    it('should handle HTTP error on list', () => {
      service.list().subscribe(
        () => fail('should have failed with error'),
        (error) => {
          expect(error.status).toBe(500);
        }
      );

      const req = httpMock.expectOne(apiUrl);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should return admins with phone numbers', () => {
      const adminsWithPhone: AdminDTO[] = [
        { ...mockAdmin, phone: '111-222-3333' },
        { ...mockAdmin2, phone: '444-555-6666' }
      ];

      const mockResponse: ApiResponse<AdminDTO[]> = {
        data: adminsWithPhone
      };

      service.list().subscribe(response => {
        expect(response.data.length).toBe(2);
        expect(response.data[0].phone).toBe('111-222-3333');
        expect(response.data[1].phone).toBe('444-555-6666');
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockResponse);
    });
  });

  describe('search()', () => {
    it('should search admins with query parameter', () => {
      const mockResponse: ApiResponse<AdminDTO[]> = {
        message: 'Search results',
        data: [mockAdmin]
      };

      service.search('Admin User').subscribe(response => {
        expect(response.data.length).toBe(1);
        expect(response.data[0].name).toBe('Admin User');
      });

      const req = httpMock.expectOne(request => {
        return request.url === `${apiUrl}/search` &&
               request.params.get('q') === 'Admin User';
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should search without query parameter', () => {
      const mockResponse: ApiResponse<AdminDTO[]> = {
        message: 'All admins',
        data: [mockAdmin, mockAdmin2]
      };

      service.search().subscribe(response => {
        expect(response.data.length).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/search`);
      expect(req.request.params.keys().length).toBe(0);
      req.flush(mockResponse);
    });

    it('should search by email', () => {
      const mockResponse: ApiResponse<AdminDTO[]> = {
        message: 'Found',
        data: [mockAdmin]
      };

      service.search('admin@test.com').subscribe();

      const req = httpMock.expectOne(request => {
        return request.params.get('q') === 'admin@test.com';
      });
      req.flush(mockResponse);
    });

    it('should handle no results found', () => {
      const mockResponse: ApiResponse<AdminDTO[]> = {
        message: 'No results',
        data: []
      };

      service.search('nonexistent').subscribe(response => {
        expect(response.data.length).toBe(0);
      });

      const req = httpMock.expectOne(request => request.url.includes('/search'));
      req.flush(mockResponse);
    });

    it('should handle search error', () => {
      service.search('test').subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(error.status).toBe(400);
        }
      );

      const req = httpMock.expectOne(request => request.url.includes('/search'));
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('get()', () => {
    it('should fetch admin by DNI', () => {
      const mockResponse: ApiResponse<AdminDTO> = {
        message: 'Admin found',
        data: mockAdmin
      };

      service.get('12345678').subscribe(response => {
        expect(response.data.dni).toBe('12345678');
        expect(response.data.name).toBe('Admin User');
      });

      const req = httpMock.expectOne(`${apiUrl}/12345678`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle 404 error for non-existent admin', () => {
      const errorResponse = {
        message: 'Admin not found'
      };

      service.get('00000000').subscribe(
        () => fail('should have failed with 404 error'),
        (error) => {
          expect(error.status).toBe(404);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/00000000`);
      req.flush(errorResponse, { status: 404, statusText: 'Not Found' });
    });

    it('should fetch different admin by DNI', () => {
      const mockResponse: ApiResponse<AdminDTO> = {
        message: 'Found',
        data: mockAdmin2
      };

      service.get('87654321').subscribe(response => {
        expect(response.data.dni).toBe('87654321');
        expect(response.data.name).toBe('Super Admin');
      });

      const req = httpMock.expectOne(`${apiUrl}/87654321`);
      req.flush(mockResponse);
    });

    it('should handle invalid DNI format', () => {
      service.get('invalid-dni').subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(error.status).toBe(400);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/invalid-dni`);
      req.flush('Invalid DNI format', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('create()', () => {
    const createData: CreateAdminDTO = {
      dni: '11111111',
      name: 'New Admin',
      email: 'newadmin@test.com',
      phone: '555-1234'
    };

    it('should create a new admin', () => {
      const mockResponse: ApiResponse<AdminDTO> = {
        message: 'Admin created successfully',
        data: {
          dni: '11111111',
          name: 'New Admin',
          email: 'newadmin@test.com',
          phone: '555-1234'
        }
      };

      service.create(createData).subscribe(response => {
        expect(response.data.dni).toBe('11111111');
        expect(response.data.name).toBe('New Admin');
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createData);
      req.flush(mockResponse);
    });

    it('should handle validation errors on create', () => {
      const invalidData: CreateAdminDTO = {
        dni: '',
        name: '',
        email: 'invalid-email'
      };

      const errorResponse = {
        message: 'Validation failed',
        data: null as any
      };

      service.create(invalidData).subscribe(
        () => fail('should have failed with validation error'),
        (error) => {
          expect(error.status).toBe(400);
        }
      );

      const req = httpMock.expectOne(apiUrl);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle duplicate DNI error', () => {
      const duplicateData: CreateAdminDTO = {
        dni: '12345678', // Already exists
        name: 'Test',
        email: 'test@test.com'
      };

      service.create(duplicateData).subscribe(
        () => fail('should have failed with conflict error'),
        (error) => {
          expect(error.status).toBe(409);
        }
      );

      const req = httpMock.expectOne(apiUrl);
      req.flush('Admin already exists', { status: 409, statusText: 'Conflict' });
    });

    it('should create admin without phone', () => {
      const dataNoPhone: CreateAdminDTO = {
        dni: '22222222',
        name: 'No Phone Admin',
        email: 'nophone@test.com'
      };

      const mockResponse: ApiResponse<AdminDTO> = {
        data: {
          dni: '22222222',
          name: 'No Phone Admin',
          email: 'nophone@test.com',
          phone: null
        }
      };

      service.create(dataNoPhone).subscribe(response => {
        expect(response.data.phone).toBeNull();
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockResponse);
    });

    it('should handle server error on create', () => {
      service.create(createData).subscribe(
        () => fail('should have failed with server error'),
        (error) => {
          expect(error.status).toBe(500);
        }
      );

      const req = httpMock.expectOne(apiUrl);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('update()', () => {
    const updateData: PatchAdminDTO = {
      name: 'Updated Admin',
      email: 'updated@test.com'
    };

    it('should update an existing admin', () => {
      const mockResponse: ApiResponse<AdminDTO> = {
        message: 'Admin updated successfully',
        data: {
          ...mockAdmin,
          name: 'Updated Admin',
          email: 'updated@test.com'
        }
      };

      service.update('12345678', updateData).subscribe(response => {
        expect(response.data.name).toBe('Updated Admin');
        expect(response.data.email).toBe('updated@test.com');
      });

      const req = httpMock.expectOne(`${apiUrl}/12345678`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockResponse);
    });

    it('should handle 404 error when updating non-existent admin', () => {
      service.update('00000000', updateData).subscribe(
        () => fail('should have failed with 404 error'),
        (error) => {
          expect(error.status).toBe(404);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/00000000`);
      req.flush('Admin not found', { status: 404, statusText: 'Not Found' });
    });

    it('should update admin phone', () => {
      const phoneUpdate: PatchAdminDTO = {
        phone: '999-888-7777'
      };

      const mockResponse: ApiResponse<AdminDTO> = {
        message: 'Phone updated',
        data: {
          ...mockAdmin,
          phone: '999-888-7777'
        }
      };

      service.update('12345678', phoneUpdate).subscribe(response => {
        expect(response.data.phone).toBe('999-888-7777');
      });

      const req = httpMock.expectOne(`${apiUrl}/12345678`);
      req.flush(mockResponse);
    });

    it('should update only name', () => {
      const nameUpdate: PatchAdminDTO = {
        name: 'Only Name Updated'
      };

      const mockResponse: ApiResponse<AdminDTO> = {
        data: {
          ...mockAdmin,
          name: 'Only Name Updated'
        }
      };

      service.update('12345678', nameUpdate).subscribe(response => {
        expect(response.data.name).toBe('Only Name Updated');
        expect(response.data.email).toBe(mockAdmin.email); // Unchanged
      });

      const req = httpMock.expectOne(`${apiUrl}/12345678`);
      req.flush(mockResponse);
    });

    it('should handle validation error on update', () => {
      const invalidUpdate: PatchAdminDTO = {
        email: 'invalid-email-format'
      };

      service.update('12345678', invalidUpdate).subscribe(
        () => fail('should have failed with validation error'),
        (error) => {
          expect(error.status).toBe(400);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/12345678`);
      req.flush('Invalid email format', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle authorization error on update', () => {
      service.update('12345678', updateData).subscribe(
        () => fail('should have failed with auth error'),
        (error) => {
          expect(error.status).toBe(403);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/12345678`);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('delete()', () => {
    it('should delete an admin by DNI', () => {
      service.delete('12345678').subscribe(() => {
        // Success - no data expected
        expect(true).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/12345678`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle 404 error when deleting non-existent admin', () => {
      service.delete('00000000').subscribe(
        () => fail('should have failed with 404 error'),
        (error) => {
          expect(error.status).toBe(404);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/00000000`);
      req.flush('Admin not found', { status: 404, statusText: 'Not Found' });
    });

    it('should delete different admin', () => {
      service.delete('87654321').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/87654321`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle authorization error on delete', () => {
      service.delete('12345678').subscribe(
        () => fail('should have failed with auth error'),
        (error) => {
          expect(error.status).toBe(403);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/12345678`);
      req.flush('Forbidden - Cannot delete this admin', { status: 403, statusText: 'Forbidden' });
    });

    it('should handle conflict when deleting admin with dependencies', () => {
      service.delete('12345678').subscribe(
        () => fail('should have failed with conflict error'),
        (error) => {
          expect(error.status).toBe(409);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/12345678`);
      req.flush('Cannot delete admin with active sessions', { status: 409, statusText: 'Conflict' });
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP 400 error', () => {
      service.list().subscribe(
        () => fail('should have failed with 400 error'),
        (error) => {
          expect(error.status).toBe(400);
        }
      );

      const req = httpMock.expectOne(apiUrl);
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle HTTP 401 unauthorized error', () => {
      service.list().subscribe(
        () => fail('should have failed with 401 error'),
        (error) => {
          expect(error.status).toBe(401);
        }
      );

      const req = httpMock.expectOne(apiUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle HTTP 403 forbidden error', () => {
      service.list().subscribe(
        () => fail('should have failed with 403 error'),
        (error) => {
          expect(error.status).toBe(403);
        }
      );

      const req = httpMock.expectOne(apiUrl);
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should handle HTTP 500 server error', () => {
      service.list().subscribe(
        () => fail('should have failed with 500 error'),
        (error) => {
          expect(error.status).toBe(500);
        }
      );

      const req = httpMock.expectOne(apiUrl);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle admin with null phone', () => {
      const adminNoPhone: AdminDTO = {
        ...mockAdmin,
        phone: null
      };

      const mockResponse: ApiResponse<AdminDTO[]> = {
        data: [adminNoPhone]
      };

      service.list().subscribe(response => {
        expect(response.data[0].phone).toBeNull();
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockResponse);
    });

    it('should handle admin with undefined phone', () => {
      const adminNoPhone: AdminDTO = {
        dni: '33333333',
        name: 'No Phone',
        email: 'no@phone.com'
      };

      const mockResponse: ApiResponse<AdminDTO> = {
        data: adminNoPhone
      };

      service.get('33333333').subscribe(response => {
        expect(response.data.phone).toBeUndefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/33333333`);
      req.flush(mockResponse);
    });

    it('should handle empty search query', () => {
      const mockResponse: ApiResponse<AdminDTO[]> = {
        message: 'All results',
        data: [mockAdmin, mockAdmin2]
      };

      service.search('').subscribe();

      // ✅ Cuando q es '', la condición q? es false, entonces params=undefined
      // Por lo tanto, la petición no tiene parámetros
      const req = httpMock.expectOne(`${apiUrl}/search`);
      expect(req.request.params.keys().length).toBe(0);
      req.flush(mockResponse);
    });
  });
});
