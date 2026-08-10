import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard, guestGuard, roleGuard, inboxGuard } from './auth.guard';
import { AuthService } from '../services/auth/auth';
import { Role } from '../models/user/user.model';

describe('Auth Guards', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    // Create spy objects
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'currentRoles',
      'refreshIfStale'
    ]);

    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);

    // Configure TestBed
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    // Create mock route and state
    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/test-route' } as RouterStateSnapshot;

  });

  describe('authGuard', () => {
    it('should allow access for authenticated users', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBe(true);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    });

    it('should deny access for unauthenticated users', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);
      mockRouter.createUrlTree.and.returnValue({} as UrlTree);

      const result = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBeTruthy();
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
    });

    it('should allow public verification URLs without authentication', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);
      mockState.url = '/verify-email';

      const result = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBe(true);
    });

    it('should allow verification URL with token parameter', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);
      mockState.url = '/verify-email/abc123';

      const result = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBe(true);
    });

    it('should allow verification URL with query parameter', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);
      mockState.url = '/verify-email?token=abc123';

      const result = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBe(true);
    });
  });

  describe('guestGuard', () => {
    it('should allow access for unauthenticated users', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);

      const result = TestBed.runInInjectionContext(() =>
        guestGuard(mockRoute, mockState)
      );

      expect(result).toBe(true);
    });

    it('should redirect authenticated users to home', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockRouter.createUrlTree.and.returnValue({} as UrlTree);

      const result = TestBed.runInInjectionContext(() =>
        guestGuard(mockRoute, mockState)
      );

      expect(result).toBeTruthy();
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
    });

    it('should always allow verification URLs', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockState.url = '/verify-email/token123';

      const result = TestBed.runInInjectionContext(() =>
        guestGuard(mockRoute, mockState)
      );

      expect(result).toBe(true);
    });
  });

  describe('roleGuard', () => {
    it('should allow access for users with correct role', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.currentRoles.and.returnValue([Role.ADMIN, Role.USER]);
      mockAuthService.refreshIfStale.and.returnValue(void 0);

      const guard = roleGuard([Role.ADMIN]);

      const result = TestBed.runInInjectionContext(() =>
        guard(mockRoute, mockState)
      );

      expect(result).toBe(true);
      expect(mockAuthService.currentRoles).toHaveBeenCalled();
      expect(mockAuthService.refreshIfStale).toHaveBeenCalledWith(15000);
    });

    it('should allow access if user has any of the required roles', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.currentRoles.and.returnValue([Role.PARTNER, Role.USER]);
      mockAuthService.refreshIfStale.and.returnValue(void 0);

      const guard = roleGuard([Role.ADMIN, Role.PARTNER]);

      const result = TestBed.runInInjectionContext(() =>
        guard(mockRoute, mockState)
      );

      expect(result).toBe(true);
    });

    it('should deny access for users without required role', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.currentRoles.and.returnValue([Role.USER]);
      mockAuthService.refreshIfStale.and.returnValue(void 0);
      mockRouter.createUrlTree.and.returnValue({} as UrlTree);

      const guard = roleGuard([Role.ADMIN]);

      const result = TestBed.runInInjectionContext(() =>
        guard(mockRoute, mockState)
      );

      expect(result).toBeTruthy();
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
    });

    it('should redirect unauthenticated users to home', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);
      mockRouter.createUrlTree.and.returnValue({} as UrlTree);

      const guard = roleGuard([Role.ADMIN]);

      const result = TestBed.runInInjectionContext(() =>
        guard(mockRoute, mockState)
      );

      expect(result).toBeTruthy();
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
    });

    it('should allow verification URLs without role check', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);
      mockState.url = '/verify-email/token123';

      const guard = roleGuard([Role.ADMIN]);

      const result = TestBed.runInInjectionContext(() =>
        guard(mockRoute, mockState)
      );

      expect(result).toBe(true);
    });

    it('should handle multiple roles correctly', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.currentRoles.and.returnValue([Role.DISTRIBUTOR, Role.CLIENT]);
      mockAuthService.refreshIfStale.and.returnValue(void 0);

      const guard = roleGuard([Role.ADMIN, Role.PARTNER, Role.DISTRIBUTOR]);

      const result = TestBed.runInInjectionContext(() =>
        guard(mockRoute, mockState)
      );

      expect(result).toBe(true);
    });

    it('should refresh roles before checking (stale detection)', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.currentRoles.and.returnValue([Role.PARTNER]);
      mockAuthService.refreshIfStale.and.returnValue(void 0);

      const guard = roleGuard([Role.PARTNER]);

      TestBed.runInInjectionContext(() => guard(mockRoute, mockState));

      // Verify refreshIfStale was called with 15000ms (15 seconds)
      expect(mockAuthService.refreshIfStale).toHaveBeenCalledWith(15000);
    });
  });

  describe('inboxGuard', () => {
    it('should allow access for authenticated users', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);

      const result = TestBed.runInInjectionContext(() =>
        inboxGuard(mockRoute, mockState)
      );

      expect(result).toBe(true);
    });

    it('should redirect unauthenticated users to login', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);
      mockRouter.createUrlTree.and.returnValue({} as UrlTree);

      const result = TestBed.runInInjectionContext(() =>
        inboxGuard(mockRoute, mockState)
      );

      expect(result).toBeTruthy();
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
    });

    it('should allow verification URLs', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);
      mockState.url = '/verify-email/token123';

      const result = TestBed.runInInjectionContext(() =>
        inboxGuard(mockRoute, mockState)
      );

      expect(result).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty URL state', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockState.url = '';

      const result = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBe(true);
    });

    it('should handle role guard with empty roles array', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockAuthService.currentRoles.and.returnValue([]);
      mockAuthService.refreshIfStale.and.returnValue(void 0);
      mockRouter.createUrlTree.and.returnValue({} as UrlTree);

      const guard = roleGuard([Role.ADMIN]);

      const result = TestBed.runInInjectionContext(() =>
        guard(mockRoute, mockState)
      );

      expect(result).toBeTruthy();
      expect(mockRouter.createUrlTree).toHaveBeenCalled();
    });

    it('should handle verification URL with hash', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);
      mockState.url = '/verify-email#token=abc123';

      const result = TestBed.runInInjectionContext(() =>
        authGuard(mockRoute, mockState)
      );

      expect(result).toBe(true);
    });
  });
});
