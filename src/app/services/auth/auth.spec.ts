import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService, AuthResponse, LoginRequest, RegisterRequest } from './auth';
import { Role, User } from '../../models/user/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  const mockUser: User = {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    roles: [Role.USER],
    isActive: true,
    isVerified: true,
    emailVerified: true,
    profileCompleteness: 75,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasPersonalInfo: false
  };

  const mockAuthResponse: AuthResponse = {
    success: true,
    message: 'Login successful',
    data: mockUser,
    meta: {
      timestamp: new Date().toISOString(),
      statusCode: 200
    }
  };

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Clear localStorage before each test
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

    it('should initialize with null user', () => {
      expect(service.user()).toBeNull();
    });

    it('should initialize as not authenticated', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should initialize with empty roles', () => {
      expect(service.currentRoles()).toEqual([]);
    });

    it('should initialize with 0 profile completeness', () => {
      expect(service.profileCompleteness()).toBe(0);
    });
  });

  describe('login()', () => {
    it('should login successfully with valid credentials', (done) => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      service.login(credentials).subscribe({
        next: (user) => {
          expect(user).toEqual(mockUser);
          expect(service.isAuthenticated()).toBe(true);
          expect(service.user()).toEqual(mockUser);
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockAuthResponse);

      // Login triggers a call to /api/users/me to fetch full profile
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(mockAuthResponse);
    });

    it('should handle login error with 401', (done) => {
      const credentials: LoginRequest = {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      };

      service.login(credentials).subscribe({
        error: (error) => {
          expect(error.status).toBe(401);
          expect(service.isAuthenticated()).toBe(false);
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle network errors', (done) => {
      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password'
      };

      service.login(credentials).subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.error(new ProgressEvent('Network error'));
    });
  });

  describe('register()', () => {
    it('should register new user successfully', (done) => {
      const registerData: RegisterRequest = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123!'
      };

      service.register(registerData).subscribe({
        next: (user) => {
          expect(user).toEqual(mockUser);
          // ✅ Register NO autentica automáticamente al usuario
          // El usuario debe hacer login después de registrarse
          expect(service.isAuthenticated()).toBe(false);
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerData);
      req.flush(mockAuthResponse);
    });

    it('should handle registration error for duplicate email', (done) => {
      const registerData: RegisterRequest = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'Password123!'
      };

      service.register(registerData).subscribe({
        error: (error) => {
          expect(error.status).toBe(409);
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/register');
      req.flush({ message: 'Email already exists' }, { status: 409, statusText: 'Conflict' });
    });
  });

  describe('logout()', () => {
    it('should logout successfully and clear user data', (done) => {
      // First login
      service.login({ email: 'test@example.com', password: 'password' }).subscribe(() => {
        expect(service.isAuthenticated()).toBe(true);

        // Now logout
        service.logout().subscribe(() => {
          expect(service.isAuthenticated()).toBe(false);
          expect(service.user()).toBeNull();
          expect(router.navigate).toHaveBeenCalledWith(['/']);
          done();
        });

        const logoutReq = httpMock.expectOne('/api/auth/logout');
        logoutReq.flush({ success: true });
      });

      const loginReq = httpMock.expectOne('/api/auth/login');
      loginReq.flush(mockAuthResponse);

      // ✅ Manejar la petición /api/users/me que se dispara por forceRefresh()
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(mockAuthResponse);
    });

    it('should clear localStorage on logout', (done) => {
      // ✅ Usar los nombres correctos de las keys de localStorage
      localStorage.setItem('auth_token', 'test-token');
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      service.logout().subscribe(() => {
        expect(localStorage.getItem('auth_token')).toBeNull();
        expect(localStorage.getItem('auth_user')).toBeNull();
        done();
      });

      const req = httpMock.expectOne('/api/auth/logout');
      req.flush({ success: true });
    });
  });

  describe('Role Checks', () => {
    beforeEach(() => {
      // Setup authenticated user
      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(mockAuthResponse);

      // ✅ Manejar la petición /api/users/me que se dispara por forceRefresh()
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(mockAuthResponse);
    });

    it('should correctly identify admin role', () => {
      const adminUser: User = { ...mockUser, roles: [Role.ADMIN] };
      const adminResponse: AuthResponse = { ...mockAuthResponse, data: adminUser };

      service.login({ email: 'admin@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(adminResponse);

      // ✅ Manejar la petición /api/users/me
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(adminResponse);

      expect(service.isAdmin()).toBe(true);
    });

    it('should correctly identify partner role', () => {
      const partnerUser: User = { ...mockUser, roles: [Role.PARTNER] };
      const partnerResponse: AuthResponse = { ...mockAuthResponse, data: partnerUser };

      service.login({ email: 'partner@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(partnerResponse);

      // ✅ Manejar la petición /api/users/me
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(partnerResponse);

      expect(service.hasRole(Role.PARTNER)).toBe(true);
    });

    it('should correctly identify distributor role', () => {
      const distributorUser: User = { ...mockUser, roles: [Role.DISTRIBUTOR] };
      const distributorResponse: AuthResponse = { ...mockAuthResponse, data: distributorUser };

      service.login({ email: 'distributor@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(distributorResponse);

      // ✅ Manejar la petición /api/users/me
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(distributorResponse);

      expect(service.hasRole(Role.DISTRIBUTOR)).toBe(true);
    });

    it('should correctly identify authority role', () => {
      const authorityUser: User = { ...mockUser, roles: [Role.AUTHORITY] };
      const authorityResponse: AuthResponse = { ...mockAuthResponse, data: authorityUser };

      service.login({ email: 'authority@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(authorityResponse);

      // ✅ Manejar la petición /api/users/me
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(authorityResponse);

      expect(service.hasRole(Role.AUTHORITY)).toBe(true);
    });

    it('should handle multiple roles', () => {
      const multiRoleUser: User = { ...mockUser, roles: [Role.USER, Role.PARTNER] };
      const multiRoleResponse: AuthResponse = { ...mockAuthResponse, data: multiRoleUser };

      service.login({ email: 'multi@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(multiRoleResponse);

      // ✅ Manejar la petición /api/users/me
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(multiRoleResponse);

      expect(service.hasRole(Role.PARTNER)).toBe(true);
      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('Profile Completeness', () => {
    it('should calculate profile completeness from backend value', () => {
      const userWith75: User = { ...mockUser, profileCompleteness: 75 };
      const response: AuthResponse = { ...mockAuthResponse, data: userWith75 };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      // ✅ Manejar la petición /api/users/me
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.profileCompleteness()).toBe(75);
    });

    it('should return 0 for unauthenticated users', () => {
      expect(service.profileCompleteness()).toBe(0);
    });

    it('should check if profile is complete', () => {
      const completeUser: User = { ...mockUser, profileCompleteness: 100 };
      const response: AuthResponse = { ...mockAuthResponse, data: completeUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      // ✅ Manejar la petición /api/users/me
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.profileCompleteness()).toBe(100);
    });

    it('should check if profile is incomplete', () => {
      const incompleteUser: User = { ...mockUser, profileCompleteness: 50 };
      const response: AuthResponse = { ...mockAuthResponse, data: incompleteUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      // ✅ Manejar la petición /api/users/me
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.profileCompleteness()).toBe(50);
    });
  });

  describe('Session Persistence', () => {
    it('should save token to localStorage on login', (done) => {
      service.login({ email: 'test@example.com', password: 'password' }).subscribe(() => {
        // ✅ Usar el nombre correcto de la key
        expect(localStorage.getItem('auth_token')).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ ...mockAuthResponse, meta: { ...mockAuthResponse.meta, token: 'test-token-123' } as any });

      // ✅ Manejar la petición /api/users/me
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(mockAuthResponse);
    });

    it('should restore session from localStorage on initialization', () => {
      // ✅ Usar los nombres correctos de las keys
      localStorage.setItem('auth_token', 'existing-token');
      localStorage.setItem('auth_user', JSON.stringify(mockUser));

      service.initialize();

      // ✅ La petición /api/users/me se dispara automáticamente
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(mockAuthResponse);

      expect(service.isAuthenticated()).toBe(true);
      expect(service.user()).toEqual(mockUser);
    });
  });

  describe('Error Handling', () => {
    it('should handle 500 server errors', (done) => {
      service.login({ email: 'test@example.com', password: 'password' }).subscribe({
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ message: 'Internal server error' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle timeout errors', (done) => {
      service.login({ email: 'test@example.com', password: 'password' }).subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ message: 'Timeout' }, { status: 408, statusText: 'Request Timeout' });
    });
  });

  describe('Email Verification', () => {
    it('should check if email is verified', () => {
      const verifiedUser: User = { ...mockUser, emailVerified: true };
      const response: AuthResponse = { ...mockAuthResponse, data: verifiedUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      // ✅ Manejar la petición /api/users/me
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.emailVerified()).toBe(true);
    });

    it('should check if email is not verified', () => {
      const unverifiedUser: User = { ...mockUser, emailVerified: false };
      const response: AuthResponse = { ...mockAuthResponse, data: unverifiedUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      // ✅ Manejar la petición /api/users/me
      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.emailVerified()).toBe(false);
    });
  });

  describe('me()', () => {
    it('should fetch current user successfully', (done) => {
      service.me().subscribe({
        next: (user) => {
          expect(user).toEqual(mockUser);
          expect(service.user()).toEqual(mockUser);
          done();
        }
      });

      const req = httpMock.expectOne('/api/users/me');
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockAuthResponse);
    });

    it('should handle me() error', (done) => {
      service.me().subscribe({
        error: (error) => {
          expect(error.status).toBe(401);
          done();
        }
      });

      const req = httpMock.expectOne('/api/users/me');
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('refresh()', () => {
    it('should refresh token successfully', (done) => {
      service.refresh().subscribe({
        next: (user) => {
          expect(user).toEqual(mockUser);
          expect(service.isAuthenticated()).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/refresh');
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockAuthResponse);
    });

    it('should handle refresh error and clear user', (done) => {
      service.refresh().subscribe({
        error: (error) => {
          expect(error.status).toBe(401);
          expect(service.isAuthenticated()).toBe(false);
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/refresh');
      req.flush({ message: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('completeProfile()', () => {
    it('should complete profile successfully', (done) => {
      const profileData = {
        dni: '12345678',
        name: 'Test User',
        phone: '123456789',
        address: '123 Test St'
      };

      const updatedUser: User = { ...mockUser, hasPersonalInfo: true };
      const response: AuthResponse = { ...mockAuthResponse, data: updatedUser };

      service.completeProfile(profileData).subscribe({
        next: (user) => {
          expect(user.hasPersonalInfo).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne('/api/users/me/complete-profile');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(profileData);
      req.flush(response);
    });

    it('should handle completeProfile error', (done) => {
      service.completeProfile({
        dni: '12345678',
        name: 'Test',
        phone: '123',
        address: 'Test'
      }).subscribe({
        error: (error) => {
          expect(error.status).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne('/api/users/me/complete-profile');
      req.flush({ message: 'Invalid data' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('updatePersonalInfo()', () => {
    it('should update personal info successfully', (done) => {
      const updateData = { phone: '987654321', address: 'New Address' };

      service.updatePersonalInfo(updateData).subscribe({
        next: (user) => {
          expect(user).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne('/api/users/me/personal-info');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockAuthResponse);
    });

    it('should handle updatePersonalInfo error', (done) => {
      service.updatePersonalInfo({ phone: 'invalid' }).subscribe({
        error: (error) => {
          expect(error.status).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne('/api/users/me/personal-info');
      req.flush({ message: 'Invalid phone' }, { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('hasAnyRole()', () => {
    it('should return true when user has any of the roles', () => {
      const multiRoleUser: User = { ...mockUser, roles: [Role.USER, Role.PARTNER] };
      const response: AuthResponse = { ...mockAuthResponse, data: multiRoleUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.hasAnyRole([Role.ADMIN, Role.PARTNER])).toBe(true);
    });

    it('should return false when user has none of the roles', () => {
      const userOnly: User = { ...mockUser, roles: [Role.USER] };
      const response: AuthResponse = { ...mockAuthResponse, data: userOnly };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.hasAnyRole([Role.ADMIN, Role.PARTNER])).toBe(false);
    });
  });

  describe('hasAllRoles()', () => {
    it('should return true when user has all roles', () => {
      const multiRoleUser: User = { ...mockUser, roles: [Role.USER, Role.PARTNER, Role.ADMIN] };
      const response: AuthResponse = { ...mockAuthResponse, data: multiRoleUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.hasAllRoles([Role.USER, Role.PARTNER])).toBe(true);
    });

    it('should return false when user does not have all roles', () => {
      const singleRoleUser: User = { ...mockUser, roles: [Role.USER] };
      const response: AuthResponse = { ...mockAuthResponse, data: singleRoleUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.hasAllRoles([Role.USER, Role.ADMIN])).toBe(false);
    });
  });

  describe('canPurchase()', () => {
    it('should return true for admin users', () => {
      const adminUser: User = { ...mockUser, roles: [Role.ADMIN] };
      const response: AuthResponse = { ...mockAuthResponse, data: adminUser };

      service.login({ email: 'admin@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.canPurchase()).toBe(true);
    });

    it('should return true for verified users with personal info', () => {
      const verifiedUser: User = { ...mockUser, isVerified: true, hasPersonalInfo: true };
      const response: AuthResponse = { ...mockAuthResponse, data: verifiedUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.canPurchase()).toBe(true);
    });

    it('should return false for unverified users', () => {
      const unverifiedUser: User = { ...mockUser, isVerified: false, hasPersonalInfo: true };
      const response: AuthResponse = { ...mockAuthResponse, data: unverifiedUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.canPurchase()).toBe(false);
    });

    it('should return false for unauthenticated users', () => {
      expect(service.canPurchase()).toBe(false);
    });
  });

  describe('getPurchaseRequirements()', () => {
    it('should return requirements for unverified user without personal info', () => {
      const incompleteUser: User = { ...mockUser, isVerified: false, hasPersonalInfo: false };
      const response: AuthResponse = { ...mockAuthResponse, data: incompleteUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      const requirements = service.getPurchaseRequirements();
      expect(requirements.length).toBe(2);
    });

    it('should return empty array for unauthenticated user', () => {
      expect(service.getPurchaseRequirements()).toEqual([]);
    });
  });

  describe('getProfileSuggestions()', () => {
    it('should return suggestions for incomplete profile', () => {
      const incompleteUser: User = {
        ...mockUser,
        emailVerified: false,
        hasPersonalInfo: false,
        isVerified: false,
        isActive: false
      };
      const response: AuthResponse = { ...mockAuthResponse, data: incompleteUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      const suggestions = service.getProfileSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return empty array for unauthenticated user', () => {
      expect(service.getProfileSuggestions()).toEqual([]);
    });
  });

  describe('isVerified()', () => {
    it('should return true for verified user', () => {
      const verifiedUser: User = { ...mockUser, isVerified: true };
      const response: AuthResponse = { ...mockAuthResponse, data: verifiedUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.isVerified()).toBe(true);
    });

    it('should return false for unverified user', () => {
      const unverifiedUser: User = { ...mockUser, isVerified: false };
      const response: AuthResponse = { ...mockAuthResponse, data: unverifiedUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.isVerified()).toBe(false);
    });
  });

  describe('hasPersonalInfo()', () => {
    it('should return true when user has personal info', () => {
      const userWithInfo: User = { ...mockUser, hasPersonalInfo: true };
      const response: AuthResponse = { ...mockAuthResponse, data: userWithInfo };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.hasPersonalInfo()).toBe(true);
    });

    it('should return false when user lacks personal info', () => {
      const userWithoutInfo: User = { ...mockUser, hasPersonalInfo: false };
      const response: AuthResponse = { ...mockAuthResponse, data: userWithoutInfo };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.hasPersonalInfo()).toBe(false);
    });
  });

  describe('canRequestVerification()', () => {
    it('should return true when user can request verification', () => {
      const eligibleUser: User = {
        ...mockUser,
        emailVerified: true,
        hasPersonalInfo: true,
        isVerified: false
      };
      const response: AuthResponse = { ...mockAuthResponse, data: eligibleUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.canRequestVerification()).toBe(true);
    });

    it('should return false when already verified', () => {
      const verifiedUser: User = {
        ...mockUser,
        emailVerified: true,
        hasPersonalInfo: true,
        isVerified: true
      };
      const response: AuthResponse = { ...mockAuthResponse, data: verifiedUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.canRequestVerification()).toBe(false);
    });

    it('should return false for unauthenticated user', () => {
      expect(service.canRequestVerification()).toBe(false);
    });
  });

  describe('forceRefresh()', () => {
    it('should call me() when authenticated', () => {
      // First login
      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const loginReq = httpMock.expectOne('/api/auth/login');
      loginReq.flush(mockAuthResponse);

      const meReq1 = httpMock.expectOne('/api/users/me');
      meReq1.flush(mockAuthResponse);

      // Call forceRefresh
      service.forceRefresh();

      const meReq2 = httpMock.expectOne('/api/users/me');
      expect(meReq2.request.method).toBe('GET');
      meReq2.flush(mockAuthResponse);
    });

    it('should not call me() when not authenticated', () => {
      service.forceRefresh();
      httpMock.expectNone('/api/users/me');
    });
  });

  describe('refreshIfStale()', () => {
    it('should not refresh if not authenticated', () => {
      service.refreshIfStale();
      httpMock.expectNone('/api/users/me');
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle 403 with EMAIL_VERIFICATION_REQUIRED code', (done) => {
      service.login({ email: 'test@example.com', password: 'password' }).subscribe({
        error: (error) => {
          expect(error.message).toContain('verificar tu email');
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush(
        { message: 'Email not verified', errors: [{ code: 'EMAIL_VERIFICATION_REQUIRED' }] },
        { status: 403, statusText: 'Forbidden' }
      );
    });

    it('should handle 403 without specific code', (done) => {
      service.login({ email: 'test@example.com', password: 'password' }).subscribe({
        error: (error) => {
          expect(error.status).toBe(403);
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should preserve email in error response', (done) => {
      service.login({ email: 'test@example.com', password: 'password' }).subscribe({
        error: (error) => {
          expect(error.email).toBe('test@example.com');
          done();
        }
      });

      const req = httpMock.expectOne('/api/auth/login');
      req.flush(
        { message: 'Error', email: 'test@example.com' },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });

  describe('Profile completeness calculation fallback', () => {
    it('should calculate completeness when backend value is undefined', () => {
      const userWithoutCompleteness: User = {
        ...mockUser,
        profileCompleteness: undefined as any,
        isVerified: true,
        hasPersonalInfo: true
      };
      const response: AuthResponse = { ...mockAuthResponse, data: userWithoutCompleteness };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      // Should calculate: 25 (base) + 25 (verified) + 50 (personal info) = 100
      expect(service.profileCompleteness()).toBe(100);
    });

    it('should calculate 25 for base account only', () => {
      const basicUser: User = {
        ...mockUser,
        profileCompleteness: undefined as any,
        isVerified: false,
        hasPersonalInfo: false
      };
      const response: AuthResponse = { ...mockAuthResponse, data: basicUser };

      service.login({ email: 'test@example.com', password: 'password' }).subscribe();
      const req = httpMock.expectOne('/api/auth/login');
      req.flush(response);

      const meReq = httpMock.expectOne('/api/users/me');
      meReq.flush(response);

      expect(service.profileCompleteness()).toBe(25);
    });
  });
});
