/**
 * Modelos de datos para ventas
 * 
 * Este archivo define las estructuras de datos utilizadas para
 * gestionar ventas en el sistema, incluyendo clientes, productos,
 * detalles de venta y operaciones CRUD.
 */

/**
 * DTO para información básica del cliente en una venta
 * 
 * Representa los datos mínimos necesarios del cliente
 * para procesar una venta.
 */
export interface SaleClientDTO {
  dni: string;        // Documento Nacional de Identidad del cliente
  name?: string;      // Nombre completo del cliente
  email?: string;     // Dirección de correo electrónico
  phone?: string;     // Número de teléfono
  address?: string;   // Dirección del cliente
}

/**
 * DTO para información básica del producto en una venta
 * 
 * Contiene los datos esenciales del producto para mostrar
 * en el contexto de una venta.
 */
export interface SaleProductDTO {
  id: number;         // Identificador único del producto
  description?: string; // Descripción del producto
  price?: number;     // Precio unitario del producto
  stock?: number;     // Stock disponible
}

/**
 * DTO para detalle de venta (producto y cantidad)
 * 
 * Representa un elemento individual dentro de una venta,
 * incluyendo el producto y la cantidad vendida.
 */
export interface SaleDetailDTO {
  productId: number;   // ID del producto vendido
  quantity: number;    // Cantidad vendida
  // Información expandida que viene del backend en operaciones GET
  product?: SaleProductDTO; // Datos completos del producto
  subtotal?: number;   // Subtotal calculado (precio * cantidad)
}

/**
 * DTO para transferir información completa de una venta
 * 
 * Representa una venta con todos sus datos, incluyendo
 * cliente, distribuidor, autoridad y detalles de productos.
 */
export interface SaleDTO {
  id: number;                    // Identificador único de la venta
  date?: string;                 // Fecha de la venta (formato legible)
  saleDate?: string;             // Fecha de la venta (backend usa "saleDate")
  client?: SaleClientDTO | null; // Datos del cliente
  distributor?: {                // Datos del distribuidor
    dni: string;
    name?: string;
    zone?: {
      id: number;
      name: string;
      isHeadquarters?: boolean;
    };
  };
  authority?: {                  // Datos de la autoridad involucrada
    dni: string;
    name?: string;
  };

  // Múltiples items de la venta
  details?: SaleDetailDTO[];

  // Diferentes campos de totales que puede usar el backend
  amount?: number;      // Monto total
  saleAmount?: number;  // Monto de la venta
  total?: number;       // Total general
}

/**
 * DTO para crear una nueva venta
 * 
 * Contiene los datos requeridos por el backend para crear
 * una nueva venta en el sistema.
 */
export interface CreateSaleDTO {
  clientDni?: string;         // ✅ CAMBIAR A OPCIONAL (el backend usa el del usuario autenticado si no se proporciona)
  distributorDni: string;     // DNI del distribuidor (requerido por el backend)
  details: SaleDetailDTO[];   // Lista de productos y cantidades
  person?: {                  // Información adicional del cliente (opcional)
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
}

/**
 * DTO para actualizar una venta existente
 * 
 * Permite modificar los datos de una venta, principalmente
 * el distribuidor y la autoridad involucrada.
 */
export interface UpdateSaleDTO {
  distributorDni?: string;    // Nuevo DNI del distribuidor (opcional)
  authorityDni?: string | null; // DNI de la autoridad (opcional, puede ser null)
}

/**
 * Interfaz genérica para respuestas de la API de ventas
 * 
 * Wrapper estándar para respuestas del backend con datos
 * y mensajes opcionales.
 * 
 * @template T - Tipo de datos contenidos en la respuesta
 */
export interface ApiResponse<T> {
  data?: T;       // Datos de la respuesta (opcional)
  message?: string; // Mensaje descriptivo (opcional)
}