/**
 * Modelos de datos para productos
 * 
 * Este archivo define las estructuras de datos utilizadas para
 * gestionar productos en el sistema, incluyendo operaciones CRUD
 * y transferencia de datos con el backend.
 */

/**
 * DTO para transferir información completa de un producto
 * 
 * Representa un producto con todos sus datos, incluyendo información
 * adicional calculada por el backend.
 */
export interface ProductDTO {
  id: number;                   // Identificador único del producto
  description: string;          // Descripción principal del producto
  detail?: string;              // Detalles adicionales del producto
  price: number;               // Precio del producto
  stock: number;               // Cantidad disponible en inventario
  isIllegal: boolean;          // Indica si el producto es ilegal
  imageUrl?: string;           // URL de la imagen (solo frontend)
  distributorsCount?: number;  // Cantidad de distribuidores asociados
  detailsCount?: number;       // Cantidad de detalles del producto
  
  // ✅ NUEVO: Información de distribuidores asociados
  distributors?: Array<{
    dni: string;
    name: string;
    zone?: {
      id: number;
      name: string;
      isHeadquarters?: boolean;
    } | null;
  }>;
}

/**
 * DTO para crear un nuevo producto
 *
 * Contiene los datos mínimos requeridos para crear un producto
 * en el sistema. El campo detail es obligatorio.
 */
export interface CreateProductDTO {
  description: string;    // Descripción principal del producto
  detail: string;         // Detalles adicionales (requerido)
  price: number;          // Precio del producto
  stock: number;          // Cantidad inicial en inventario
  isIllegal: boolean;     // Indica si el producto es ilegal
  distributorsIds?: string[];  // ✅ Array de DNIs de distribuidores (opcional)
}

/**
 * DTO para actualizar un producto existente
 * 
 * Todos los campos son opcionales, permitiendo actualizaciones
 * parciales del producto.
 */
export interface UpdateProductDTO {
  description?: string;  // Nueva descripción (opcional)
  detail?: string;       // Nuevos detalles (opcional)
  price?: number;        // Nuevo precio (opcional)
  stock?: number;        // Nuevo stock (opcional)
  isIllegal?: boolean;   // Nuevo estado de legalidad (opcional)
}

/**
 * Interfaz genérica para respuestas de la API de productos
 * 
 * Wrapper estándar para respuestas del backend con información
 * de éxito y mensajes descriptivos.
 * 
 * @template T - Tipo de datos contenidos en la respuesta
 */
export interface ApiResponse<T> {
  success: boolean;  // Indica si la operación fue exitosa
  message: string;   // Mensaje descriptivo de la respuesta
  data: T;          // Datos de la respuesta
}

// ============================================================================
// ✅ NUEVAS INTERFACES PARA EL MARKETPLACE (STORE)
// ============================================================================

/**
 * Representa una "oferta" de producto en el marketplace
 * 
 * Un mismo producto puede tener múltiples ofertas de diferentes distribuidores
 * con distintos precios y disponibilidad.
 */
export interface ProductOffer {
  // Información del producto base
  productId: number;
  description: string;
  detail?: string;
  imageUrl?: string;
  isIllegal: boolean;
  
  // Información específica del distribuidor
  distributorDni: string;
  distributorName: string;
  price: number;           // Precio definido por este distribuidor
  stock: number;           // Stock disponible en este distribuidor
  
  // Información de la zona
  zone?: {
    id: number;
    name: string;
    isHeadquarters?: boolean;
  } | null;
  
  // Identificador único de la oferta (para el carrito)
  offerId: string;  // Formato: "productId-distributorDni"
}

/**
 * Item en el carrito del marketplace
 * Basado en una oferta específica de un distribuidor
 */
export interface CartItem {
  offerId: string;         // ID único de la oferta
  productId: number;       // ID del producto base
  distributorDni: string;  // DNI del distribuidor
  description: string;
  imageUrl?: string;
  price: number;
  qty: number;
}

/**
 * Agrupación de productos por distribuidor en el carrito
 */
export interface CartByDistributor {
  distributorDni: string;
  distributorName: string;
  zone?: {
    id: number;
    name: string;
    isHeadquarters?: boolean;
  } | null;
  items: CartItem[];
  subtotal: number;
}