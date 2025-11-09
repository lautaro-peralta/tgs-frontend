import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export type VerificationStatusResponse = {
  success: boolean;
  message?: string;
  email?: string;
  verified?: boolean;
  verifiedAt?: string;
  data?: {
    success?: boolean;
    email?: string;
    status?: string; // 'verified' | 'pending' | 'expired'
    verified?: boolean;
    verifiedAt?: string;
    expiresAt?: string;
    createdAt?: string;
  };
  code?: string;
  statusCode?: number;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
};

export type ResendResponse = {
  success: boolean;
  message?: string;
  cooldownSeconds?: number;
};

@Injectable({ providedIn: 'root' })
export class EmailVerificationService {
  private http = inject(HttpClient);
  private base = '/api/email-verification';

  /**
   * ✅ CORREGIDO: El backend solo expone GET /verify/:token
   * No hay POST /verify, así que solo usamos GET
   */
  verifyToken(token: string): Observable<VerificationStatusResponse> {
    return this.http
      .get<VerificationStatusResponse>(`${this.base}/verify/${encodeURIComponent(token)}`, {
        withCredentials: true // ✅ CRÍTICO: Enviar cookies de sesión
      })
      .pipe(catchError((err) => throwError(() => this.normalizeError(err))));
  }

  /** Reenviar verificación (usuario logueado) */
  resendVerification(): Observable<ResendResponse> {
    return this.http
      .post<ResendResponse>(`${this.base}/resend`, {}, { withCredentials: true })
      .pipe(catchError((err) => throwError(() => this.normalizeError(err))));
  }

  /** Reenviar verificación (público, con email) */
  resendForUnverified(email: string): Observable<ResendResponse> {
    return this.http
      .post<ResendResponse>(`${this.base}/resend-unverified`, { email }, { withCredentials: true })
      .pipe(catchError((err) => throwError(() => this.normalizeError(err))));
  }

  /** Estado (público) */
  status(email: string): Observable<VerificationStatusResponse> {
    return this.http
      .get<VerificationStatusResponse>(`${this.base}/status/${encodeURIComponent(email)}`, {
        withCredentials: true
      })
      .pipe(catchError((err) => throwError(() => this.normalizeError(err))));
  }

  // ==== Helpers de detección para la UI ====
  isEmailVerificationError(err: any): boolean {
    const status = err?.status || err?.error?.status;
    const code = err?.code || err?.error?.code || err?.error?.errors?.[0]?.code;
    const msg = (err?.message || err?.error?.message || '').toString().toLowerCase();
    return status === 403 ||
           code === 'EMAIL_VERIFICATION_REQUIRED' ||
           msg.includes('verify') || msg.includes('verific');
  }

  isCooldownError(err: any): boolean {
    const code = err?.code || err?.error?.code || err?.error?.errors?.[0]?.code;
    const msg = (err?.message || err?.error?.message || '').toString().toLowerCase();
    return code === 'COOLDOWN' || code === 'VERIFICATION_COOLDOWN_ACTIVE' ||
           msg.includes('cooldown') || msg.includes('2 minutos') || msg.includes('2 minutes');
  }

  isAlreadyVerifiedError(err: any): boolean {
    const code = err?.code || err?.error?.code || err?.error?.errors?.[0]?.code;
    const msg = (err?.message || err?.error?.message || '').toString().toLowerCase();
    return code === 'ALREADY_VERIFIED' || code === 'EMAIL_ALREADY_VERIFIED' ||
           msg.includes('already verified') || msg.includes('ya está verificado') ||
           msg.includes('ya verificado');
  }

  private normalizeError(err: any) {
    return {
      status: err?.status,
      code: err?.error?.errors?.[0]?.code || err?.error?.code,
      message: err?.error?.message || err?.message || 'Error'
    };
  }
}