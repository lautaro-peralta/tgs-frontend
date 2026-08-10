import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import {
  Notification,
  NotificationType,
  NotificationStatus,
  CreateNotificationDTO,
  PaginatedNotifications
} from '../models/notification.model';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  const baseUrl = '/api/notifications';

  const mockNotification: Notification = {
    id: 'notif-123',
    userId: 'user-456',
    type: NotificationType.SYSTEM,
    title: 'Test Notification',
    message: 'This is a test notification',
    status: NotificationStatus.UNREAD,
    createdAt: '2024-01-01T00:00:00Z'
  };

  const mockNotificationsArray: Notification[] = [
    mockNotification,
    {
      ...mockNotification,
      id: 'notif-456',
      title: 'Second Notification',
      status: NotificationStatus.READ
    }
  ];

  const mockPaginatedNotifications: PaginatedNotifications = {
    data: mockNotificationsArray,
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1
    },
    unreadCount: 1
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationService]
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getMyNotifications()', () => {
    it('should fetch user notifications successfully', async () => {
      const promise = service.getMyNotifications();

      const req = httpMock.expectOne(`${baseUrl}/me`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ data: mockNotificationsArray });

      const result = await promise;
      expect(result).toEqual(mockNotificationsArray);
      expect(result.length).toBe(2);
    });

    it('should handle empty notifications', async () => {
      const promise = service.getMyNotifications();

      const req = httpMock.expectOne(`${baseUrl}/me`);
      req.flush({ data: [] });

      const result = await promise;
      expect(result).toEqual([]);
    });
  });

  describe('searchNotifications()', () => {
    it('should search notifications without params', async () => {
      const promise = service.searchNotifications({});

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockPaginatedNotifications);

      const result = await promise;
      expect(result.data).toEqual(mockNotificationsArray);
      expect(result.pagination.total).toBe(2);
    });

    it('should search notifications with status param', async () => {
      const promise = service.searchNotifications({ status: NotificationStatus.UNREAD });

      const req = httpMock.expectOne(r => r.url === baseUrl);
      expect(req.request.params.get('status')).toBe('UNREAD');
      req.flush(mockPaginatedNotifications);

      await promise;
    });

    it('should search notifications with type param', async () => {
      const promise = service.searchNotifications({ type: NotificationType.SYSTEM });

      const req = httpMock.expectOne(r => r.url === baseUrl);
      expect(req.request.params.get('type')).toBe('SYSTEM');
      req.flush(mockPaginatedNotifications);

      await promise;
    });

    it('should search notifications with userId param', async () => {
      const promise = service.searchNotifications({ userId: 'user-123' });

      const req = httpMock.expectOne(r => r.url === baseUrl);
      expect(req.request.params.get('userId')).toBe('user-123');
      req.flush(mockPaginatedNotifications);

      await promise;
    });

    it('should search notifications with pagination params', async () => {
      const promise = service.searchNotifications({ page: 2, limit: 20 });

      const req = httpMock.expectOne(r => r.url === baseUrl);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('20');
      req.flush(mockPaginatedNotifications);

      await promise;
    });

    it('should search notifications with all params', async () => {
      const promise = service.searchNotifications({
        status: NotificationStatus.READ,
        type: NotificationType.ROLE_REQUEST_APPROVED,
        userId: 'user-789',
        page: 1,
        limit: 10
      });

      const req = httpMock.expectOne(r => r.url === baseUrl);
      expect(req.request.params.get('status')).toBe('READ');
      expect(req.request.params.get('type')).toBe('ROLE_REQUEST_APPROVED');
      expect(req.request.params.get('userId')).toBe('user-789');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockPaginatedNotifications);

      await promise;
    });
  });

  describe('markAsRead()', () => {
    it('should mark notification as read successfully', async () => {
      const notificationId = 'notif-123';
      const readNotification = { ...mockNotification, status: NotificationStatus.READ };

      const promise = service.markAsRead(notificationId);

      const req = httpMock.expectOne(`${baseUrl}/${notificationId}/read`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ data: readNotification });

      const result = await promise;
      expect(result.status).toBe(NotificationStatus.READ);
    });

    it('should handle marking non-existent notification', async () => {
      const promise = service.markAsRead('non-existent-id');

      const req = httpMock.expectOne(`${baseUrl}/non-existent-id/read`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('markAllAsRead()', () => {
    it('should mark all notifications as read successfully', async () => {
      const promise = service.markAllAsRead();

      const req = httpMock.expectOne(`${baseUrl}/read-all`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);

      await promise;
    });

    it('should handle error when marking all as read', async () => {
      const promise = service.markAllAsRead();

      const req = httpMock.expectOne(`${baseUrl}/read-all`);
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('getUnreadCount()', () => {
    it('should get unread count successfully', async () => {
      const promise = service.getUnreadCount();

      const req = httpMock.expectOne(`${baseUrl}/unread-count`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush({ count: 5 });

      const result = await promise;
      expect(result).toBe(5);
    });

    it('should fallback to counting unread from notifications on error', async () => {
      // Start the request
      const promise = service.getUnreadCount();

      // First request fails - this triggers the catch block
      const countReq = httpMock.expectOne(`${baseUrl}/unread-count`);
      countReq.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

      // Wait a tick for the async catch block to execute and make the fallback request
      await new Promise(resolve => setTimeout(resolve, 0));

      // Now the fallback request should be pending
      const notifReq = httpMock.expectOne(`${baseUrl}/me`);
      notifReq.flush({
        data: [
          { ...mockNotification, status: 'UNREAD' },
          { ...mockNotification, id: '2', status: 'UNREAD' },
          { ...mockNotification, id: '3', status: 'READ' }
        ]
      });

      const result = await promise;
      expect(result).toBe(2);
    });

    it('should return 0 when both endpoints fail', async () => {
      // Start the request
      const promise = service.getUnreadCount();

      // First request fails
      const countReq = httpMock.expectOne(`${baseUrl}/unread-count`);
      countReq.flush({ message: 'Error' }, { status: 500, statusText: 'Internal Server Error' });

      // Wait a tick for the async catch block to execute and make the fallback request
      await new Promise(resolve => setTimeout(resolve, 0));

      // Fallback request also fails
      const notifReq = httpMock.expectOne(`${baseUrl}/me`);
      notifReq.flush({ message: 'Error' }, { status: 500, statusText: 'Internal Server Error' });

      const result = await promise;
      expect(result).toBe(0);
    });
  });

  describe('deleteNotification()', () => {
    it('should delete notification successfully', async () => {
      const notificationId = 'notif-123';
      const promise = service.deleteNotification(notificationId);

      const req = httpMock.expectOne(`${baseUrl}/${notificationId}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);

      await promise;
    });

    it('should handle deleting non-existent notification', async () => {
      const promise = service.deleteNotification('non-existent');

      const req = httpMock.expectOne(`${baseUrl}/non-existent`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('createNotification()', () => {
    it('should create notification successfully', async () => {
      const createDTO: CreateNotificationDTO = {
        userId: 'user-456',
        type: NotificationType.SYSTEM,
        title: 'New Notification',
        message: 'Test message'
      };

      const promise = service.createNotification(createDTO);

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDTO);
      expect(req.request.withCredentials).toBe(true);
      req.flush({ data: mockNotification });

      const result = await promise;
      expect(result).toEqual(mockNotification);
    });

    it('should create notification with optional fields', async () => {
      const createDTO: CreateNotificationDTO = {
        userId: 'user-456',
        type: NotificationType.ROLE_REQUEST_APPROVED,
        title: 'Role Approved',
        message: 'Your role request was approved',
        relatedEntityId: 'request-123',
        relatedEntityType: 'role-request',
        metadata: { role: 'PARTNER' }
      };

      const promise = service.createNotification(createDTO);

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.body).toEqual(createDTO);
      req.flush({ data: mockNotification });

      await promise;
    });

    it('should handle validation error when creating notification', async () => {
      const createDTO: CreateNotificationDTO = {
        userId: '',
        type: NotificationType.SYSTEM,
        title: '',
        message: ''
      };

      const promise = service.createNotification(createDTO);

      const req = httpMock.expectOne(baseUrl);
      req.flush({ message: 'Validation failed' }, { status: 400, statusText: 'Bad Request' });

      await expectAsync(promise).toBeRejected();
    });
  });
});
