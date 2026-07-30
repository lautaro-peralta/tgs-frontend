import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Rastrea si ya ocurrió la primera navegación real de la aplicación.
 *
 * Se suscribe a router.events una única vez (es un servicio singleton
 * `providedIn: 'root'`), evitando que consumidores como el auth interceptor
 * -que se ejecuta en cada request HTTP- tengan que crear su propia
 * suscripción al router.
 */
@Injectable({ providedIn: 'root' })
export class NavigationStateService {
  private readonly router = inject(Router);
  private _hasNavigatedOnce = false;

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this._hasNavigatedOnce = true;
      });
  }

  get hasNavigatedOnce(): boolean {
    return this._hasNavigatedOnce;
  }
}
