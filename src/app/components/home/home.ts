/**
 * Componente de página principal
 *
 * Maneja login/registro y el flujo de verificación de email (banner + reenvío),
 * respetando la estética existente. Incluye animaciones de placeholders y
 * soporte para las tarjetas de introducción (introItems + flip con teclado).
 */
import { Component, computed, effect, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { EmailVerificationService } from '../../features/inbox/services/email.verification';
import { EmailVerificationSyncService } from '../../services/email-verification-sync.service';
import { AuthTransitionService } from '../../services/ui/auth-transition';
import { AuthService } from '../../services/auth/auth';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type IntroItem = { titleKey: string; detailKey: string };

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private emailVerificationService = inject(EmailVerificationService);
  private syncService = inject(EmailVerificationSyncService);
  private transition = inject(AuthTransitionService);
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  user = computed(() => this.auth.user());

  // --- Estado verificación email ---
  needsEmailVerification = signal(false);
  resendingEmail = signal(false);
  emailSent = signal(false);
  actualEmail = signal<string | null>(null); // Email real cuando se loguea con username
  waitingForVerification = signal(false);

  // Cleanup functions para polling
  private stopPolling?: () => void;
  private removeStorageListener?: () => void;

  // --- Auth panel / animaciones de entrada/salida ---
  showAuthPanel = true;
  entering = false;
  hiding = false;

  // --- Modo actual: login | register ---
  mode = signal<'login' | 'register'>('login');
  setMode(m: 'login' | 'register') {
    if (this.mode() === m) return;
    this.mode.set(m);
    this.restartAnimationForMode();
  }

  // --- Logo fallback ---
  logoOk = true;
  onLogoError() { this.logoOk = false; }

  // --- Formularios ---
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.minLength(3)]], // Acepta email o username
    password: ['', [Validators.required]],
  });

  registerForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
    ]],
  });

  loadingLogin = false;
  loadingRegister = false;
  errorLogin: string | null = null;
  errorRegister: string | null = null;

  // Mostrar/ocultar contraseña
  showLoginPwd = false;
  showRegisterPwd = false;

  // Transición de login (velo con blur)
  authTransitioning = false;
  authPhase: 'loading' | 'success' = 'loading';
  private authTimers: any[] = [];

  // --- Animación de éxito de login ---
  authSuccess = false;
  private authSuccessTimer?: any;

  // --- Placeholders animados ---
  animatedPlaceholder = '';       // email (login/register)
  animatedNamePlaceholder = '';   // username (register)
  animatedPasswordPlaceholder = ''; // password (login)

  // --- Tokens para cancelar bucles de animación ---
  private emailToken = 0;
  private nameToken = 0;
  private passwordToken = 0;
  private bumpEmailToken(): number { return ++this.emailToken; }
  private bumpNameToken(): number { return ++this.nameToken; }
  private bumpPasswordToken(): number { return ++this.passwordToken; }

  // --- Datos para animación (placeholders de ejemplo) ---
  private loginCharacters = [
    { name: 'Anakin Skywalker', email: 'anakinskywalker@theforce.com' },
    { name: 'Luke Skywalker', email: 'lukeskywalker@jedi.com' },
    { name: 'Leia Organa', email: 'leia@rebellion.com' },
    { name: 'Obi-Wan Kenobi', email: 'obiwan@jedi.com' },
    { name: 'Yoda', email: 'yoda@dagobah.com' },
    { name: 'Darth Vader', email: 'darthvader@empire.com' },
    { name: 'Han Solo', email: 'hansolo@falcon.com' },
    { name: 'Chewbacca', email: 'chewie@kashyyyk.com' },
  ];
  private registerCharacters = [
    { name: 'Frodo Baggins', email: 'frodo@shire.com' },
    { name: 'Gandalf The Grey', email: 'gandalf@istari.com' },
    { name: 'Aragorn', email: 'aragorn@gondor.com' },
    { name: 'Legolas', email: 'legolas@woodland.com' },
    { name: 'Gimli', email: 'gimli@erebor.com' },
    { name: 'Boromir', email: 'boromir@gondor.com' },
  ];
  private loginCharacterIndex = 0;
  private registerCharacterIndex = 0;

  // Contraseñas temáticas para animación
  private loginPasswords = [
    'May_The_Force_2024',
    'UseTheForce123!',
    'DarkSide_Rules',
    'Jedi_Master_77',
    'RebelAlliance!',
    'Imperial_Order',
    'Millennium_Falcon',
    'Wookiee_Power!'
  ];
  private loginPasswordIndex = 0;

  // --- Estados animación ---
  private isTyping = false;
  private isTypingName = false;
  private isTypingPassword = false;
  private isDeletingEmail = false;
  private isDeletingName = false;
  private isDeletingPassword = false;
  private registerAnimationRunning = false;

  // ==========================
  // Intro cards (diseño original)
  // ==========================
  introItems: IntroItem[] = [
    { titleKey: 'home.intro.cards.1.title', detailKey: 'home.intro.cards.1.detail' },
    { titleKey: 'home.intro.cards.2.title', detailKey: 'home.intro.cards.2.detail' },
    { titleKey: 'home.intro.cards.3.title', detailKey: 'home.intro.cards.3.detail' },
    { titleKey: 'home.intro.cards.4.title', detailKey: 'home.intro.cards.4.detail' },
    { titleKey: 'home.intro.cards.5.title', detailKey: 'home.intro.cards.5.detail' },
    { titleKey: 'home.intro.cards.6.title', detailKey: 'home.intro.cards.6.detail' },
  ];

  // Set con índices de tarjetas "flipped"/expandibles
  flipped = new Set<number>();

  toggleFlip(i: number, ev?: Event) {
    ev?.preventDefault();
    ev?.stopPropagation();
    if (this.flipped.has(i)) this.flipped.delete(i);
    else this.flipped.add(i);
  }

  onCardKey(i: number, ev: KeyboardEvent) {
    // Soporta Enter y Space para accesibilidad
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.toggleFlip(i);
    }
  }
  // ==========================

  // --- Ocultar panel al loguearse con animación ---
  isLoggedIn = computed(() => !!this.user());
  private stopAuthEffect = effect(() => {
    const loggedIn = this.isLoggedIn();
    const mustShow = !loggedIn;
    if (mustShow && !this.showAuthPanel) {
      this.showAuthPanel = true;
      this.entering = true;
      queueMicrotask(() => setTimeout(() => (this.entering = false), 200));
    } else if (!mustShow && this.showAuthPanel) {
      // Durante la transición post-login (global), retenemos el panel
      if (this.transition.transitioning()) return;
      this.hiding = true;
      setTimeout(() => { this.showAuthPanel = false; this.hiding = false; }, 220);
    }
  });

  // --- Detectar verificación de email desde otra pestaña ---
  private verificationEffect = effect(() => {
    const verificationEvent = this.syncService.emailVerified();
    console.log('[Home] Effect ejecutado. Verification event:', verificationEvent, 'Waiting:', this.waitingForVerification());

    if (verificationEvent) {
      console.log('[Home] ✅ Email verificado detectado!', verificationEvent);
      if (this.waitingForVerification()) {
        console.log('[Home] Procediendo con auto-login para:', verificationEvent.email);
        this.handleEmailVerifiedFromAnotherTab(verificationEvent.email);
      } else {
        console.log('[Home] No estamos esperando verificación, ignorando evento');
      }
    }
  });

  // ==========================
  // Handlers de focus/blur (animación placeholders)
  // ==========================
  onEmailFocus() {
    // Detenemos la animación de email al enfocar
    this.bumpEmailToken();
    this.isTyping = false;
    this.isDeletingEmail = false;
    this.animatedPlaceholder = '';
  }

  onEmailBlur() {
    // Si el campo está vacío, reanudar animación
    const isLogin = this.mode() === 'login';
    const emailLogin = this.loginForm.get('email')?.value || '';
    const emailRegister = this.registerForm.get('email')?.value || '';
    const emptyLogin = isLogin && !emailLogin;
    const emptyRegister = !isLogin && !emailRegister;

    if (emptyLogin) {
      setTimeout(() => this.startLoginAnimation(), 100);
    } else if (emptyRegister) {
      setTimeout(() => this.startRegisterAnimation(), 100);
    }
  }

  onNameFocus() {
    this.bumpNameToken();
    this.isTypingName = false;
    this.isDeletingName = false;
    this.animatedNamePlaceholder = '';
  }

  onNameBlur() {
    const nameValue = this.registerForm.get('username')?.value || '';
    if (!nameValue && this.mode() === 'register') {
      setTimeout(() => this.startRegisterAnimation(), 100);
    }
  }

  onPasswordFocus() {
    // Detenemos la animación de password al enfocar
    this.bumpPasswordToken();
    this.isTypingPassword = false;
    this.isDeletingPassword = false;
    this.animatedPasswordPlaceholder = '';
  }

  onPasswordBlur() {
    // Si el campo está vacío, reanudar animación (tanto en login como register)
    const passwordValue = this.mode() === 'login'
      ? this.loginForm.get('password')?.value || ''
      : this.registerForm.get('password')?.value || '';

    if (!passwordValue) {
      setTimeout(() => this.startLoginPasswordAnimation(), 100);
    }
  }
  // ==========================

  ngOnInit() {
    this.startStarWarsAnimation();

    // Escuchar cambios en localStorage como fallback para verificación de email
    this.removeStorageListener = this.syncService.listenToStorageEvents();
  }

  ngOnDestroy() {
    // Invalidar todo lo pendiente
    this.bumpEmailToken();
    this.bumpNameToken();
    this.bumpPasswordToken();
    this.registerAnimationRunning = false;
    this.isTyping = this.isTypingName = this.isTypingPassword = this.isDeletingEmail = this.isDeletingName = this.isDeletingPassword = false;
    this.loginCharacterIndex = 0;
    this.registerCharacterIndex = 0;
    this.loginPasswordIndex = 0;

    // Limpiar recursos de verificación de email
    this.destroy$.next();
    this.destroy$.complete();

    // Limpiar polling si está activo
    if (this.stopPolling) {
      this.stopPolling();
    }

    // Remover listener de storage
    if (this.removeStorageListener) {
      this.removeStorageListener();
    }

    // Limpiar el servicio de sincronización
    this.syncService.reset();
  }

  emailAnimOn(): boolean {
    return this.isTyping || this.isDeletingEmail || !!this.animatedPlaceholder;
  }
  nameAnimOn(): boolean {
    return this.isTypingName || this.isDeletingName || !!this.animatedNamePlaceholder;
  }
  passwordAnimOn(): boolean {
    return this.isTypingPassword || this.isDeletingPassword || !!this.animatedPasswordPlaceholder;
  }

  // ===== Inicio / reinicio animación =====
  private startStarWarsAnimation() {
    this.isTyping = this.isTypingName = this.isDeletingEmail = this.isDeletingName = false;
    this.registerAnimationRunning = false;

    this.loginCharacterIndex = 0;
    this.registerCharacterIndex = 0;

    // Limpiar y empezar
    this.animatedPlaceholder = '';
    this.animatedNamePlaceholder = '';

    this.startAnimationForCurrentMode();
  }

  private startAnimationForCurrentMode() {
    if (this.mode() === 'login') this.startLoginAnimation();
    else this.startRegisterAnimation();
  }

  private async startLoginAnimation() {
    this.isTyping = false;
    this.isDeletingEmail = false;
    this.animatedNamePlaceholder = '';
    this.animatedPlaceholder = '';

    // También iniciar animación de password
    this.startLoginPasswordAnimation();

    while (this.mode() === 'login') {
      // Token único para TODO el ciclo (type + pause + delete) del email
      const token = this.bumpEmailToken();

      const email = this.loginCharacters[this.loginCharacterIndex].email;
      await this.typeEmail(email, token);
      if (token !== this.emailToken) break;

      await this.delay(3000);
      if (token !== this.emailToken) break;

      await this.deleteEmailText(email, token);
      if (token !== this.emailToken) break;

      // Descanso breve sin texto
      await this.delay(800);
      if (token !== this.emailToken) break;

      this.loginCharacterIndex = (this.loginCharacterIndex + 1) % this.loginCharacters.length;
    }

    // Limpiar al salir
    this.animatedPlaceholder = '';
  }

  private async startLoginPasswordAnimation() {
    this.isTypingPassword = false;
    this.isDeletingPassword = false;
    this.animatedPasswordPlaceholder = '';

    // Animar mientras estemos en login O register
    while (this.mode() === 'login' || this.mode() === 'register') {
      // Token único para TODO el ciclo (type + pause + delete) de la password
      const token = this.bumpPasswordToken();

      const password = this.loginPasswords[this.loginPasswordIndex];
      await this.typePassword(password, token);
      if (token !== this.passwordToken) break;

      await this.delay(3500);
      if (token !== this.passwordToken) break;

      await this.deletePasswordText(password, token);
      if (token !== this.passwordToken) break;

      // Descanso breve sin texto
      await this.delay(1000);
      if (token !== this.passwordToken) break;

      this.loginPasswordIndex = (this.loginPasswordIndex + 1) % this.loginPasswords.length;
    }

    // Limpiar al salir
    this.animatedPasswordPlaceholder = '';
  }

  private async startRegisterAnimation() {
    this.isTyping = this.isTypingName = this.isDeletingEmail = this.isDeletingName = false;
    this.registerAnimationRunning = true;

    this.animatedPlaceholder = '';
    this.animatedNamePlaceholder = '';

    this.runRegisterAnimationLoop();
    // Iniciar animación de password en paralelo
    this.startLoginPasswordAnimation();
  }

  private restartAnimationForMode() {
    // Invalidar todo lo que esté en curso
    this.bumpEmailToken();
    this.bumpNameToken();
    this.bumpPasswordToken();

    this.registerAnimationRunning = false;
    this.isTyping = this.isTypingName = this.isTypingPassword = this.isDeletingEmail = this.isDeletingName = this.isDeletingPassword = false;

    this.loginCharacterIndex = 0;
    this.registerCharacterIndex = 0;

    this.animatedPlaceholder = '';
    this.animatedNamePlaceholder = '';
    this.animatedPasswordPlaceholder = '';

    // Iniciar la animación inmediatamente sin delay
    setTimeout(() => this.startAnimationForCurrentMode(), 0);
  }

  private async runRegisterAnimationLoop() {
    while (this.registerAnimationRunning && this.mode() === 'register') {
      // Tokens por campo (independientes)
      const nameToken  = this.bumpNameToken();
      const emailToken = this.bumpEmailToken();

      const character = this.registerCharacters[this.registerCharacterIndex];

      await this.typeName(character.name, nameToken);
      if (nameToken !== this.nameToken) break;

      await this.delay(1000);
      if (emailToken !== this.emailToken) break;

      await this.typeEmail(character.email, emailToken);
      if (emailToken !== this.emailToken) break;

      await this.delay(3000);
      if (emailToken !== this.emailToken) break;

      await this.deleteEmailText(character.email, emailToken);
      if (emailToken !== this.emailToken) break;

      await this.delay(500);
      if (nameToken !== this.nameToken) break;

      await this.deleteNameText(character.name, nameToken);
      if (nameToken !== this.nameToken) break;

      await this.delay(500);
      if (nameToken !== this.nameToken || emailToken !== this.emailToken) break;

      // Descanso breve sin texto
      this.animatedPlaceholder = '';
      this.animatedNamePlaceholder = '';
      await this.delay(1200);
      if (nameToken !== this.nameToken || emailToken !== this.emailToken) break;

      this.registerCharacterIndex = (this.registerCharacterIndex + 1) % this.registerCharacters.length;
    }

    // Limpiar al salir
    this.animatedPlaceholder = '';
    this.animatedNamePlaceholder = '';
  }

  // ===== Lógica de tipeo/borrado (con tokens y snapshots) =====
  private async typeEmail(text: string, token: number) {
    if (this.isTyping) return;
    this.isTyping = true;

    // Escribir char a char, abortable
    for (let i = 0; i <= text.length; i++) {
      if (token !== this.emailToken) break;
      this.animatedPlaceholder = text.substring(0, i);

      let speed = 120;
      if (i < text.length * 0.3) speed = 150;
      else if (i > text.length * 0.7) speed = 80;
      if (text[i] === '@' || text[i] === '.') speed = 200;

      await this.delay(speed);
    }

    // Si se canceló, no tocar flags
    if (token === this.emailToken) this.isTyping = false;
  }

  private async deleteEmailText(text: string, token: number) {
    if (this.isDeletingEmail) return;
    this.isDeletingEmail = true;

    // Snapshot del texto actual para evitar "reapariciones"
    const starting = this.animatedPlaceholder || text;

    for (let i = starting.length; i >= 0; i--) {
      if (token !== this.emailToken) break;
      this.animatedPlaceholder = starting.substring(0, i);
      await this.delay(60);
    }

    if (token === this.emailToken) this.isDeletingEmail = false;
  }

  private async typePassword(text: string, token: number) {
    if (this.isTypingPassword) return;
    this.isTypingPassword = true;

    // Escribir char a char, abortable
    for (let i = 0; i <= text.length; i++) {
      if (token !== this.passwordToken) break;
      this.animatedPasswordPlaceholder = text.substring(0, i);

      let speed = 100;
      if (i < text.length * 0.3) speed = 130;
      else if (i > text.length * 0.7) speed = 70;
      if (text[i] === '_' || text[i] === '!' || text[i] === '@') speed = 180;

      await this.delay(speed);
    }

    if (token === this.passwordToken) this.isTypingPassword = false;
  }

  private async deletePasswordText(text: string, token: number) {
    if (this.isDeletingPassword) return;
    this.isDeletingPassword = true;

    const starting = this.animatedPasswordPlaceholder || text;

    for (let i = starting.length; i >= 0; i--) {
      if (token !== this.passwordToken) break;
      this.animatedPasswordPlaceholder = starting.substring(0, i);
      await this.delay(50);
    }

    if (token === this.passwordToken) this.isDeletingPassword = false;
  }

  private async typeName(text: string, token: number) {
    if (this.isTypingName) return;
    this.isTypingName = true;

    for (let i = 0; i <= text.length; i++) {
      if (token !== this.nameToken) break;
      this.animatedNamePlaceholder = text.substring(0, i);

      let speed = 120;
      if (i < text.length * 0.3) speed = 150;
      else if (i > text.length * 0.7) speed = 80;
      if (text[i] === ' ') speed = 200;
      else if (text[i] === '-' || text[i] === "'") speed = 180;

      await this.delay(speed);
    }

    if (token === this.nameToken) this.isTypingName = false;
  }

  private async deleteNameText(text: string, token: number) {
    if (this.isDeletingName) return;
    this.isDeletingName = true;

    const starting = this.animatedNamePlaceholder || text;

    for (let i = starting.length; i >= 0; i--) {
      if (token !== this.nameToken) break;
      this.animatedNamePlaceholder = starting.substring(0, i);
      await this.delay(60);
    }

    if (token === this.nameToken) this.isDeletingName = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==========================
  // Acciones auth
  // ==========================
  async submitLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorLogin = this.translate.instant('auth.errors.complete_fields');
      return;
    }

    this.errorLogin = null;
    this.needsEmailVerification.set(false);
    this.emailSent.set(false);
    this.actualEmail.set(null);
    this.loadingLogin = true;

    // Extract email and password before try block so they're accessible in catch
    const { email, password } = this.loginForm.getRawValue()!;

    try {
      // ✅ Guardar credenciales ANTES del login (para auto-login post-verificación)
      localStorage.setItem('pendingAuth', JSON.stringify({ email, password }));
      
      await firstValueFrom(this.auth.login({ email: email!, password: password! }));

      // ✅ Login exitoso - limpiar pendingAuth y cerrar panel
      localStorage.removeItem('pendingAuth');
      console.log('[Home] Login exitoso, cerrando panel auth');

      // Transición con velo y blur antes de mostrar el home
      this.authTransitioning = true;
      this.authPhase = 'loading';
      this.transition.start('login');
      this.authTimers.forEach(t => clearTimeout(t));
      this.authTimers = [];

      const __t1 = setTimeout(() => { this.authPhase = 'success'; this.transition.setSuccess(); }, 1400);
      const __t2 = setTimeout(() => {
        this.authTransitioning = false;
        this.transition.finish();
        if (this.showAuthPanel) {
          this.hiding = true;
          setTimeout(() => { this.showAuthPanel = false; this.hiding = false; }, 240);
        }
      }, 2400);
      this.authTimers.push(__t1, __t2);

    } catch (error: any) {
      // ✅ Detectar error de verificación
      if (this.emailVerificationService.isEmailVerificationError(error)) {
        this.needsEmailVerification.set(true);
        this.emailSent.set(false);
        this.waitingForVerification.set(true);
        this.errorLogin = null;

        // Extraer el email real de la respuesta (útil cuando se loguea con username)
        let emailToVerify = email!;
        if (error?.error?.email) {
          this.actualEmail.set(error.error.email);
          emailToVerify = error.error.email;
        }

        console.log('[Home] Esperando verificación de email para:', emailToVerify);

        // ✅ Iniciar polling para detectar cuando el email sea verificado
        this.stopPolling = this.syncService.startPollingVerification(emailToVerify, 3000);

        // NO limpiar pendingAuth aquí
      } else {
        localStorage.removeItem('pendingAuth');
        this.errorLogin = error?.message || this.translate.instant('auth.errors.login_failed');
      }
    } finally {
      this.loadingLogin = false;
    }
  }

  async resendVerificationEmailFromHome() {
    // Usar el email real si está disponible (cuando se loguea con username)
    // De lo contrario, usar el campo email del formulario (que puede ser email o username)
    const emailToUse = this.actualEmail() || this.loginForm.get('email')?.value;

    if (!emailToUse) {
      this.errorLogin = this.translate.instant('auth.errors.enter_email');
      return;
    }

    this.resendingEmail.set(true);
    this.errorLogin = null;
    this.emailSent.set(false);

    try {
      const response = await firstValueFrom(
        this.emailVerificationService.resendForUnverified(emailToUse)
      );

      if (response.success) {
        this.emailSent.set(true);
        this.errorLogin = null;
      } else {
        this.errorLogin = response.message || this.translate.instant('auth.errors.email_send_failed');
      }
    } catch (err: any) {
      console.error('[Home] Resend error:', err);

      if (this.emailVerificationService.isCooldownError(err)) {
        this.errorLogin = this.translate.instant('auth.errors.cooldown');
      } else if (this.emailVerificationService.isAlreadyVerifiedError(err)) {
        this.errorLogin = this.translate.instant('auth.errors.already_verified');
        this.needsEmailVerification.set(false);
        this.actualEmail.set(null);
      } else if (err.status === 404) {
        this.errorLogin = this.translate.instant('auth.errors.user_not_found');
      } else {
        this.errorLogin = err.message || this.translate.instant('auth.errors.verification_send_failed');
      }
    } finally {
      this.resendingEmail.set(false);
    }
  }

  /**
   * Maneja cuando el email fue verificado desde otra pestaña (auto-login)
   */
  private handleEmailVerifiedFromAnotherTab(email: string): void {
    console.log('[Home] Intentando auto-login después de verificación:', email);

    // Obtener credenciales de pendingAuth
    const raw = localStorage.getItem('pendingAuth');
    if (!raw) {
      console.warn('[Home] No hay credenciales pendientes para auto-login');
      this.waitingForVerification.set(false);
      return;
    }

    try {
      const { email: savedEmail, password } = JSON.parse(raw);

      // Verificar que el email coincida
      if (savedEmail.toLowerCase() !== email.toLowerCase()) {
        console.warn('[Home] El email verificado no coincide con las credenciales guardadas');
        this.waitingForVerification.set(false);
        return;
      }

      // Hacer auto-login
      this.loadingLogin = true;
      this.loadingRegister = true;
      this.auth.login({ email: savedEmail, password })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (user) => {
            console.log('[Home] Auto-login exitoso:', user);
            this.waitingForVerification.set(false);
            this.needsEmailVerification.set(false);
            this.loadingLogin = false;
            this.loadingRegister = false;

            // Limpiar credenciales pendientes
            localStorage.removeItem('pendingAuth');

            // Detener polling si está activo
            if (this.stopPolling) {
              this.stopPolling();
              this.stopPolling = undefined;
            }

            // Transición con velo y blur antes de mostrar el home
            this.authTransitioning = true;
            this.authPhase = 'loading';
            this.transition.start('login');
            this.authTimers.forEach(t => clearTimeout(t));
            this.authTimers = [];

            const __t1 = setTimeout(() => {
              this.authPhase = 'success';
              this.transition.setSuccess();
            }, 1400);

            const __t2 = setTimeout(() => {
              this.authTransitioning = false;
              this.transition.finish();
              if (this.showAuthPanel) {
                this.hiding = true;
                setTimeout(() => {
                  this.showAuthPanel = false;
                  this.hiding = false;
                }, 240);
              }
            }, 2400);

            this.authTimers.push(__t1, __t2);
          },
          error: (err) => {
            this.loadingLogin = false;
            this.loadingRegister = false;
            this.waitingForVerification.set(false);
            console.error('[Home] Error en auto-login:', err);
            this.errorLogin = this.translate.instant('auth.errors.auto_login_failed');
            this.errorRegister = this.translate.instant('auth.errors.auto_login_failed');
            localStorage.removeItem('pendingAuth');
          }
        });
    } catch (e) {
      console.error('[Home] Error parseando pendingAuth:', e);
      this.waitingForVerification.set(false);
    }
  }

  async submitRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      const pwd = this.registerForm.get('password');
      if (pwd?.hasError('pattern')) {
        this.errorRegister = this.translate.instant('auth.errors.password_requirements');
      } else {
        this.errorRegister = this.translate.instant('auth.errors.complete_fields');
      }
      return;
    }

    this.errorRegister = null;
    this.needsEmailVerification.set(false);
    this.emailSent.set(false);
    this.loadingRegister = true;

    try {
      const { username, email, password } = this.registerForm.getRawValue()!;

      // ✅ Guardar credenciales ANTES del registro (para auto-login post-verificación)
      localStorage.setItem('pendingAuth', JSON.stringify({ email, password }));

      const reg = await firstValueFrom(
        this.auth.register({ username: username!, email: email!, password: password! })
      );

      console.log('[Home] Registro exitoso:', reg);

      // ✅ Siempre mostrar banner de verificación después del registro
      this.needsEmailVerification.set(true);
      this.emailSent.set(true);
      this.waitingForVerification.set(true);
      this.errorRegister = null;

      // ✅ Mensaje informativo
      console.log('[Home] Esperando verificación de email para:', email);

      // ✅ Iniciar polling para detectar cuando el email sea verificado
      this.stopPolling = this.syncService.startPollingVerification(email!, 3000);

    } catch (e: any) {
      console.error('[Home] Register error:', e);

      // ✅ Si falla el registro, limpiar pendingAuth
      localStorage.removeItem('pendingAuth');

      if (this.emailVerificationService.isEmailVerificationError(e)) {
        this.needsEmailVerification.set(true);
        this.emailSent.set(true);
        this.errorRegister = null;
      } else {
        this.errorRegister = e?.message || this.translate.instant('auth.errors.register_failed');
      }
    } finally {
      this.loadingRegister = false;
    }
  }

  scrollToIntro(): void {
    if (typeof window === 'undefined') return;
    const el = document.getElementById('intro-panel');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  goStore() { this.router.navigateByUrl('/tienda'); }
}
