/**
 * Desempaquetado tipado de las respuestas del backend.
 *
 * El backend responde SIEMPRE con la forma estándar `ApiResponse`:
 *
 *   { success: boolean, message: string, data: T, meta: {...} }
 *
 * Antes, cada servicio/componente "adivinaba" el formato con lógica repetida
 * del tipo `Array.isArray(res) ? res : res?.data ?? []` y mucho uso de `any`.
 * Estos helpers centralizan esa lógica en un único lugar y devuelven un tipo
 * estable, de modo que los componentes consuman datos ya normalizados.
 *
 * La fuente de verdad es SIEMPRE `res.data`; el fallback al payload crudo se
 * mantiene sólo por robustez (por si un endpoint respondiera sin envolver).
 */
export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: unknown;
}

function hasDataProp(value: unknown): value is ApiEnvelope<unknown> {
  return typeof value === 'object' && value !== null && 'data' in value;
}

/** Extrae `data` de una respuesta estándar. Devuelve el payload crudo si no viene envuelto. */
export function unwrap<T>(res: ApiEnvelope<T> | T): T {
  return hasDataProp(res) ? ((res as ApiEnvelope<T>).data as T) : (res as T);
}

/** Igual que `unwrap`, pero garantiza SIEMPRE un array (vacío si la data no es una lista). */
export function unwrapList<T>(res: ApiEnvelope<T[]> | T[] | null | undefined): T[] {
  const data = hasDataProp(res) ? (res as ApiEnvelope<T[]>).data : res;
  return Array.isArray(data) ? data : [];
}
