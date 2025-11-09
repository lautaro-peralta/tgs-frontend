import { Injectable, signal } from '@angular/core';

type Phase = 'loading' | 'success';
type Mode = 'login' | 'logout';

@Injectable({ providedIn: 'root' })
export class AuthTransitionService {
  private readonly _transitioning = signal(false);
  private readonly _phase = signal<Phase>('loading');
  private readonly _mode = signal<Mode>('login');

  transitioning = this._transitioning.asReadonly();
  phase = this._phase.asReadonly();
  mode = this._mode.asReadonly();

  start(mode: Mode = 'login'): void {
    this._mode.set(mode);
    this._phase.set('loading');
    this._transitioning.set(true);
  }

  setSuccess(): void {
    this._phase.set('success');
  }

  finish(): void {
    this._transitioning.set(false);
    this._phase.set('loading');
  }
}
