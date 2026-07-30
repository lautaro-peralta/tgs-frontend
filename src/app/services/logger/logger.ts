import { Injectable, isDevMode } from '@angular/core';

/**
 * Wrapper de logging condicionado por entorno.
 *
 * `debug` sólo imprime en desarrollo (isDevMode()); en un build de
 * producción (`ng build`, optimization habilitada) queda silenciado.
 * `warn`/`error` siempre imprimen: son diagnósticos que interesa
 * conservar incluso en producción.
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  debug(message: string, ...optionalParams: unknown[]): void {
    if (isDevMode()) {
      console.log(message, ...optionalParams);
    }
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    console.warn(message, ...optionalParams);
  }

  error(message: string, ...optionalParams: unknown[]): void {
    console.error(message, ...optionalParams);
  }
}
