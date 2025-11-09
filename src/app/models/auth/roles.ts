/**
 * Utilidades para manejo de roles y desarrollo
 * 
 * Este archivo contiene funciones auxiliares para trabajar con roles,
 * incluyendo normalización, verificación de permisos y herramientas
 * de desarrollo para testing.
 */

/**
 * Tipo que define los roles disponibles en el sistema
 * 
 * Incluye variaciones de nombres para compatibilidad con diferentes
 * versiones del backend.
 */
export type Role = 'ADMIN' | 'SOCIO' | 'DISTRIBUIDOR' | 'CLIENT' | 'CLIENTE' | 'ADMINISTRATOR';

/**
 * Objeto constante que mapea los roles del sistema
 * 
 * Proporciona una forma consistente de acceder a los valores de roles
 * sin tener que recordar los strings exactos.
 */
export const ROLES = {
  ADMIN: 'ADMIN' as Role,
  SOCIO: 'SOCIO' as Role,
  DISTRIBUIDOR: 'DISTRIBUIDOR' as Role,
  CLIENT: 'CLIENT' as Role,
  CLIENTE: 'CLIENTE' as Role,
  ADMINISTRATOR: 'ADMINISTRATOR' as Role,
};

/**
 * Normaliza una lista de roles convirtiéndolos a mayúsculas
 * 
 * Útil para estandarizar los roles que pueden venir del backend
 * en diferentes formatos (mayúsculas, minúsculas, mixtas).
 * 
 * @param rs - Array de strings de roles a normalizar
 * @returns Array de roles normalizados en mayúsculas
 */
export function normalizeRoles(rs?: string[] | null): Role[] {
  return (rs ?? []).map(r => r.toUpperCase()) as Role[];
}

/**
 * Verifica si el usuario tiene al menos uno de los roles requeridos
 * 
 * Compara los roles del usuario con los roles requeridos, ignorando
 * diferencias de mayúsculas/minúsculas.
 * 
 * @param userRoles - Roles del usuario a verificar
 * @param required - Roles requeridos para el acceso
 * @returns true si el usuario tiene al menos uno de los roles requeridos
 */
export function hasAnyRole(userRoles: string[] | undefined | null, required: string[]): boolean {
  const set = new Set((userRoles ?? []).map(r => r.toUpperCase()));
  return required.some(r => set.has(r.toUpperCase()));
}

// ---- Utilidades para desarrollo y testing ----

/**
 * Verifica si está habilitado el bypass de autenticación para desarrollo
 * 
 * Permite saltarse la autenticación durante el desarrollo cuando
 * el backend no está disponible.
 * 
 * @returns true si el bypass está habilitado en localStorage
 */
export function devBypass(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem('authBypass') === 'true';
}

/**
 * Obtiene roles mock para desarrollo desde localStorage
 * 
 * Permite simular diferentes roles de usuario durante el desarrollo
 * sin necesidad de autenticación real.
 * 
 * @returns Array de roles mock configurados en localStorage
 */
export function getMockRoles(): Role[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem('mockRoles');
  const items = raw ? raw.split(',').map(s => s.trim().toUpperCase()) : [];
  return normalizeRoles(items);
}
