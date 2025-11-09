import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  AuthorityDTO,
  CreateAuthorityDTO,
  UpdateAuthorityDTO,
  PatchAuthorityDTO,
} from '../../models/authority/authority.model';

@Injectable({ providedIn: 'root' })
export class AuthorityService {
  private readonly apiUrl = '/api/authorities';

  constructor(private http: HttpClient) {}

  getAllAuthorities(params?: { zoneId?: string; q?: string }): Observable<ApiResponse<AuthorityDTO[]>> {
    let httpParams = new HttpParams();
    if (params?.zoneId) httpParams = httpParams.set('zoneId', params.zoneId);
    if (params?.q) httpParams = httpParams.set('q', params.q);
    return this.http.get<ApiResponse<AuthorityDTO[]>>(this.apiUrl, { params: httpParams });
  }

  getAuthorityByDni(dni: string): Observable<ApiResponse<AuthorityDTO>> {
    return this.http.get<ApiResponse<AuthorityDTO>>(`${this.apiUrl}/${dni}`);
  }

  createAuthority(body: CreateAuthorityDTO): Observable<ApiResponse<AuthorityDTO>> {
    return this.http.post<ApiResponse<AuthorityDTO>>(this.apiUrl, body);
  }

  updateAuthority(dni: string, body: UpdateAuthorityDTO): Observable<ApiResponse<AuthorityDTO>> {
    return this.http.put<ApiResponse<AuthorityDTO>>(`${this.apiUrl}/${dni}`, body);
  }

  patchAuthority(dni: string, body: PatchAuthorityDTO): Observable<ApiResponse<AuthorityDTO>> {
    return this.http.patch<ApiResponse<AuthorityDTO>>(`${this.apiUrl}/${dni}`, body);
  }

  deleteAuthority(dni: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${dni}`);
  }
}