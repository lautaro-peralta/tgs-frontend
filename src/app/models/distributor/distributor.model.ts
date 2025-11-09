/**
 * Modelos de datos para distribuidores
 * 
 * Este archivo define las estructuras de datos utilizadas para
 * gestionar distribuidores en el sistema, incluyendo sus zonas
 * asignadas y productos asociados.
 */

/**
 * Tipo genérico para respuestas de la API
 * 
 * Puede ser un objeto con estructura estándar o directamente los datos.
 * 
 * @template T - Tipo de datos contenidos en la respuesta
 */
export type ApiResponse<T = any> = {
  message?: string;  // Mensaje descriptivo (opcional)
  success?: boolean; // Indica si la operación fue exitosa (opcional)
  data?: T          // Datos de la respuesta (opcional)
} | T;

/**
 * DTO para transferir información completa de un distribuidor
 * 
 * Incluye datos del distribuidor, su zona asignada y productos asociados.
 */
export interface DistributorDTO {
  dni: string;       // Documento Nacional de Identidad
  name: string;      // Nombre completo del distribuidor
  phone: string;     // Número de teléfono
  email: string;     // Dirección de correo electrónico
  address?: string;  // Dirección (opcional)
  zoneId?: number | null; // ID de la zona asignada (opcional)
  zone?: {          // Datos completos de la zona (opcional)
    id: number;
    name: string;
    isHeadquarters?: boolean;
  } | null;
  products?: Array<{ // Lista de productos asociados (opcional)
    id: number;
    description: string;
  }>;
  sales?: any[]; // Historial de ventas (opcional, solo en vistas detalladas)
}

/**
 * DTO para crear un nuevo distribuidor
 *
 * Contiene los datos requeridos para crear un distribuidor
 * y asociarlo a una zona y productos específicos.
 */
export interface CreateDistributorDTO {
  dni: string;        // DNI del distribuidor (requerido)
  name: string;       // Nombre completo (requerido)
  phone: string;      // Teléfono (requerido)
  email: string;      // Email (requerido)
  address?: string;   // Dirección (opcional)
  zoneId: number;     // ID de la zona (requerido, backend lo transforma de string a number)
  productsIds?: number[]; // IDs de productos asociados (opcional)
  username?: string;  // Username para crear cuenta (opcional, solo en modo manual)
  password?: string;  // Contraseña para crear cuenta (opcional, solo en modo manual)
}

/**
 * DTO para actualización parcial de un distribuidor
 * 
 * Todos los campos son opcionales para permitir actualizaciones
 * parciales mediante operaciones PATCH.
 */
export interface PatchDistributorDTO {
  name?: string;         // Nuevo nombre (opcional)
  phone?: string;        // Nuevo teléfono (opcional)
  email?: string;        // Nuevo email (opcional)
  address?: string;      // Nueva dirección (opcional)
  zoneId?: number;       // Nueva zona (opcional, backend lo transforma de string a number)
  productsIds?: number[]; // Nuevos productos asociados (opcional)
}