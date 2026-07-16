import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PasswordResetService } from '../../../services/password-reset/password-reset.service';
import { firstValueFrom } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { logger } from '../../../core/logger';

@Component({
  standalone: true,
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  private router = inject(Router);
  private resetService = inject(PasswordResetService);
  private translate = inject(TranslateService);

  email = '';
  state = signal<'form' | 'sent' | 'error'>('form');
  error = signal<string>('');
  isLoading = signal(false);

  async requestReset() {
    if (!this.email) {
      this.error.set(this.translate.instant('auth.forgotPassword.errors.enterEmail'));
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    try {
      const res = await firstValueFrom(this.resetService.requestReset(this.email));
      logger.debug('[ForgotPassword] Response:', res);

      if (res.success) {
        this.state.set('sent');
      } else {
        this.error.set(res.message || this.translate.instant('auth.forgotPassword.errors.sendFailed'));
        this.state.set('error');
      }
    } catch (e: any) {
      logger.error('[ForgotPassword] Error:', e);

      if (this.resetService.isCooldownError(e)) {
        this.error.set(this.translate.instant('auth.forgotPassword.errors.cooldown'));
      } else {
        this.error.set(e.message || this.translate.instant('auth.forgotPassword.errors.requestFailed'));
      }
      this.state.set('error');
    } finally {
      this.isLoading.set(false);
    }
  }

  resetForm() {
    this.state.set('form');
    this.error.set('');
    this.email = '';
  }

  goBack() {
    this.router.navigateByUrl('/');
  }
}
