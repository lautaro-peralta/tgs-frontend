/**
 * Servicio de gestión de productos
 * 
 * Este servicio proporciona métodos para realizar operaciones CRUD
 * sobre productos en el sistema, incluyendo búsqueda y filtrado.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  ApiResponse,
  ProductDTO,
  CreateProductDTO,
  UpdateProductDTO,
} from '../../models/product/product.model';

/**
 * Servicio para gestión de productos
 * 
 * Proporciona métodos para crear, leer, actualizar y eliminar productos,
 * así como funcionalidades de búsqueda y filtrado avanzado.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private base = '/api/products';

  /**
   * Obtiene todos los productos disponibles
   *
   * GET /api/products - Lista completa de productos
   * @returns Observable con array de productos
   */
  getAllProducts(): Observable<ProductDTO[]> {
    return this.http.get<ApiResponse<ProductDTO[]>>(this.base, {
      withCredentials: true
    }).pipe(
      map((res: any) => ('data' in res ? res.data : res) as ProductDTO[])
    );
  }

  /**
   * Alias para getAllProducts() - proporciona una interfaz más simple
   * @returns Observable con array de productos
   */
  list(): Observable<ProductDTO[]> {
    return this.getAllProducts();
  }

  /**
   * Obtiene un producto específico por su ID
   *
   * GET /api/products/:id - Producto individual
   * @param id - ID del producto a obtener
   * @returns Observable con los datos del producto
   */
  getProduct(id: number): Observable<ProductDTO> {
    return this.http.get<ApiResponse<ProductDTO>>(`${this.base}/${id}`, {
      withCredentials: true
    }).pipe(
      map((res: any) => ('data' in res ? res.data : res) as ProductDTO)
    );
  }

  /**
   * Crea un nuevo producto en el sistema
   *
   * POST /api/products - Creación de producto
   * @param payload - Datos del producto a crear
   * @returns Observable con la respuesta de la API
   */
  createProduct(payload: CreateProductDTO): Observable<ApiResponse<ProductDTO>> {
    return this.http.post<ApiResponse<ProductDTO>>(this.base, payload, {
      withCredentials: true
    });
  }

  /**
   * Actualiza un producto existente
   *
   * PATCH /api/products/:id - Actualización parcial
   * @param id - ID del producto a actualizar
   * @param payload - Datos a actualizar
   * @returns Observable con la respuesta de la API
   */
  updateProduct(id: number, payload: UpdateProductDTO): Observable<ApiResponse<ProductDTO>> {
    return this.http.patch<ApiResponse<ProductDTO>>(`${this.base}/${id}`, payload, {
      withCredentials: true
    });
  }

  /**
   * Elimina un producto del sistema
   *
   * DELETE /api/products/:id - Eliminación de producto
   * @param id - ID del producto a eliminar
   * @returns Observable con la respuesta de la API
   */
  deleteProduct(id: number): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.base}/${id}`, {
      withCredentials: true
    });
  }

  /**
   * Realiza búsqueda avanzada de productos
   *
   * GET /api/products/search - Búsqueda con filtros
   * @param params - Parámetros de búsqueda y filtrado
   * @returns Observable con array de productos filtrados
   */
  searchProducts(params: {
    q?: string;                    // Término de búsqueda
    by?: 'description' | 'legal';  // Campo por el cual buscar
    min?: number;                  // Precio mínimo
    max?: number;                  // Precio máximo
    page?: number;                 // Página para paginación
    limit?: number;                // Límite de resultados por página
  }): Observable<ProductDTO[]> {
    return this.http.get<ApiResponse<ProductDTO[]>>(`${this.base}/search`, {
      params: params as any,
      withCredentials: true
    }).pipe(
      map((res: any) => ('data' in res ? res.data : res) as ProductDTO[])
    );
  }
}