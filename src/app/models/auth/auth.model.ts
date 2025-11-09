/**
 * Modelos de autenticación y DTOs (Data Transfer Objects)
 * 
 * Este archivo define las estructuras de datos utilizadas para
 * la comunicación con el backend en operaciones de autenticación
 * y transferencia de información de usuario.
 */

/**
 * DTO para transferir información básica de usuario
 * 
 * Representa la información mínima necesaria de un usuario
 * para operaciones que no requieren datos completos del perfil.
 */
export interface UsuarioDTO {
  id: string;           // Identificador único del usuario
  username: string;     // Nombre de usuario
  email: string;        // Dirección de correo electrónico
  roles: string[];      // Lista de roles como strings
}

/**
 * DTO para el proceso de inicio de sesión
 * 
 * Contiene los datos necesarios para autenticar a un usuario
 * en el sistema.
 */
export interface LoginDTO {
  email: string;        // Dirección de correo electrónico del usuario
  password: string;     // Contraseña del usuario
}

/**
 * DTO para el proceso de registro de nuevos usuarios
 * 
 * Contiene los datos mínimos necesarios para crear una nueva cuenta
 * de usuario en el sistema.
 */
export interface RegisterDTO {
  username: string;     // Nombre de usuario deseado
  email: string;        // Dirección de correo electrónico
  password: string;     // Contraseña para la cuenta
}

/**
 * Interfaz genérica para respuestas de la API
 * 
 * Wrapper estándar para todas las respuestas del backend,
 * encapsulando los datos en un objeto con propiedad 'data'.
 * 
 * @template T - Tipo de datos contenidos en la respuesta
 */
export interface ApiResponse<T> {
  data: T;  // Datos de la respuesta
}
