// src/app/services/bribe/bribe.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  ApiResponse, 
  BribeDTO, 
  CreateBribeDTO, 
  UpdateBribeDTO,
  PayBribesDTO,
  PayBribesResponse
} from '../../models/bribe/bribe.model';

@Injectable({ providedIn: 'root' })
export class BribeService {
  private readonly apiUrl = '/api/bribes';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los sobornos con paginación opcional
   */
  getAllBribes(page?: number, limit?: number): Observable<ApiResponse<BribeDTO[]>> {
    let params = new HttpParams();
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());
    
    return this.http.get<ApiResponse<BribeDTO[]>>(this.apiUrl, { 
      params,
      withCredentials: true 
    });
  }

  /**
   * Busca sobornos con múltiples criterios
   * @param paid - Estado de pago: 'true' | 'false'
   * @param date - Fecha ISO 8601
   * @param type - Tipo de búsqueda: 'exact' | 'before' | 'after' | 'between'
   * @param endDate - Fecha final (solo para type='between')
   */
  searchBribes(
    paid?: 'true' | 'false',
    date?: string,
    type?: 'exact' | 'before' | 'after' | 'between',
    endDate?: string,
    page?: number,
    limit?: number
  ): Observable<ApiResponse<BribeDTO[]>> {
    let params = new HttpParams();
    if (paid) params = params.set('paid', paid);
    if (date) params = params.set('date', date);
    if (type) params = params.set('type', type);
    if (endDate) params = params.set('endDate', endDate);
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());

    return this.http.get<ApiResponse<BribeDTO[]>>(`${this.apiUrl}/search`, { 
      params,
      withCredentials: true 
    });
  }

  /**
   * Obtiene un soborno por ID
   */
  getBribeById(id: number): Observable<ApiResponse<BribeDTO>> {
    return this.http.get<ApiResponse<BribeDTO>>(
      `${this.apiUrl}/${id}`, 
      { withCredentials: true }
    );
  }

  /**
   * Crea un nuevo soborno
   */
  createBribe(data: CreateBribeDTO): Observable<ApiResponse<BribeDTO>> {
    return this.http.post<ApiResponse<BribeDTO>>(
      this.apiUrl, 
      data, 
      { withCredentials: true }
    );
  }

  /**
   * Actualiza un soborno existente (PATCH - parcial)
   * Nota: El backend solo permite actualizar el campo 'amount'
   */
  updateBribe(id: number, data: UpdateBribeDTO): Observable<ApiResponse<BribeDTO>> {
    return this.http.patch<ApiResponse<BribeDTO>>(
      `${this.apiUrl}/${id}`, 
      data, 
      { withCredentials: true }
    );
  }

  /**
   * Marca múltiples sobornos como pagados
   */
  payBribes(ids: number[]): Observable<ApiResponse<PayBribesResponse>> {
    return this.http.patch<ApiResponse<PayBribesResponse>>(
      `${this.apiUrl}/pay`,
      { ids },
      { withCredentials: true }
    );
  }

  /**
   * Marca sobornos de una autoridad específica como pagados
   */
  payBribesByAuthority(dni: string, ids: number[]): Observable<ApiResponse<PayBribesResponse>> {
    return this.http.patch<ApiResponse<PayBribesResponse>>(
      `${this.apiUrl}/${dni}/pay`,
      { ids },
      { withCredentials: true }
    );
  }

  /**
   * Elimina un soborno por ID
   */
  deleteBribe(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/${id}`, 
      { withCredentials: true }
    );
  }
}