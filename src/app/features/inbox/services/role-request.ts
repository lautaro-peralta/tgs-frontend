import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  RoleRequest,
  CreateRoleRequestDTO,
  ReviewRoleRequestDTO,
  RoleRequestSearchParams,
  PaginatedRoleRequests,
} from '../models/role-request.model';

@Injectable({
  providedIn: 'root'
})
export class RoleRequestService {
  private readonly baseUrl = 'http://localhost:3000/api/role-requests';

  constructor(private http: HttpClient) {}

  /**
   * ✅ CORREGIDO: Ahora envía withCredentials: true
   */
  async createRequest(data: CreateRoleRequestDTO): Promise<RoleRequest> {
    const response = await firstValueFrom(
      this.http.post<{ data: RoleRequest }>(this.baseUrl, data, {
        withCredentials: true // ✅ CRÍTICO: Enviar cookies de sesión
      })
    );
    return response.data;
  }

  /**
   * ✅ CORREGIDO: Ahora envía withCredentials: true
   */
  async getMyRequests(): Promise<RoleRequest[]> {
    const response = await firstValueFrom(
      this.http.get<{ data: RoleRequest[] }>(`${this.baseUrl}/me`, {
        withCredentials: true // ✅ CRÍTICO: Enviar cookies de sesión
      })
    );
    return response.data;
  }

  /**
   * ✅ CORREGIDO: Ahora envía withCredentials: true
   */
  async getPendingRequests(): Promise<RoleRequest[]> {
    const response = await firstValueFrom(
      this.http.get<{ data: RoleRequest[] }>(`${this.baseUrl}/pending`, {
        withCredentials: true // ✅ CRÍTICO: Enviar cookies de sesión
      })
    );
    return response.data;
  }

  /**
   * ✅ CORREGIDO: Ahora envía withCredentials: true
   */
  async searchRequests(params: RoleRequestSearchParams): Promise<PaginatedRoleRequests> {
    let httpParams = new HttpParams();

    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.requestedRole) httpParams = httpParams.set('requestedRole', params.requestedRole);
    if (params.userId) httpParams = httpParams.set('userId', params.userId);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return await firstValueFrom(
      this.http.get<PaginatedRoleRequests>(this.baseUrl, { 
        params: httpParams,
        withCredentials: true // ✅ CRÍTICO: Enviar cookies de sesión
      })
    );
  }

  /**
   * ✅ CORREGIDO: Ahora envía withCredentials: true
   */
  async reviewRequest(requestId: string, data: ReviewRoleRequestDTO): Promise<RoleRequest> {
    const response = await firstValueFrom(
      this.http.put<{ data: RoleRequest }>(
        `${this.baseUrl}/${requestId}/review`,
        data,
        {
          withCredentials: true // ✅ CRÍTICO: Enviar cookies de sesión
        }
      )
    );
    return response.data;
  }
}