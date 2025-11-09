/**
 * Modelos de datos para clientes
 * 
 * Este archivo define las estructuras de datos utilizadas para
 * gestionar clientes en el sistema, incluyendo operaciones CRUD
 * y relaciones con ventas.
 */
import { SaleDTO } from '../sale/sale.model';

/**
 * DTO para transferir información completa de un cliente
 * 
 * Representa un cliente con todos sus datos, incluyendo
 * información de compras realizadas.
 */
export interface ClientDTO {
  dni: string;                    // Documento Nacional de Identidad
  name: string;                   // Nombre completo del cliente
  email: string;                  // Dirección de correo electrónico
  address?: string;               // Dirección del cliente (opcional)
  phone?: string;                 // Número de teléfono (opcional)
  purchases?: SaleDTO[] | string; // Historial de compras (puede ser array, string o no estar presente)
}

/**
 * DTO para crear un nuevo cliente
 * 
 * Incluye campos opcionales para crear también un usuario
 * asociado al cliente en el sistema.
 */
export interface CreateClientDTO {
  dni: string;        // DNI del cliente (requerido)
  name: string;       // Nombre completo (requerido)
  email: string;      // Correo electrónico (requerido)
  address?: string;   // Dirección (opcional)
  phone?: string;     // Teléfono (opcional)
  username?: string;  // Nombre de usuario para el sistema (opcional)
  password?: string;  // Contraseña para el sistema (opcional)
}

/**
 * DTO para actualizar un cliente existente
 * 
 * Todos los campos son opcionales, permitiendo actualizaciones
 * parciales de los datos del cliente.
 */
export interface UpdateClientDTO {
  name?: string;     // Nuevo nombre (opcional)
  email?: string;    // Nuevo email (opcional)
  address?: string;  // Nueva dirección (opcional)
  phone?: string;    // Nuevo teléfono (opcional)
}

/**
 * Interfaz genérica para respuestas de la API de clientes
 * 
 * Wrapper estándar para respuestas del backend con información
 * de éxito, mensajes y metadatos de paginación.
 * 
 * @template T - Tipo de datos contenidos en la respuesta
 */
export interface ApiResponse<T> {
  success: boolean;  // Indica si la operación fue exitosa
  message: string;   // Mensaje descriptivo de la respuesta
  data: T;          // Datos de la respuesta
  metadata?: {      // Metadatos de paginación (opcional)
    total?: number;     // Total de registros
    page?: number;      // Página actual
    limit?: number;     // Límite de registros por página
    totalPages?: number; // Total de páginas
  };
}

/**
 * Respuesta específica al crear un cliente
 * 
 * Incluye tanto los datos del cliente creado como la información
 * del usuario asociado (si se creó).
 */
export interface CreateClientResponse {
  client: ClientDTO;  // Datos del cliente creado
  user?: {           // Datos del usuario asociado (opcional)
    id: number;
    username: string;
    email: string;
  };
}