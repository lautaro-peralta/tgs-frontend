import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  UserVerification,
  UserVerificationStatusResponse,
  RequestUserVerificationDTO,
  RejectUserVerificationDTO,
  PaginatedUserVerifications,
  UserVerificationSearchParams,
} from '../models/user-verification.model';
import { logger } from '../../../core/logger';

@Injectable({
  providedIn: 'root'
})
export class UserVerificationService {
  private readonly baseUrl = '/api/user-verification';

  constructor(private http: HttpClient) {}

  /**
   * Solicitar verificación de usuario
   */
// user-verification.ts - ACTUALIZAR el método requestVerification

  async requestVerification(data: RequestUserVerificationDTO): Promise<UserVerification> {
    logger.debug('[UserVerificationService] 📤 Requesting verification:', data);
    
    try {
      const response = await firstValueFrom(
        this.http.post<{ data: UserVerification }>(
          `${this.baseUrl}/request`,
          data,
          { withCredentials: true }
        )
      );
      
      logger.debug('[UserVerificationService] ✅ Verification response:', response);
      return response.data;
    } catch (error: any) {
      logger.error('[UserVerificationService] ❌ Request failed:', {
        status: error.status,
        statusText: error.statusText,
        error: error.error,
        url: error.url
      });
      throw error;
    }
  }

  /**
   * Reenviar solicitud de verificación
   */
  async resendVerification(data: RequestUserVerificationDTO): Promise<void> {
    await firstValueFrom(
      this.http.post<{ message: string }>(
        `${this.baseUrl}/resend`,
        data,
        { withCredentials: true }
      )
    );
  }

  /**
   * Obtener estado de verificación por email
   */
  async getVerificationStatus(email: string): Promise<UserVerificationStatusResponse> {
    const response = await firstValueFrom(
      this.http.get<{ data: UserVerificationStatusResponse }>(
        `${this.baseUrl}/status/${email}`,
        { withCredentials: true }
      )
    );
    return response.data;
  }

  /**
   * [ADMIN] Obtener todas las solicitudes de verificación
   */
  async getAllVerifications(params: UserVerificationSearchParams): Promise<PaginatedUserVerifications> {
    let httpParams = new HttpParams();

    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return await firstValueFrom(
      this.http.get<PaginatedUserVerifications>(
        `${this.baseUrl}/admin/all`,
        { params: httpParams, withCredentials: true }
      )
    );
  }

  /**
   * [ADMIN] Aprobar verificación de usuario
   */
  async approveVerification(email: string): Promise<UserVerification> {
    const response = await firstValueFrom(
      this.http.post<{ data: UserVerification }>(
        `${this.baseUrl}/admin/approve/${email}`,
        {},
        { withCredentials: true }
      )
    );
    return response.data;
  }

  /**
   * [ADMIN] Rechazar verificación de usuario
   */
  async rejectVerification(email: string, data?: RejectUserVerificationDTO): Promise<UserVerification> {
    const response = await firstValueFrom(
      this.http.post<{ data: UserVerification }>(
        `${this.baseUrl}/admin/reject/${email}`,
        data || {},
        { withCredentials: true }
      )
    );
    return response.data;
  }

  /**
   * [ADMIN] Cancelar solicitud de verificación
   */
  async cancelVerification(email: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<{ message: string }>(
        `${this.baseUrl}/admin/cancel/${email}`,
        { withCredentials: true }
      )
    );
  }
}