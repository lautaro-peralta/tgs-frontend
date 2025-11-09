import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  ApiResponse, 
  ClandestineAgreementDTO, 
  CreateClandestineAgreementDTO, 
  UpdateClandestineAgreementDTO 
} from '../../models/clandestine-agreement/clandestine-agreement.model';

@Injectable({ providedIn: 'root' })
export class ClandestineAgreementService {
  private readonly apiUrl = '/api/clandestine-agreements';

  constructor(private http: HttpClient) {}

  /**
   * Buscar acuerdos clandestinos con filtros opcionales
   * @param filters - Filtros opcionales para búsqueda
   * @returns Observable con lista de acuerdos
   */
  search(filters?: {
    shelbyCouncilId?: number;
    adminDni?: string;
    authorityDni?: string;
    status?: string;
  }): Observable<ApiResponse<ClandestineAgreementDTO[]>> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.shelbyCouncilId) {
        params = params.set('shelbyCouncilId', filters.shelbyCouncilId.toString());
      }
      if (filters.adminDni) {
        params = params.set('adminDni', filters.adminDni);
      }
      if (filters.authorityDni) {
        params = params.set('authorityDni', filters.authorityDni);
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
    }
    
    return this.http.get<ApiResponse<ClandestineAgreementDTO[]>>(
      `${this.apiUrl}/search`, 
      { params }
    );
  }

  /**
   * Listar todos los acuerdos clandestinos con paginación
   * @returns Observable con lista completa de acuerdos
   */
  list(): Observable<ApiResponse<ClandestineAgreementDTO[]>> {
    return this.http.get<ApiResponse<ClandestineAgreementDTO[]>>(this.apiUrl);
  }

  /**
   * Obtener un acuerdo clandestino específico por ID
   * @param id - ID del acuerdo
   * @returns Observable con el acuerdo solicitado
   */
  get(id: number): Observable<ApiResponse<ClandestineAgreementDTO>> {
    return this.http.get<ApiResponse<ClandestineAgreementDTO>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear un nuevo acuerdo clandestino
   * @param payload - Datos del nuevo acuerdo
   * @returns Observable con el acuerdo creado
   */
  create(payload: CreateClandestineAgreementDTO): Observable<ApiResponse<ClandestineAgreementDTO>> {
    return this.http.post<ApiResponse<ClandestineAgreementDTO>>(this.apiUrl, payload);
  }

  /**
   * Actualizar un acuerdo clandestino existente
   * IMPORTANTE: Usa método PUT (no PATCH) porque así está definido en el backend
   * Solo se pueden actualizar: description, agreementDate, status
   * NO se pueden cambiar: shelbyCouncilId, adminDni, authorityDni
   * @param id - ID del acuerdo a actualizar
   * @param payload - Datos a actualizar (parcial)
   * @returns Observable con el acuerdo actualizado
   */
  update(id: number, payload: UpdateClandestineAgreementDTO): Observable<ApiResponse<ClandestineAgreementDTO>> {
    return this.http.put<ApiResponse<ClandestineAgreementDTO>>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * Eliminar un acuerdo clandestino
   * @param id - ID del acuerdo a eliminar
   * @returns Observable vacío
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}