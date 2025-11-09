/**
 * Modelos de usuario y roles del sistema
 * 
 * Este archivo define las estructuras de datos para usuarios y sus roles
 * dentro del sistema de gestión empresarial.
 */

/**
 * Enum que define todos los roles disponibles en el sistema
 * 
 * Cada rol tiene permisos específicos para acceder a diferentes
 * funcionalidades de la aplicación.
 */
export enum Role {
  ADMIN = 'ADMIN',           // Administrador del sistema
  PARTNER = 'PARTNER',       // Socio de la empresa
  DISTRIBUTOR = 'DISTRIBUTOR', // Distribuidor
  CLIENT = 'CLIENT',         // Cliente
  USER = 'USER',             // Usuario básico
  AUTHORITY = 'AUTHORITY',   // Autoridad
}

/**
 * Interfaz para la información personal del usuario
 */
export interface PersonInfo {
  dni: string;                   // Documento Nacional de Identidad
  name: string;                  // Nombre completo
  email: string;                 // Email de la persona
  phone: string;                 // Teléfono de contacto
  address: string;               // Dirección física
}

/**
 * Interfaz que define la estructura completa de un usuario
 *
 * Contiene toda la información necesaria para gestionar usuarios
 * en el sistema, incluyendo datos de autenticación, perfil y estado.
 */
export interface User {
  id: string;                    // Identificador único del usuario
  username: string;              // Nombre de usuario para login
  email: string;                 // Dirección de correo electrónico
  roles: Role[];                 // Lista de roles asignados al usuario
  isActive: boolean;             // Estado de activación de la cuenta
  isVerified: boolean;           // Estado general de verificación
  emailVerified: boolean;        // Estado de verificación del email
  profileCompleteness: number;   // Porcentaje de completitud del perfil (0-100)
  createdAt: string;             // Fecha de creación de la cuenta
  updatedAt: string;             // Fecha de última actualización
  lastLoginAt?: string;          // Fecha del último inicio de sesión (opcional)
  hasPersonalInfo: boolean;      // Indica si tiene información personal completa
  person?: PersonInfo | null;    // Información personal del usuario (si está disponible)
}