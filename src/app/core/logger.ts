import { isDevMode } from '@angular/core';

/**
 * Logger liviano condicionado por el modo de build de Angular.
 *
 * - `debug` / `info`: sólo se emiten en desarrollo (`isDevMode()`), por lo que
 *   desaparecen automáticamente de los builds de producción.
 * - `warn` / `error`: se emiten siempre, ya que son útiles para diagnosticar
 *   problemas reales incluso en producción.
 *
 * Motivación: la app está basada en signals (`computed()` / `effect()`). Loguear
 * dentro de derivaciones reactivas o en paths calientes (auth, render, cada
 * request HTTP) inunda la consola y puede afectar la performance. Los
 * diagnósticos intencionales deben pasar por acá y mantenerse FUERA de las
 * derivaciones reactivas.
 */
export const logger = {
  debug(...args: unknown[]): void {
    if (isDevMode()) console.debug(...args);
  },
  info(...args: unknown[]): void {
    if (isDevMode()) console.info(...args);
  },
  warn(...args: unknown[]): void {
    console.warn(...args);
  },
  error(...args: unknown[]): void {
    console.error(...args);
  },
};
