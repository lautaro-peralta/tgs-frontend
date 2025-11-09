/**
 * Modelos de datos para zonas territoriales
 * 
 * Este archivo define las estructuras de datos utilizadas para
 * gestionar zonas territoriales en el sistema.
 */

/**
 * DTO para transferir información de una zona territorial
 * 
 * Representa una zona con sus datos básicos y estado de sede principal.
 */
export interface ZoneDTO {
  id: number;              // Identificador único de la zona
  name: string;            // Nombre de la zona
  description?: string;    // Descripción adicional (opcional)
  isHeadquarters: boolean; // Indica si es la sede principal
}

/**
 * Interfaz genérica para respuestas de la API
 * 
 * @template T - Tipo de datos contenidos en la respuesta
 */
export interface ApiResponse<T> {
  data: T;           // Datos de la respuesta
  message?: string;  // Mensaje descriptivo (opcional)
}

/**
 * DTO para crear una nueva zona
 * 
 * Omite el campo 'id' ya que es generado automáticamente por el backend.
 */
export type CreateZoneDTO = Omit<ZoneDTO, 'id'>;

/**
 * DTO para actualización completa de una zona
 * 
 * Utilizado en operaciones PUT para reemplazar todos los datos.
 */
export type UpdateZonaDTO = CreateZoneDTO;

/**
 * DTO para actualización parcial de una zona
 * 
 * Utilizado en operaciones PATCH para modificar solo campos específicos.
 */
export type PatchZonaDTO = Partial<CreateZoneDTO>;
