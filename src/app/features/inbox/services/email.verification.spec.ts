import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmailVerificationService, VerificationStatusResponse, ResendResponse } from './email.verification';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let httpMock: HttpTestingController;
  const baseUrl = '/api/email-verification';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EmailVerificationService]
    });
    service = TestBed.inject(EmailVerificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Verify that no unmatched requests are outstanding
  });

  describe('verifyToken()', () => {
    it('should verify a valid token successfully', (done) => {
      const token = 'valid-token-123';
      const mockResponse: VerificationStatusResponse = {
        success: true,
        message: 'Email verified successfully',
        email: 'test@example.com',
        verified: true,
        verifiedAt: new Date().toISOString()
      };

      service.verifyToken(token).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.email).toBe('test@example.com');
          expect(response.verified).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/verify/${encodeURIComponent(token)}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle invalid token error', (done) => {
      const token = 'invalid-token';
      const mockError = {
        status: 400,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid verification token'
        }
      };

      service.verifyToken(token).subscribe({
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.code).toBe('INVALID_TOKEN');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/verify/${encodeURIComponent(token)}`);
      req.flush(mockError.error, { status: mockError.status, statusText: 'Bad Request' });
    });

    it('should handle expired token error', (done) => {
      const token = 'expired-token';
      const mockError = {
        status: 410,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Verification token has expired'
        }
      };

      service.verifyToken(token).subscribe({
        error: (error) => {
          expect(error.status).toBe(410);
          expect(error.code).toBe('TOKEN_EXPIRED');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/verify/${encodeURIComponent(token)}`);
      req.flush(mockError.error, { status: mockError.status, statusText: 'Gone' });
    });

    it('should encode special characters in token', () => {
      const token = 'token+with/special=chars';
      service.verifyToken(token).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/verify/${encodeURIComponent(token)}`);
      expect(req.request.url).toContain(encodeURIComponent(token));
      req.flush({ success: true });
    });
  });

  describe('resendVerification()', () => {
    it('should resend verification email for authenticated user', (done) => {
      const mockResponse: ResendResponse = {
        success: true,
        message: 'Verification email sent successfully'
      };

      service.resendVerification().subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.message).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/resend`);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle cooldown error when resending too quickly', (done) => {
      const mockError = {
        status: 429,
        error: {
          code: 'COOLDOWN',
          message: 'Please wait 2 minutes before resending',
          cooldownSeconds: 120
        }
      };

      service.resendVerification().subscribe({
        error: (error) => {
          expect(error.status).toBe(429);
          expect(error.code).toBe('COOLDOWN');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/resend`);
      req.flush(mockError.error, { status: mockError.status, statusText: 'Too Many Requests' });
    });

    it('should handle already verified error', (done) => {
      const mockError = {
        status: 400,
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'Email is already verified'
        }
      };

      service.resendVerification().subscribe({
        error: (error) => {
          expect(error.code).toBe('ALREADY_VERIFIED');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/resend`);
      req.flush(mockError.error, { status: mockError.status, statusText: 'Bad Request' });
    });
  });

  describe('resendForUnverified()', () => {
    it('should resend verification email for unverified email', (done) => {
      const email = 'unverified@example.com';
      const mockResponse: ResendResponse = {
        success: true,
        message: 'Verification email sent'
      };

      service.resendForUnverified(email).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/resend-unverified`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email });
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle invalid email format', (done) => {
      const email = 'invalid-email';
      const mockError = {
        status: 400,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format'
        }
      };

      service.resendForUnverified(email).subscribe({
        error: (error) => {
          expect(error.code).toBe('INVALID_EMAIL');
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/resend-unverified`);
      req.flush(mockError.error, { status: mockError.status, statusText: 'Bad Request' });
    });
  });

  describe('status()', () => {
    it('should get verification status for an email', (done) => {
      const email = 'test@example.com';
      const mockResponse: VerificationStatusResponse = {
        success: true,
        email: email,
        verified: true,
        data: {
          status: 'verified',
          verified: true,
          verifiedAt: new Date().toISOString()
        }
      };

      service.status(email).subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.email).toBe(email);
          expect(response.verified).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/status/${encodeURIComponent(email)}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockResponse);
    });

    it('should handle email not found', (done) => {
      const email = 'nonexistent@example.com';
      const mockError = {
        status: 404,
        error: {
          code: 'EMAIL_NOT_FOUND',
          message: 'Email not found'
        }
      };

      service.status(email).subscribe({
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/status/${encodeURIComponent(email)}`);
      req.flush(mockError.error, { status: mockError.status, statusText: 'Not Found' });
    });
  });

  describe('Error Detection Helpers', () => {
    describe('isEmailVerificationError()', () => {
      it('should detect email verification error by status code', () => {
        const error = { status: 403 };
        expect(service.isEmailVerificationError(error)).toBe(true);
      });

      it('should detect email verification error by code', () => {
        const error = { error: { code: 'EMAIL_VERIFICATION_REQUIRED' } };
        expect(service.isEmailVerificationError(error)).toBe(true);
      });

      it('should detect email verification error by message', () => {
        const error = { message: 'Please verify your email' };
        expect(service.isEmailVerificationError(error)).toBe(true);
      });

      it('should return false for non-verification errors', () => {
        const error = { status: 500, message: 'Internal server error' };
        expect(service.isEmailVerificationError(error)).toBe(false);
      });
    });

    describe('isCooldownError()', () => {
      it('should detect cooldown error by code', () => {
        const error = { code: 'COOLDOWN' };
        expect(service.isCooldownError(error)).toBe(true);
      });

      it('should detect cooldown error by message', () => {
        const error = { message: 'Please wait 2 minutos' };
        expect(service.isCooldownError(error)).toBe(true);
      });

      it('should return false for non-cooldown errors', () => {
        const error = { message: 'Invalid token' };
        expect(service.isCooldownError(error)).toBe(false);
      });
    });

    describe('isAlreadyVerifiedError()', () => {
      it('should detect already verified error by code', () => {
        const error = { code: 'ALREADY_VERIFIED' };
        expect(service.isAlreadyVerifiedError(error)).toBe(true);
      });

      it('should detect already verified error by message', () => {
        const error = { message: 'Email already verified' };
        expect(service.isAlreadyVerifiedError(error)).toBe(true);
      });

      it('should return false for non-verified errors', () => {
        const error = { message: 'Token expired' };
        expect(service.isAlreadyVerifiedError(error)).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle network errors', (done) => {
      const token = 'test-token';

      service.verifyToken(token).subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/verify/${token}`);
      req.error(new ProgressEvent('Network error'));
    });

    it('should handle malformed server response', (done) => {
      const token = 'test-token';

      service.verifyToken(token).subscribe({
        next: (response) => {
          expect(response).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/verify/${token}`);
      req.flush(null);
    });

    it('should handle empty email in status check', (done) => {
      const email = '';

      service.status(email).subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${baseUrl}/status/${encodeURIComponent(email)}`);
      req.flush({ error: 'Invalid email' }, { status: 400, statusText: 'Bad Request' });
    });
  });
});
