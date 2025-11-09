/**
 * Modelos de datos para socios
 * 
 * Este archivo define las estructuras de datos utilizadas para
 * gestionar socios en el sistema, incluyendo sus decisiones asociadas.
 */

/**
 * DTO de referencia para decisiones de socios
 * 
 * Representa una referencia básica a una decisión tomada por un socio.
 */
export type PartnerDecisionRefDTO = {
  id: number;              // Identificador único de la decisión
  description?: string | null; // Descripción de la decisión (opcional)
};

/**
 * DTO para transferir información completa de un socio
 * 
 * Incluye datos personales, decisiones asociadas y timestamps.
 */
export interface PartnerDTO {
  dni: string;                           // Documento Nacional de Identidad
  name: string;                         // Nombre completo del socio
  email?: string | null;                // Dirección de correo electrónico (opcional)
  phone?: string | null;                // Número de teléfono (opcional)
  address?: string | null;              // Dirección (opcional)
  decisions?: PartnerDecisionRefDTO[] | null; // Decisiones asociadas (opcional)
  createdAt?: string;                   // Fecha de creación (opcional)
  updatedAt?: string;                   // Fecha de última actualización (opcional)
}

/**
 * DTO para crear un nuevo socio
 * 
 * El backend acepta crear socio con:
 * - dni, name, email (requeridos por validación del servidor)
 * - address, phone (opcionales)
 * - username, password (opcionales y deben venir juntos para crear la cuenta)
 *
 * Nota: si no se envían username+password, solo se crea el socio (sin usuario).
 */
export type CreatePartnerDTO = {
  dni: string;          // DNI del socio (requerido)
  name: string;         // Nombre completo (requerido)
  email: string;        // Email (requerido)
  address?: string | null;   // Dirección (opcional)
  phone?: string | null;     // Teléfono (opcional)
  username?: string | null;  // Nombre de usuario (opcional, backend lo soporta)
  password?: string | null;  // Contraseña (opcional, backend lo soporta)
};

/**
 * DTO para actualización parcial de un socio
 * 
 * Todos los campos son opcionales excepto el DNI que no puede ser modificado.
 */
export type PatchPartnerDTO = Partial<Omit<CreatePartnerDTO, 'dni'>>;

/**
 * Respuesta de la API para listado de socios
 */
export type PartnerListResponse = { data: PartnerDTO[] };

/**
 * Respuesta de la API para un socio individual
 */
export type PartnerItemResponse = { data: PartnerDTO };
