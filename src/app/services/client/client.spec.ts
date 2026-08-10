import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClientService } from './client';
import {
  ApiResponse,
  ClientDTO,
  CreateClientDTO,
  UpdateClientDTO,
  CreateClientResponse
} from '../../models/client/client.model';

describe('ClientService', () => {
  let service: ClientService;
  let httpMock: HttpTestingController;
  const apiUrl = '/api/clients';

  const mockClient: ClientDTO = {
    dni: '12345678A',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '123456789',
    address: '123 Main St'
  };

  const mockApiResponse: ApiResponse<ClientDTO[]> = {
    success: true,
    message: 'Success',
    data: [mockClient],
    metadata: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ClientService]
    });
    service = TestBed.inject(ClientService);
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

  describe('getAllClients()', () => {
    it('should get all clients without pagination', (done) => {
      service.getAllClients().subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.data).toEqual([mockClient]);
          done();
        }
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockApiResponse);
    });

    it('should get all clients with page parameter', (done) => {
      service.getAllClients(1).subscribe({
        next: (response) => {
          expect(response.data).toEqual([mockClient]);
          done();
        }
      });

      const req = httpMock.expectOne((request) => {
        return request.url === apiUrl && request.params.has('page');
      });
      expect(req.request.params.get('page')).toBe('1');
      req.flush(mockApiResponse);
    });

    it('should get all clients with limit parameter', (done) => {
      service.getAllClients(undefined, 10).subscribe({
        next: (response) => {
          expect(response.data).toEqual([mockClient]);
          done();
        }
      });

      const req = httpMock.expectOne((request) => {
        return request.url === apiUrl && request.params.has('limit');
      });
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockApiResponse);
    });

    it('should get all clients with both page and limit parameters', (done) => {
      service.getAllClients(2, 20).subscribe({
        next: (response) => {
          expect(response.data).toEqual([mockClient]);
          done();
        }
      });

      const req = httpMock.expectOne((request) => {
        return request.url === apiUrl &&
               request.params.has('page') &&
               request.params.has('limit');
      });
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('20');
      req.flush(mockApiResponse);
    });

    it('should handle empty client list', (done) => {
      const emptyResponse: ApiResponse<ClientDTO[]> = {
        ...mockApiResponse,
        data: []
      };

      service.getAllClients().subscribe({
        next: (response) => {
          expect(response.data.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(emptyResponse);
    });
  });

  describe('searchClients()', () => {
    it('should search clients by query', (done) => {
      const query = 'John';

      service.searchClients(query).subscribe({
        next: (response) => {
          expect(response.data).toEqual([mockClient]);
          done();
        }
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${apiUrl}/search` && request.params.has('q');
      });
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('q')).toBe(query);
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockApiResponse);
    });

    it('should search clients with pagination', (done) => {
      service.searchClients('John', 1, 10).subscribe({
        next: (response) => {
          expect(response.data).toEqual([mockClient]);
          done();
        }
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${apiUrl}/search` &&
               request.params.has('q') &&
               request.params.has('page') &&
               request.params.has('limit');
      });
      expect(req.request.params.get('q')).toBe('John');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockApiResponse);
    });

    it('should handle empty search results', (done) => {
      const emptyResponse: ApiResponse<ClientDTO[]> = {
        ...mockApiResponse,
        data: []
      };

      service.searchClients('NonExistent').subscribe({
        next: (response) => {
          expect(response.data.length).toBe(0);
          done();
        }
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${apiUrl}/search`;
      });
      req.flush(emptyResponse);
    });

    it('should handle special characters in search query', (done) => {
      const specialQuery = 'O\'Brien';

      service.searchClients(specialQuery).subscribe({
        next: (response) => {
          expect(response).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${apiUrl}/search`;
      });
      expect(req.request.params.get('q')).toBe(specialQuery);
      req.flush(mockApiResponse);
    });
  });

  describe('getClientByDni()', () => {
    it('should get client by DNI', (done) => {
      const dni = '12345678A';
      const singleResponse: ApiResponse<ClientDTO> = {
        success: true,
        message: 'Client found',
        data: mockClient,
        metadata: mockApiResponse.metadata
      };

      service.getClientByDni(dni).subscribe({
        next: (response) => {
          expect(response.data).toEqual(mockClient);
          expect(response.data.dni).toBe(dni);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${dni}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(singleResponse);
    });

    it('should handle 404 when client not found', (done) => {
      const dni = 'NOTFOUND';

      service.getClientByDni(dni).subscribe({
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${dni}`);
      req.flush({ message: 'Client not found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should handle DNI with special characters', (done) => {
      const dni = '12345678-A';
      const singleResponse: ApiResponse<ClientDTO> = {
        success: true,
        message: 'Client found',
        data: { ...mockClient, dni },
        metadata: mockApiResponse.metadata
      };

      service.getClientByDni(dni).subscribe({
        next: (response) => {
          expect(response.data.dni).toBe(dni);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${dni}`);
      req.flush(singleResponse);
    });
  });

  describe('createClient()', () => {
    it('should create new client successfully', (done) => {
      const createData: CreateClientDTO = {
        dni: '12345678A',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        address: '123 Main St'
      };

      const createResponse: ApiResponse<CreateClientResponse> = {
        success: true,
        message: 'Client created',
        data: {
          client: mockClient
        },
        metadata: mockApiResponse.metadata
      };

      service.createClient(createData).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.data.client).toEqual(mockClient);
          done();
        }
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createData);
      expect(req.request.withCredentials).toBe(true);
      req.flush(createResponse);
    });

    it('should create client with user credentials', (done) => {
      const createData: CreateClientDTO = {
        dni: '12345678A',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        address: '123 Main St',
        password: 'SecurePass123!'
      };

      const createResponse: ApiResponse<CreateClientResponse> = {
        success: true,
        message: 'Client and user created',
        data: {
          client: mockClient,
          user: {
            id: 123,
            email: 'john@example.com',
            username: 'john'
          }
        },
        metadata: mockApiResponse.metadata
      };

      service.createClient(createData).subscribe({
        next: (response) => {
          expect(response.data.client).toEqual(mockClient);
          expect(response.data.user).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toEqual(createData);
      req.flush(createResponse);
    });

    it('should handle duplicate DNI error', (done) => {
      const createData: CreateClientDTO = {
        dni: '12345678A',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        address: '123 Main St'
      };

      service.createClient(createData).subscribe({
        error: (error) => {
          expect(error.status).toBe(409);
          done();
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ message: 'Client with this DNI already exists' }, { status: 409, statusText: 'Conflict' });
    });

    it('should handle validation errors', (done) => {
      const invalidData: CreateClientDTO = {
        dni: '',
        name: '',
        email: '',
        phone: '',
        address: ''
      };

      service.createClient(invalidData).subscribe({
        error: (error) => {
          expect(error.status).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ message: 'Validation failed' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('updateClient()', () => {
    it('should update client successfully', (done) => {
      const dni = '12345678A';
      const updateData: UpdateClientDTO = {
        phone: '987654321',
        address: '456 New St'
      };

      const updatedClient = { ...mockClient, ...updateData };
      const updateResponse: ApiResponse<ClientDTO> = {
        success: true,
        message: 'Client updated',
        data: updatedClient,
        metadata: mockApiResponse.metadata
      };

      service.updateClient(dni, updateData).subscribe({
        next: (response) => {
          expect(response.data.phone).toBe('987654321');
          expect(response.data.address).toBe('456 New St');
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${dni}`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updateData);
      expect(req.request.withCredentials).toBe(true);
      req.flush(updateResponse);
    });

    it('should update only provided fields', (done) => {
      const dni = '12345678A';
      const updateData: UpdateClientDTO = {
        phone: '987654321'
      };

      const updatedClient = { ...mockClient, phone: '987654321' };
      const updateResponse: ApiResponse<ClientDTO> = {
        success: true,
        message: 'Client updated',
        data: updatedClient,
        metadata: mockApiResponse.metadata
      };

      service.updateClient(dni, updateData).subscribe({
        next: (response) => {
          expect(response.data.phone).toBe('987654321');
          expect(response.data.address).toBe(mockClient.address); // Unchanged
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${dni}`);
      expect(req.request.body).toEqual(updateData);
      req.flush(updateResponse);
    });

    it('should handle 404 when updating non-existent client', (done) => {
      const dni = 'NOTFOUND';
      const updateData: UpdateClientDTO = {
        phone: '987654321'
      };

      service.updateClient(dni, updateData).subscribe({
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${dni}`);
      req.flush({ message: 'Client not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('deleteClient()', () => {
    it('should delete client successfully', (done) => {
      const dni = '12345678A';
      const deleteResponse: ApiResponse<void> = {
        message: "Deleted",
        success: true,
        data: undefined as any,
        metadata: mockApiResponse.metadata
      };

      service.deleteClient(dni).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${dni}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(deleteResponse);
    });

    it('should handle 404 when deleting non-existent client', (done) => {
      const dni = 'NOTFOUND';

      service.deleteClient(dni).subscribe({
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${dni}`);
      req.flush({ message: 'Client not found' }, { status: 404, statusText: 'Not Found' });
    });

    it('should handle 403 when unauthorized to delete', (done) => {
      const dni = '12345678A';

      service.deleteClient(dni).subscribe({
        error: (error) => {
          expect(error.status).toBe(403);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/${dni}`);
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('Error Handling', () => {
    it('should handle 500 server error', (done) => {
      service.getAllClients().subscribe({
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ message: 'Internal server error' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle network error', (done) => {
      service.getAllClients().subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.error(new ProgressEvent('Network error'));
    });

    it('should handle timeout', (done) => {
      service.getAllClients().subscribe({
        error: (error) => {
          expect(error.status).toBe(408);
          done();
        }
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ message: 'Request timeout' }, { status: 408, statusText: 'Request Timeout' });
    });
  });
});
