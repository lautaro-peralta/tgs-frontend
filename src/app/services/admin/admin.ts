import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, AdminDTO, CreateAdminDTO, PatchAdminDTO } from '../../models/admin/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiUrl = '/api/admin';

  constructor(private http: HttpClient) {}

  search(q?: string): Observable<ApiResponse<AdminDTO[]>> {
    const params = q ? new HttpParams().set('q', q) : undefined;
    return this.http.get<ApiResponse<AdminDTO[]>>(`${this.apiUrl}/search`, { params });
  }

  list(): Observable<ApiResponse<AdminDTO[]>> {
    return this.http.get<ApiResponse<AdminDTO[]>>(this.apiUrl);
  }

  get(dni: string): Observable<ApiResponse<AdminDTO>> {
    return this.http.get<ApiResponse<AdminDTO>>(`${this.apiUrl}/${dni}`);
  }

  create(payload: CreateAdminDTO): Observable<ApiResponse<AdminDTO>> {
    return this.http.post<ApiResponse<AdminDTO>>(this.apiUrl, payload);
  }

  update(dni: string, payload: PatchAdminDTO): Observable<ApiResponse<AdminDTO>> {
    return this.http.put<ApiResponse<AdminDTO>>(`${this.apiUrl}/${dni}`, payload);
  }

  delete(dni: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${dni}`);
  }
}
