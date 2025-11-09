/**
 * Modelos de datos para administradores
 * 
 * Este archivo define las estructuras de datos utilizadas para
 * gestionar administradores del sistema.
 */

/**
 * DTO para transferir información de un administrador
 * 
 * Contiene los datos básicos de un administrador del sistema.
 */
export interface AdminDTO {
  dni: string;        // Documento Nacional de Identidad
  name: string;       // Nombre completo del administrador
  email: string;      // Dirección de correo electrónico
  phone?: string | null; // Número de teléfono (opcional)
}

/**
 * DTO para crear un nuevo administrador
 * 
 * Contiene los datos requeridos para crear un nuevo administrador
 * en el sistema.
 */
export interface CreateAdminDTO {
  dni: string;    // DNI del administrador (requerido)
  name: string;   // Nombre completo (requerido)
  email: string;  // Email (requerido)
  phone?: string; // Teléfono (opcional)
}

/**
 * DTO para actualización parcial de un administrador
 * 
 * Todos los campos son opcionales para permitir actualizaciones
 * parciales mediante operaciones PATCH.
 */
export interface PatchAdminDTO {
  name?: string;  // Nuevo nombre (opcional)
  email?: string; // Nuevo email (opcional)
  phone?: string; // Nuevo teléfono (opcional)
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
