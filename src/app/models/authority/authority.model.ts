/**
 * Modelos de datos para autoridades
 * 
 * Este archivo define las estructuras de datos utilizadas para
 * gestionar autoridades en el sistema, incluyendo sus rangos y zonas asignadas.
 */

/**
 * DTO para transferir información de una autoridad
 * 
 * Ajustado al DTO expuesto por el backend. Incluye información
 * de la zona asignada y sobornos asociados.
 */
export interface AuthorityDTO {
  dni: string;        // Documento Nacional de Identidad
  name: string;       // Nombre completo de la autoridad
  rank: number;       // Rango de la autoridad (0-3, donde 0 es el más alto y 3 el más bajo)
  zone?: {           // Zona asignada (opcional)
    id?: number | string;
    name?: string;
  } | null;
  bribes?: any;       // Sobornos asociados (puede ser lista o string)
}

/**
 * DTO para crear una nueva autoridad
 *
 * Cuerpo de petición ajustado al esquema Zod del backend.
 * El backend espera strings para rank y zoneId y los transforma a números.
 */
export interface CreateAuthorityDTO {
  dni: string;                    // DNI de la autoridad (requerido)
  name: string;                   // Nombre completo (requerido)
  email: string;                  // Email (requerido)
  address?: string;               // Dirección (opcional)
  phone?: string;                 // Teléfono (opcional)
  // El backend espera un string '0'|'1'|'2'|'3' y lo transforma a número (0=más alto, 3=más bajo)
  rank: '0' | '1' | '2' | '3';
  // El backend espera un string y lo transforma a número
  zoneId: string;
  username?: string;              // Username para crear cuenta (opcional, solo en modo manual)
  password?: string;              // Contraseña para crear cuenta (opcional, solo en modo manual)
}

/**
 * DTO para actualización completa de una autoridad
 * 
 * Cuerpo para operaciones PUT que reemplazan todos los datos.
 */
export interface UpdateAuthorityDTO {
  name: string;                   // Nuevo nombre (requerido)
  rank: '0' | '1' | '2' | '3';   // Nuevo rango (requerido, 0=más alto, 3=más bajo)
  zoneId: string;                 // Nueva zona (requerido)
}

/**
 * DTO para actualización parcial de una autoridad
 * 
 * Cuerpo para operaciones PATCH que modifican solo campos específicos.
 */
export interface PatchAuthorityDTO {
  name?: string;                  // Nuevo nombre (opcional)
  rank?: '0' | '1' | '2' | '3';  // Nuevo rango (opcional, 0=más alto, 3=más bajo)
  zoneId?: string;                // Nueva zona (opcional)
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
