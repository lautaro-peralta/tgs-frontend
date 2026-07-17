import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PasswordResetService } from '../../../services/password-reset/password-reset.service';
import { firstValueFrom } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { logger } from '../../../core/logger';

@Component({
  standalone: true,
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private resetService = inject(PasswordResetService);
  private translate = inject(TranslateService);

  token = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  state = signal<'validating' | 'form' | 'success' | 'error'>('validating');
  error = signal<string>('');
  isLoading = signal(false);

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token') || '';
    logger.debug('[ResetPassword] Token:', token);

    if (token) {
      this.token = token;
      this.validateToken();
    } else {
      this.error.set(this.translate.instant('auth.resetPassword.errors.tokenNotProvided'));
      this.state.set('error');
    }
  }

  async validateToken() {
    try {
      const res = await firstValueFrom(this.resetService.validateToken(this.token));
      logger.debug('[ResetPassword] Validation:', res);

      if (res.data?.isValid) {
        this.state.set('form');
      } else {
        if (res.data?.status === 'used') {
          this.error.set(this.translate.instant('auth.resetPassword.errors.linkUsed'));
        } else if (res.data?.status === 'expired') {
          this.error.set(this.translate.instant('auth.resetPassword.errors.linkExpired'));
        } else {
          this.error.set(this.translate.instant('auth.resetPassword.errors.linkInvalid'));
        }
        this.state.set('error');
      }
    } catch (e: any) {
      logger.error('[ResetPassword] Validation error:', e);

      if (this.resetService.isTokenExpired(e)) {
        this.error.set(this.translate.instant('auth.resetPassword.errors.requestNew'));
      } else if (this.resetService.isTokenAlreadyUsed(e)) {
        this.error.set(this.translate.instant('auth.resetPassword.errors.linkUsed'));
      } else {
        this.error.set(e.message || this.translate.instant('auth.resetPassword.errors.validationFailed'));
      }
      this.state.set('error');
    }
  }

  togglePasswordVisibility(field: 'password' | 'confirm') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  async resetPassword() {
    if (this.newPassword !== this.confirmPassword) {
      this.error.set(this.translate.instant('auth.resetPassword.errors.passwordsMismatch'));
      return;
    }

    // Validate password requirements (8 chars, uppercase, lowercase, number, special)
    if (this.newPassword.length < 8) {
      this.error.set(this.translate.instant('auth.resetPassword.errors.minLengthError'));
      return;
    }

    if (!/[A-Z]/.test(this.newPassword)) {
      this.error.set(this.translate.instant('auth.resetPassword.errors.uppercaseError'));
      return;
    }

    if (!/[a-z]/.test(this.newPassword)) {
      this.error.set(this.translate.instant('auth.resetPassword.errors.lowercaseError'));
      return;
    }

    if (!/[0-9]/.test(this.newPassword)) {
      this.error.set(this.translate.instant('auth.resetPassword.errors.numberError'));
      return;
    }

    if (!/[@$!%*?&]/.test(this.newPassword)) {
      this.error.set(this.translate.instant('auth.resetPassword.errors.specialError'));
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    try {
      const res = await firstValueFrom(
        this.resetService.resetPassword(this.token, this.newPassword)
      );
      logger.debug('[ResetPassword] Success:', res);

      if (res.success) {
        this.state.set('success');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          this.goToLogin();
        }, 3000);
      } else {
        this.error.set(res.message || this.translate.instant('auth.resetPassword.errors.resetFailed'));
      }
    } catch (e: any) {
      logger.error('[ResetPassword] Error:', e);

      if (this.resetService.isTokenExpired(e)) {
        this.error.set(this.translate.instant('auth.resetPassword.errors.requestNew'));
      } else if (this.resetService.isTokenAlreadyUsed(e)) {
        this.error.set(this.translate.instant('auth.resetPassword.errors.linkUsed'));
      } else {
        this.error.set(e.message || this.translate.instant('auth.resetPassword.errors.requestFailed'));
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  goToLogin() {
    this.router.navigateByUrl('/');
  }

  goToForgotPassword() {
    this.router.navigateByUrl('/forgot-password');
  }
}
