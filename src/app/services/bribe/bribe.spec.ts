import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BribeService } from './bribe';
import {
  ApiResponse,
  BribeDTO,
  CreateBribeDTO,
  UpdateBribeDTO,
  PayBribesResponse
} from '../../models/bribe/bribe.model';

describe('BribeService', () => {
  let service: BribeService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/bribes';

  const mockBribe: BribeDTO = {
    id: 1,
    totalAmount: 5000,
    paid: false,
    creationDate: '2024-01-15T00:00:00.000Z',
    authority: {
      dni: '12345678',
      name: 'John Doe'
    },
    sale: {
      id: 101
    }
  };

  const mockBribe2: BribeDTO = {
    id: 2,
    totalAmount: 10000,
    paid: true,
    creationDate: '2024-01-20T00:00:00.000Z',
    authority: {
      dni: '87654321',
      name: 'Jane Smith'
    },
    sale: {
      id: 102
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BribeService]
    });
    service = TestBed.inject(BribeService);
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

  describe('getAllBribes()', () => {
    it('should fetch all bribes without pagination', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Bribes retrieved successfully',
        data: [mockBribe, mockBribe2]
      };

      service.getAllBribes().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.length).toBe(2);
        expect(response.data[0]).toEqual(mockBribe);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should fetch bribes with pagination parameters', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Bribes retrieved',
        data: [mockBribe]
      };

      service.getAllBribes(1, 10).subscribe(response => {
        expect(response.data.length).toBe(1);
      });

      const req = httpMock.expectOne(request => {
        return request.url === apiUrl &&
               request.params.get('page') === '1' &&
               request.params.get('limit') === '10';
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include withCredentials in request', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Success',
        data: []
      };

      service.getAllBribes().subscribe();

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle empty response', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'No bribes found',
        data: []
      };

      service.getAllBribes().subscribe(response => {
        expect(response.data).toEqual([]);
        expect(response.data.length).toBe(0);
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockResponse);
    });

    it('should handle page parameter only', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Success',
        data: [mockBribe]
      };

      service.getAllBribes(2).subscribe();

      const req = httpMock.expectOne(request => {
        return request.url === apiUrl && request.params.get('page') === '2';
      });
      expect(req.request.params.has('limit')).toBe(false);
      req.flush(mockResponse);
    });

    it('should handle limit parameter only', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Success',
        data: [mockBribe]
      };

      service.getAllBribes(undefined, 20).subscribe();

      const req = httpMock.expectOne(request => {
        return request.url === apiUrl && request.params.get('limit') === '20';
      });
      expect(req.request.params.has('page')).toBe(false);
      req.flush(mockResponse);
    });
  });

  describe('searchBribes()', () => {
    it('should search bribes by paid status', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Search results',
        data: [mockBribe]
      };

      service.searchBribes('false').subscribe(response => {
        expect(response.data.length).toBe(1);
      });

      const req = httpMock.expectOne(request => {
        return request.url === `${apiUrl}/search` &&
               request.params.get('paid') === 'false';
      });
      req.flush(mockResponse);
    });

    it('should search bribes by exact date', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Search results',
        data: [mockBribe]
      };

      const searchDate = '2024-01-15';
      service.searchBribes(undefined, searchDate, 'exact').subscribe();

      const req = httpMock.expectOne(request => {
        return request.url === `${apiUrl}/search` &&
               request.params.get('date') === searchDate &&
               request.params.get('type') === 'exact';
      });
      req.flush(mockResponse);
    });

    it('should search bribes before a date', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Search results',
        data: [mockBribe, mockBribe2]
      };

      service.searchBribes(undefined, '2024-02-01', 'before').subscribe();

      const req = httpMock.expectOne(request => {
        return request.url === `${apiUrl}/search` &&
               request.params.get('type') === 'before';
      });
      req.flush(mockResponse);
    });

    it('should search bribes after a date', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Search results',
        data: [mockBribe2]
      };

      service.searchBribes(undefined, '2024-01-18', 'after').subscribe();

      const req = httpMock.expectOne(request => {
        return request.url === `${apiUrl}/search` &&
               request.params.get('type') === 'after';
      });
      req.flush(mockResponse);
    });

    it('should search bribes between two dates', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Search results',
        data: [mockBribe, mockBribe2]
      };

      service.searchBribes(undefined, '2024-01-01', 'between', '2024-01-31').subscribe();

      const req = httpMock.expectOne(request => {
        return request.url === `${apiUrl}/search` &&
               request.params.get('type') === 'between' &&
               request.params.get('endDate') === '2024-01-31';
      });
      req.flush(mockResponse);
    });

    it('should search with multiple criteria combined', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Search results',
        data: [mockBribe]
      };

      service.searchBribes('false', '2024-01-01', 'after', undefined, 1, 10).subscribe();

      const req = httpMock.expectOne(request => {
        return request.url === `${apiUrl}/search` &&
               request.params.get('paid') === 'false' &&
               request.params.get('page') === '1' &&
               request.params.get('limit') === '10';
      });
      req.flush(mockResponse);
    });

    it('should include withCredentials in search request', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Success',
        data: []
      };

      service.searchBribes().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/search`);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });
  });

  describe('getBribeById()', () => {
    it('should fetch a single bribe by id', () => {
      const mockResponse: ApiResponse<BribeDTO> = {
        success: true,
        message: 'Bribe found',
        data: mockBribe
      };

      service.getBribeById(1).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe(1);
        expect(response.data.totalAmount).toBe(5000);
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle 404 error for non-existent bribe', () => {
      const errorResponse = {
        success: false,
        message: 'Bribe not found',
        data: null as any
      };

      service.getBribeById(999).subscribe(
        () => fail('should have failed with 404 error'),
        (error) => {
          expect(error.status).toBe(404);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/999`);
      req.flush(errorResponse, { status: 404, statusText: 'Not Found' });
    });

    it('should fetch bribe with different id', () => {
      const mockResponse: ApiResponse<BribeDTO> = {
        success: true,
        message: 'Bribe found',
        data: mockBribe2
      };

      service.getBribeById(2).subscribe(response => {
        expect(response.data.id).toBe(2);
        expect(response.data.authority.dni).toBe('87654321');
      });

      const req = httpMock.expectOne(`${apiUrl}/2`);
      req.flush(mockResponse);
    });

    it('should include withCredentials in request', () => {
      const mockResponse: ApiResponse<BribeDTO> = {
        success: true,
        message: 'Success',
        data: mockBribe
      };

      service.getBribeById(1).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });
  });

  describe('createBribe()', () => {
    const createData: CreateBribeDTO = {
      totalAmount: 7500,
      authorityId: '11111111',
      saleId: 103
    };

    it('should create a new bribe', () => {
      const mockResponse: ApiResponse<BribeDTO> = {
        success: true,
        message: 'Bribe created successfully',
        data: {
          id: 3,
          totalAmount: 7500,
          paid: false,
          creationDate: '2024-03-01T00:00:00.000Z',
          authority: {
            dni: '11111111',
            name: 'New Authority'
          },
          sale: {
            id: 103
          }
        }
      };

      service.createBribe(createData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.totalAmount).toBe(7500);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createData);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle validation errors on create', () => {
      const invalidData: CreateBribeDTO = {
        totalAmount: -1000,
        authorityId: '',
        saleId: 0
      };

      const errorResponse = {
        success: false,
        message: 'Validation failed',
        data: null as any
      };

      service.createBribe(invalidData).subscribe(
        () => fail('should have failed with validation error'),
        (error) => {
          expect(error.status).toBe(400);
        }
      );

      const req = httpMock.expectOne(apiUrl);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });

    it('should send POST request with correct headers', () => {
      const mockResponse: ApiResponse<BribeDTO> = {
        success: true,
        message: 'Created',
        data: mockBribe
      };

      service.createBribe(createData).subscribe();

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle server error on create', () => {
      service.createBribe(createData).subscribe(
        () => fail('should have failed with server error'),
        (error) => {
          expect(error.status).toBe(500);
        }
      );

      const req = httpMock.expectOne(apiUrl);
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('updateBribe()', () => {
    const updateData: UpdateBribeDTO = {
      totalAmount: 8000
    };

    it('should update an existing bribe', () => {
      const mockResponse: ApiResponse<BribeDTO> = {
        success: true,
        message: 'Bribe updated successfully',
        data: {
          ...mockBribe,
          totalAmount: 8000
        }
      };

      service.updateBribe(1, updateData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.totalAmount).toBe(8000);
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updateData);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle 404 error when updating non-existent bribe', () => {
      const errorResponse = {
        success: false,
        message: 'Bribe not found',
        data: null as any
      };

      service.updateBribe(999, updateData).subscribe(
        () => fail('should have failed with 404 error'),
        (error) => {
          expect(error.status).toBe(404);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/999`);
      req.flush(errorResponse, { status: 404, statusText: 'Not Found' });
    });

    it('should use PATCH method for partial updates', () => {
      const mockResponse: ApiResponse<BribeDTO> = {
        success: true,
        message: 'Updated',
        data: mockBribe
      };

      service.updateBribe(1, { totalAmount: 6000 }).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('PATCH');
      req.flush(mockResponse);
    });

    it('should handle validation error on update', () => {
      const invalidUpdate: UpdateBribeDTO = {
        totalAmount: -5000
      };

      service.updateBribe(1, invalidUpdate).subscribe(
        () => fail('should have failed with validation error'),
        (error) => {
          expect(error.status).toBe(400);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/1`);
      req.flush('Invalid totalAmount', { status: 400, statusText: 'Bad Request' });
    });

    it('should include withCredentials in update request', () => {
      const mockResponse: ApiResponse<BribeDTO> = {
        success: true,
        message: 'Success',
        data: mockBribe
      };

      service.updateBribe(1, updateData).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });
  });

  describe('payBribes()', () => {
    it('should mark multiple bribes as paid', () => {
      const ids = [1, 2, 3];
      const mockResponse: ApiResponse<PayBribesResponse> = {
        success: true,
        message: '3 bribes marked as paid',
        data: {
          paid: [
            { id: 1, paid: true },
            { id: 2, paid: true },
            { id: 3, paid: true }
          ],
          summary: {
            totalRequested: 3,
            successfullyPaid: 3,
            notFound: 0
          }
        }
      };

      service.payBribes(ids).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.paid.length).toBe(3);
        expect(response.data.summary.successfullyPaid).toBe(3);
      });

      const req = httpMock.expectOne(`${apiUrl}/pay`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ ids });
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle empty array of ids', () => {
      const mockResponse: ApiResponse<PayBribesResponse> = {
        success: true,
        message: 'No bribes to pay',
        data: {
          paid: [],
          summary: {
            totalRequested: 0,
            successfullyPaid: 0,
            notFound: 0
          }
        }
      };

      service.payBribes([]).subscribe(response => {
        expect(response.data.summary.totalRequested).toBe(0);
      });

      const req = httpMock.expectOne(`${apiUrl}/pay`);
      req.flush(mockResponse);
    });

    it('should handle single bribe payment', () => {
      const mockResponse: ApiResponse<PayBribesResponse> = {
        success: true,
        message: '1 bribe marked as paid',
        data: {
          paid: [{ id: 1, paid: true }],
          summary: {
            totalRequested: 1,
            successfullyPaid: 1,
            notFound: 0
          }
        }
      };

      service.payBribes([1]).subscribe(response => {
        expect(response.data.summary.successfullyPaid).toBe(1);
      });

      const req = httpMock.expectOne(`${apiUrl}/pay`);
      req.flush(mockResponse);
    });

    it('should handle error when paying bribes', () => {
      service.payBribes([999]).subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(error.status).toBe(400);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/pay`);
      req.flush('Invalid bribe IDs', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('payBribesByAuthority()', () => {
    it('should pay bribes for a specific authority', () => {
      const dni = '12345678';
      const ids = [1, 2];
      const mockResponse: ApiResponse<PayBribesResponse> = {
        success: true,
        message: 'Authority bribes paid',
        data: {
          paid: [
            { id: 1, paid: true },
            { id: 2, paid: true }
          ],
          summary: {
            totalRequested: 2,
            successfullyPaid: 2,
            notFound: 0
          }
        }
      };

      service.payBribesByAuthority(dni, ids).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.summary.successfullyPaid).toBe(2);
      });

      const req = httpMock.expectOne(`${apiUrl}/${dni}/pay`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ ids });
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle different authority DNI', () => {
      const dni = '87654321';
      const mockResponse: ApiResponse<PayBribesResponse> = {
        success: true,
        message: 'Paid',
        data: {
          paid: [{ id: 5, paid: true }],
          summary: {
            totalRequested: 1,
            successfullyPaid: 1,
            notFound: 0
          }
        }
      };

      service.payBribesByAuthority(dni, [5]).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/${dni}/pay`);
      expect(req.request.url).toContain(dni);
      req.flush(mockResponse);
    });

    it('should handle authority not found error', () => {
      service.payBribesByAuthority('00000000', [1]).subscribe(
        () => fail('should have failed'),
        (error) => {
          expect(error.status).toBe(404);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/00000000/pay`);
      req.flush('Authority not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('deleteBribe()', () => {
    it('should delete a bribe by id', () => {
      const mockResponse: ApiResponse<void> = {
        success: true,
        message: 'Bribe deleted successfully',
        data: undefined
      };

      service.deleteBribe(1).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle 404 error when deleting non-existent bribe', () => {
      service.deleteBribe(999).subscribe(
        () => fail('should have failed with 404 error'),
        (error) => {
          expect(error.status).toBe(404);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/999`);
      req.flush('Bribe not found', { status: 404, statusText: 'Not Found' });
    });

    it('should delete different bribe ids', () => {
      const mockResponse: ApiResponse<void> = {
        success: true,
        message: 'Deleted',
        data: undefined
      };

      service.deleteBribe(5).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/5`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should handle authorization error on delete', () => {
      service.deleteBribe(1).subscribe(
        () => fail('should have failed with auth error'),
        (error) => {
          expect(error.status).toBe(401);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/1`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP 400 error', () => {
      service.getAllBribes().subscribe(
        () => fail('should have failed with 400 error'),
        (error) => {
          expect(error.status).toBe(400);
        }
      );

      const req = httpMock.expectOne(apiUrl);
      req.flush('Bad request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle HTTP 401 unauthorized error', () => {
      service.getAllBribes().subscribe(
        () => fail('should have failed with 401 error'),
        (error) => {
          expect(error.status).toBe(401);
        }
      );

      const req = httpMock.expectOne(apiUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle HTTP 404 not found error', () => {
      service.getBribeById(999).subscribe(
        () => fail('should have failed with 404 error'),
        (error) => {
          expect(error.status).toBe(404);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/999`);
      req.flush('Not found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle HTTP 500 server error', () => {
      service.getAllBribes().subscribe(
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
    it('should handle null values in response', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Success',
        data: []
      };

      service.getAllBribes().subscribe(response => {
        expect(response.data).toBeDefined();
        expect(Array.isArray(response.data)).toBe(true);
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(mockResponse);
    });

    it('should handle very large pagination values', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Success',
        data: []
      };

      service.getAllBribes(999999, 1000).subscribe();

      const req = httpMock.expectOne(request => {
        return request.params.get('page') === '999999' &&
               request.params.get('limit') === '1000';
      });
      req.flush(mockResponse);
    });

    it('should handle search with all parameters undefined', () => {
      const mockResponse: ApiResponse<BribeDTO[]> = {
        success: true,
        message: 'Success',
        data: [mockBribe]
      };

      service.searchBribes().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/search`);
      expect(req.request.params.keys().length).toBe(0);
      req.flush(mockResponse);
    });
  });
});
