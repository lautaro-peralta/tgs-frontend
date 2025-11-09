/**
 * Servicio de gestión de clientes
 * 
 * Este servicio proporciona métodos para realizar operaciones CRUD
 * sobre clientes en el sistema, incluyendo búsqueda y paginación.
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  ClientDTO,
  CreateClientDTO,
  UpdateClientDTO,
  CreateClientResponse
} from '../../models/client/client.model';

/**
 * Servicio para gestión de clientes
 * 
 * Proporciona métodos para crear, leer, actualizar y eliminar clientes,
 * así como funcionalidades de búsqueda y paginación.
 */
@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly apiUrl = '/api/clients';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los clientes con paginación opcional
   * 
   * @param page - Número de página (opcional)
   * @param limit - Límite de resultados por página (opcional)
   * @returns Observable con la respuesta de la API incluyendo metadatos de paginación
   */
  getAllClients(page?: number, limit?: number): Observable<ApiResponse<ClientDTO[]>> {
    let params = new HttpParams();
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());

    return this.http.get<ApiResponse<ClientDTO[]>>(this.apiUrl, {
      params,
      withCredentials: true
    });
  }

  /**
   * Busca clientes por nombre con paginación opcional
   * 
   * @param query - Término de búsqueda para el nombre del cliente
   * @param page - Número de página (opcional)
   * @param limit - Límite de resultados por página (opcional)
   * @returns Observable con clientes que coinciden con la búsqueda
   */
  searchClients(query: string, page?: number, limit?: number): Observable<ApiResponse<ClientDTO[]>> {
    let params = new HttpParams().set('q', query);
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());

    return this.http.get<ApiResponse<ClientDTO[]>>(`${this.apiUrl}/search`, {
      params,
      withCredentials: true
    });
  }

  /**
   * Obtiene un cliente específico por su DNI
   * 
   * @param dni - Documento Nacional de Identidad del cliente
   * @returns Observable con los datos del cliente
   */
  getClientByDni(dni: string): Observable<ApiResponse<ClientDTO>> {
    return this.http.get<ApiResponse<ClientDTO>>(
      `${this.apiUrl}/${dni}`,
      { withCredentials: true }
    );
  }

  /**
   * Crea un nuevo cliente en el sistema
   * 
   * Opcionalmente puede crear también un usuario asociado al cliente
   * si se proporcionan las credenciales.
   * 
   * @param data - Datos del cliente a crear
   * @returns Observable con la respuesta incluyendo cliente y usuario creados
   */
  createClient(data: CreateClientDTO): Observable<ApiResponse<CreateClientResponse>> {
    return this.http.post<ApiResponse<CreateClientResponse>>(
      this.apiUrl,
      data,
      { withCredentials: true }
    );
  }

  /**
   * Actualiza un cliente existente
   * 
   * Utiliza PATCH para actualización parcial, permitiendo modificar
   * solo los campos especificados.
   * 
   * @param dni - DNI del cliente a actualizar
   * @param data - Datos a actualizar (parciales)
   * @returns Observable con los datos actualizados del cliente
   */
  updateClient(dni: string, data: UpdateClientDTO): Observable<ApiResponse<ClientDTO>> {
    return this.http.patch<ApiResponse<ClientDTO>>(
      `${this.apiUrl}/${dni}`,
      data,
      { withCredentials: true }
    );
  }

  /**
   * Elimina un cliente del sistema por DNI
   * 
   * @param dni - DNI del cliente a eliminar
   * @returns Observable con la respuesta de la API
   */
  deleteClient(dni: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/${dni}`,
      { withCredentials: true }
    );
  }
}