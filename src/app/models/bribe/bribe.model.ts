/**
 * Modelos de datos para sobornos
 * 
 * Este archivo define las estructuras de datos utilizadas para
 * gestionar sobornos en el sistema, incluyendo pagos y estados.
 */

/**
 * DTO para transferir información completa de un soborno
 * 
 * DTO del soborno que coincide con la respuesta del backend.
 */
export interface BribeDTO {
  id: number;        // Identificador único del soborno
  amount: number;    // Monto del soborno
  paid: boolean;     // Estado de pago del soborno
  creationDate: string; // Fecha de creación del soborno
  authority: {       // Información de la autoridad involucrada
    dni: string;
    name: string;
  };
  sale: {           // Información de la venta asociada
    id: number;
  };
}

/**
 * DTO para crear un nuevo soborno
 * 
 * ✅ authorityId debe ser string (DNI), no number
 */
export interface CreateBribeDTO {
  amount: number;     // Monto del soborno
  authorityId: string; // DNI de la autoridad (DNI es string)
  saleId: number;     // ID de la venta asociada
}

/**
 * DTO para actualizar un soborno existente
 * 
 * Permite modificar el monto del soborno.
 */
export interface UpdateBribeDTO {
  amount?: number;    // Nuevo monto (opcional)
}

/**
 * DTO para marcar sobornos como pagados
 * 
 * Permite marcar uno o múltiples sobornos como pagados.
 */
export interface PayBribesDTO {
  ids: number | number[]; // ID(s) del soborno(s) a marcar como pagado(s)
}

/**
 * Respuesta al procesar el pago de sobornos
 * 
 * Incluye información detallada sobre el resultado del pago.
 */
export interface PayBribesResponse {
  paid: Array<{     // Lista de sobornos procesados
    id: number;
    paid: boolean;
  }>;
  summary: {       // Resumen del procesamiento
    totalRequested: number;    // Total solicitado
    successfullyPaid: number;  // Pagados exitosamente
    notFound: number;         // No encontrados
  };
  notFoundIds?: number[]; // IDs de sobornos no encontrados (opcional)
}

/**
 * Interfaz genérica para respuestas de la API de sobornos
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