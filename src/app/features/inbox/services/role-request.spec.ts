import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RoleRequestService } from './role-request';
import {
  RoleRequest,
  CreateRoleRequestDTO,
  ReviewRoleRequestDTO,
  RoleRequestSearchParams,
  PaginatedRoleRequests,
  RequestStatus
} from '../models/role-request.model';
import { Role } from '../../../models/user/user.model';

describe('RoleRequestService', () => {
  let service: RoleRequestService;
  let httpMock: HttpTestingController;
  const baseUrl = '/api/role-requests';

  const mockRoleRequest: RoleRequest = {
    id: '123',
    user: {
      id: 'user-456',
      username: 'testuser',
      email: 'test@example.com'
    },
    requestedRole: Role.PARTNER,
    roleToRemove: null,
    isRoleChange: false,
    justification: 'I want to become a partner',
    status: RequestStatus.PENDING,
    createdAt: '2024-01-01T00:00:00Z',
    reviewedBy: null
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RoleRequestService]
    });
    service = TestBed.inject(RoleRequestService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('createRequest()', () => {
    it('should create a new role request', async () => {
      const createDTO: CreateRoleRequestDTO = {
        requestedRole: Role.PARTNER,
        justification: 'I want to become a partner'
      };

      const promise = service.createRequest(createDTO);

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDTO);
      expect(req.request.withCredentials).toBe(true);

      req.flush({ data: mockRoleRequest });

      const result = await promise;
      expect(result).toEqual(mockRoleRequest);
      expect(result.requestedRole).toBe(Role.PARTNER);
    });

    it('should handle validation errors when creating request', async () => {
      const createDTO: CreateRoleRequestDTO = {
        requestedRole: 'INVALID_ROLE' as any, // Intentionally invalid for testing
        justification: ''
      };

      const promise = service.createRequest(createDTO);

      const req = httpMock.expectOne(baseUrl);
      req.flush(
        {
          error: 'Validation failed',
          errors: [
            { field: 'requestedRole', message: 'Invalid role', code: 'INVALID_ROLE' },
            { field: 'justification', message: 'Justification required', code: 'REQUIRED' }
          ]
        },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });

    it('should handle duplicate request error', async () => {
      const createDTO: CreateRoleRequestDTO = {
        requestedRole: Role.PARTNER,
        justification: 'Test justification'
      };

      const promise = service.createRequest(createDTO);

      const req = httpMock.expectOne(baseUrl);
      req.flush(
        { error: 'Duplicate request', code: 'DUPLICATE_REQUEST' },
        { status: 409, statusText: 'Conflict' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('getMyRequests()', () => {
    it('should get all requests for current user', async () => {
      const mockRequests: RoleRequest[] = [
        mockRoleRequest,
        { ...mockRoleRequest, id: '789', requestedRole: Role.DISTRIBUTOR }
      ];

      const promise = service.getMyRequests();

      const req = httpMock.expectOne(`${baseUrl}/me`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);

      req.flush({ data: mockRequests });

      const result = await promise;
      expect(result).toEqual(mockRequests);
      expect(result.length).toBe(2);
    });

    it('should return empty array when user has no requests', async () => {
      const promise = service.getMyRequests();

      const req = httpMock.expectOne(`${baseUrl}/me`);
      req.flush({ data: [] });

      const result = await promise;
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should handle authentication error', async () => {
      const promise = service.getMyRequests();

      const req = httpMock.expectOne(`${baseUrl}/me`);
      req.flush(
        { error: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('getPendingRequests()', () => {
    it('should get all pending requests (admin only)', async () => {
      const mockPendingRequests: RoleRequest[] = [
        mockRoleRequest,
        { ...mockRoleRequest, id: '456', user: { ...mockRoleRequest.user, id: 'user-789' } }
      ];

      const promise = service.getPendingRequests();

      const req = httpMock.expectOne(`${baseUrl}/pending`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);

      req.flush({ data: mockPendingRequests });

      const result = await promise;
      expect(result).toEqual(mockPendingRequests);
      expect(result.every(r => r.status === RequestStatus.PENDING)).toBe(true);
    });

    it('should handle forbidden error for non-admin users', async () => {
      const promise = service.getPendingRequests();

      const req = httpMock.expectOne(`${baseUrl}/pending`);
      req.flush(
        { error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403, statusText: 'Forbidden' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('searchRequests()', () => {
    it('should search requests with all parameters', async () => {
      const searchParams: RoleRequestSearchParams = {
        status: RequestStatus.APPROVED,
        requestedRole: Role.PARTNER,
        userId: 'user-123',
        page: 1,
        limit: 10
      };

      const mockPaginatedResponse: PaginatedRoleRequests = {
        data: [mockRoleRequest],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      const promise = service.searchRequests(searchParams);

      const req = httpMock.expectOne((request) => {
        return request.url === baseUrl &&
               request.params.has('status') &&
               request.params.has('requestedRole') &&
               request.params.has('userId') &&
               request.params.has('page') &&
               request.params.has('limit');
      });

      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('status')).toBe(RequestStatus.APPROVED);
      expect(req.request.params.get('requestedRole')).toBe(Role.PARTNER);
      expect(req.request.params.get('userId')).toBe('user-123');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.withCredentials).toBe(true);

      req.flush(mockPaginatedResponse);

      const result = await promise;
      expect(result.data.length).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should search requests with partial parameters', async () => {
      const searchParams: RoleRequestSearchParams = {
        status: RequestStatus.PENDING
      };

      const mockPaginatedResponse: PaginatedRoleRequests = {
        data: [mockRoleRequest, mockRoleRequest],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      };

      const promise = service.searchRequests(searchParams);

      const req = httpMock.expectOne((request) => {
        return request.url === baseUrl && request.params.has('status');
      });

      expect(req.request.params.get('status')).toBe(RequestStatus.PENDING);
      req.flush(mockPaginatedResponse);

      const result = await promise;
      expect(result.data.length).toBe(2);
    });

    it('should search requests without parameters', async () => {
      const searchParams: RoleRequestSearchParams = {};

      const mockPaginatedResponse: PaginatedRoleRequests = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      };

      const promise = service.searchRequests(searchParams);

      const req = httpMock.expectOne(baseUrl);
      req.flush(mockPaginatedResponse);

      const result = await promise;
      expect(result.data.length).toBe(0);
    });
  });

  describe('reviewRequest()', () => {
    it('should approve a role request', async () => {
      const requestId = '123';
      const reviewDTO: ReviewRoleRequestDTO = {
        action: 'approve',
        comments: 'Application looks good'
      };

      const approvedRequest: RoleRequest = {
        ...mockRoleRequest,
        status: RequestStatus.APPROVED,
        reviewedAt: '2024-01-02T00:00:00Z',
        reviewedBy: { id: 'admin-123', username: 'admin' },
        adminComments: 'Application looks good'
      };

      const promise = service.reviewRequest(requestId, reviewDTO);

      const req = httpMock.expectOne(`${baseUrl}/${requestId}/review`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(reviewDTO);
      expect(req.request.withCredentials).toBe(true);

      req.flush({ data: approvedRequest });

      const result = await promise;
      expect(result.status).toBe(RequestStatus.APPROVED);
      expect(result.adminComments).toBe('Application looks good');
    });

    it('should reject a role request', async () => {
      const requestId = '123';
      const reviewDTO: ReviewRoleRequestDTO = {
        action: 'reject',
        comments: 'Insufficient experience'
      };

      const rejectedRequest: RoleRequest = {
        ...mockRoleRequest,
        status: RequestStatus.REJECTED,
        reviewedAt: '2024-01-02T00:00:00Z',
        reviewedBy: { id: 'admin-123', username: 'admin' },
        adminComments: 'Insufficient experience'
      };

      const promise = service.reviewRequest(requestId, reviewDTO);

      const req = httpMock.expectOne(`${baseUrl}/${requestId}/review`);
      req.flush({ data: rejectedRequest });

      const result = await promise;
      expect(result.status).toBe(RequestStatus.REJECTED);
      expect(result.adminComments).toBe('Insufficient experience');
    });

    it('should handle request not found error', async () => {
      const requestId = 'non-existent';
      const reviewDTO: ReviewRoleRequestDTO = {
        action: 'approve'
      };

      const promise = service.reviewRequest(requestId, reviewDTO);

      const req = httpMock.expectOne(`${baseUrl}/${requestId}/review`);
      req.flush(
        { error: 'Request not found' },
        { status: 404, statusText: 'Not Found' }
      );

      await expectAsync(promise).toBeRejected();
    });

    it('should handle already reviewed error', async () => {
      const requestId = '123';
      const reviewDTO: ReviewRoleRequestDTO = {
        action: 'approve'
      };

      const promise = service.reviewRequest(requestId, reviewDTO);

      const req = httpMock.expectOne(`${baseUrl}/${requestId}/review`);
      req.flush(
        { error: 'Request already reviewed', code: 'ALREADY_REVIEWED' },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('Edge Cases', () => {
    it('should handle network timeout', async () => {
      const promise = service.getMyRequests();

      const req = httpMock.expectOne(`${baseUrl}/me`);
      req.error(new ProgressEvent('timeout'));

      await expectAsync(promise).toBeRejected();
    });

    it('should handle server error', async () => {
      const promise = service.getPendingRequests();

      const req = httpMock.expectOne(`${baseUrl}/pending`);
      req.flush(
        { error: 'Internal server error' },
        { status: 500, statusText: 'Internal Server Error' }
      );

      await expectAsync(promise).toBeRejected();
    });

    it('should handle malformed response', async () => {
      const promise = service.getMyRequests();

      const req = httpMock.expectOne(`${baseUrl}/me`);
      // Trigger a parsing error by sending invalid JSON
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

      await expectAsync(promise).toBeRejected();
    });
  });
});
