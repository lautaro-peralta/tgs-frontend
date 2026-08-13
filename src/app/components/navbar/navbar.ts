import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  QueryList,
  ViewChild,
  ViewChildren,
  inject,
  computed,
  effect,
  signal,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth';
import { Role } from '../../models/user/user.model';
import { I18nService } from '../../services/i18n/i18n.js';
import { TranslateModule } from '@ngx-translate/core';
import { AuthTransitionService } from '../../services/ui/auth-transition';
import { NotificationService } from '../../features/inbox/services/notification.service';
import { LoggerService } from '../../services/logger/logger';

interface MenuItem { label: string; path: string; }

/** Identificadores de los menús desplegables de la navbar. */
type DropdownId = 'lang' | 'mgmt' | 'user' | 'guest';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translateX(-150px) scale(0.75)',
          maxWidth: '0px',
          overflow: 'hidden',
        }),
        animate('1200ms 100ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', style({
          opacity: 1,
          transform: 'translateX(0) scale(1)',
          maxWidth: '250px',
        }))
      ]),
      transition(':leave', [
        style({
          overflow: 'hidden',
        }),
        animate('600ms cubic-bezier(0.6, 0.04, 0.98, 0.335)', style({
          opacity: 0,
          transform: 'translateX(-150px) scale(0.75)',
          maxWidth: '0px',
        }))
      ])
    ])
  ]
})
export class NavbarComponent implements AfterViewInit, OnDestroy {
  private auth = inject(AuthService);
  private routerSvc = inject(Router);
  private i18n = inject(I18nService);
  private transition = inject(AuthTransitionService);
  private notificationService = inject(NotificationService);
  private logger = inject(LoggerService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  // Signal para el contador de notificaciones no leídas
  private unreadNotifications = signal<number>(0);
  private pollingInterval?: number;

  // Toast para nuevas notificaciones
  newNotificationToast = signal<{
    title: string;
    message: string;
    type: string;
    show: boolean;
  } | null>(null);

  // 📱 Menú móvil
  mobileMenuOpen = signal<boolean>(false);

  /**
   * Desplegable abierto por click/teclado (null = ninguno).
   * El hover lo sigue manejando el CSS; esto existe para que los menús también
   * se puedan abrir con click y con teclado, y para poder reflejar el estado
   * real en aria-expanded.
   */
  readonly openDropdown = signal<DropdownId | null>(null);

  // 🌐 Dropdown de idioma (mantiene la API previa sobre el nuevo estado)
  langDropdownOpen = computed(() => this.openDropdown() === 'lang');

  // ✅ Señales reactivas del AuthService
  readonly isLoggedIn = computed(() => this.auth.isAuthenticated());
  readonly user = computed(() => this.auth.user());
  readonly currentRoles = computed(() => this.auth.currentRoles());
  readonly profileCompleteness = computed(() => this.auth.profileCompleteness());

  readonly userRoles = computed(() => this.currentRoles());

  // ✅ Computed para verificar si puede acceder a la tienda
  readonly canSeeStore = computed(() => {
    const isAuth = this.isAuthenticated();
    const roles = this.currentRoles();
    const hasClient = roles.includes(Role.CLIENT);
    const hasUser = roles.includes(Role.USER);
    const hasAdmin = roles.includes(Role.ADMIN);

    return isAuth && (hasClient || hasUser || hasAdmin);
  });

  readonly brand = 'GarrSYS';

  lang(): 'en' | 'es' { return (this.i18n.current as 'en' | 'es') || 'en'; }
  setLang(l: 'en' | 'es') {
    this.i18n.use(l);
    this.closeDropdowns();
    // Las etiquetas cambian de ancho al traducirse: hay que recolocar la
    // píldora de vidrio o queda desalineada respecto del ítem activo.
    setTimeout(() => this.updateIndicator(), 0);
  }
  flagClass(): string { return this.lang() === 'es' ? 'flag flag-es' : 'flag flag-en'; }

  /** ¿Está abierto este desplegable? (para aria-expanded y la clase .open) */
  isDropdownOpen(id: DropdownId): boolean {
    return this.openDropdown() === id;
  }

  /** Abre el desplegable pedido y cierra cualquier otro. */
  toggleDropdown(id: DropdownId): void {
    this.openDropdown.update(cur => (cur === id ? null : id));
  }

  openDropdownById(id: DropdownId): void {
    this.openDropdown.set(id);
  }

  closeDropdowns(): void {
    this.openDropdown.set(null);
  }

  // Alias retrocompatibles del selector de idioma
  toggleLangDropdown() { this.toggleDropdown('lang'); }
  openLangDropdown() { this.openDropdownById('lang'); }
  closeLangDropdown() { if (this.isDropdownOpen('lang')) this.closeDropdowns(); }

  /** Escape cierra menús y el drawer móvil. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDropdowns();
    this.closeMobileMenu();
  }

  /** Un click fuera de la navbar cierra los desplegables abiertos por click. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.openDropdown() === null) return;
    const target = event.target as HTMLElement | null;
    if (target && this.host.nativeElement.contains(target)) return;
    this.closeDropdowns();
  }

  /**
   * La píldora de vidrio se posiciona en px a partir de getBoundingClientRect,
   * así que cualquier reflow (resize, zoom, cambio de orientación) la deja
   * apuntando al lugar equivocado si no se recalcula.
   */
  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
    this.resizeRaf = requestAnimationFrame(() => this.updateIndicator());
  }

  private resizeRaf?: number;

  // ✅ Items de gestión completos (para ADMIN, PARTNER, DISTRIBUTOR)
  readonly gestionItems: MenuItem[] = [
    { label: 'mgmt.product', path: '/producto' },
    { label: 'mgmt.client', path: '/cliente' },
    { label: 'mgmt.partner', path: '/socio' },
    { label: 'mgmt.sale', path: '/venta' },
    { label: 'mgmt.zone', path: '/zona' },
    { label: 'mgmt.authority', path: '/autoridad' },
    { label: 'mgmt.bribe', path: '/sobornos' },
    { label: 'mgmt.decision', path: '/decision' },
    { label: 'mgmt.topic', path: '/tematica' },
    { label: 'mgmt.distributor', path: '/distribuidor' },
    { label: 'mgmt.shelbyCouncil', path: '/consejo-shelby' },
    { label: 'mgmt.monthlyReview', path: '/revisiones-mensuales' },
    { label: 'mgmt.clandestineAgreement', path: '/acuerdos-clandestinos' },
    { label: 'mgmt.admin', path: '/admin' },
  ];

  // ✅ Items limitados para AUTHORITY (Ventas y Mis Sobornos solamente)
  readonly authorityGestionItems: MenuItem[] = [
    { label: 'mgmt.sale', path: '/venta' },
    { label: 'mgmt.myBribes', path: '/sobornos' },
  ];

  readonly publicItems: MenuItem[] = [
    { label: 'nav.about', path: '/sobre-nosotros' },
    { label: 'nav.faqs', path: '/faqs' },
    { label: 'nav.contact', path: '/contactanos' },
  ];

  readonly clientItems: MenuItem[] = [
    { label: 'nav.store', path: '/tienda' },
  ];

  indicator = { x: 0, y: 0, w: 0, h: 0, visible: false };

  @ViewChild('menu', { static: true }) menuRef!: ElementRef<HTMLUListElement>;
  @ViewChildren('mainBtn') buttons!: QueryList<ElementRef<HTMLAnchorElement | HTMLButtonElement>>;

  constructor(router: Router) {
    router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => this.updateIndicator(), 0);
        // 📱 Cerrar menú móvil al navegar
        this.closeMobileMenu();
        // Y cualquier desplegable que hubiera quedado abierto por click
        this.closeDropdowns();
        // Actualizar contador de notificaciones al navegar
        if (this.isAuthenticated()) {
          this.loadUnreadCount();
        }
      });


    // ♻️ Refrescar roles del usuario en cada navegación (ligero y seguro)
    if (this.isAuthenticated()) {
      this.auth.refreshIfStale(0); // 0 = siempre que cambies de ruta
    }

    // ✅ Effect para reaccionar a cambios en roles y usuario
    effect(() => {
      const roles = this.userRoles();
      const user = this.user();

      if (user && roles.length > 0) {
        // Actualizar indicador visual después de cambios
        setTimeout(() => this.updateIndicator(), 100);
      }
    });

    // Iniciar polling de notificaciones
    this.startNotificationPolling();
  }

  ngAfterViewInit() {
    this.updateIndicator();
  }

  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  private roles(): Role[] {
    return this.currentRoles();
  }

  isClient(): boolean {
    return this.auth.hasRole(Role.CLIENT);
  }

  isAdmin(): boolean {
    return this.auth.hasRole(Role.ADMIN);
  }

  isPartner(): boolean {
    return this.auth.hasRole(Role.PARTNER);
  }

  isDistributor(): boolean {
    return this.auth.hasRole(Role.DISTRIBUTOR);
  }

  isAuthority(): boolean {
    return this.auth.hasRole(Role.AUTHORITY);
  }

  // ✅ Verifica si el usuario es SOLO autoridad (sin otros roles de gestión)
  isOnlyAuthority(): boolean {
    const roles = this.roles();
    const hasAuthority = roles.includes(Role.AUTHORITY);
    const hasOtherManagementRole = roles.some(r => 
      r === Role.ADMIN || 
      r === Role.PARTNER || 
      r === Role.DISTRIBUTOR
    );
    return hasAuthority && !hasOtherManagementRole;
  }

  // ✅ Obtiene los items de gestión según el rol
  getGestionItems(): MenuItem[] {
    if (this.isOnlyAuthority()) {
      return this.authorityGestionItems;
    }
    return this.gestionItems;
  }

  isOnlyClient(): boolean {
    const roles = this.roles();
    const hasClientOrUser = roles.includes(Role.CLIENT) || roles.includes(Role.USER);
    const hasOther = roles.some(r => 
      r === Role.ADMIN || 
      r === Role.PARTNER || 
      r === Role.DISTRIBUTOR || 
      r === Role.AUTHORITY
    );
    return hasClientOrUser && !hasOther;
  }

  /**
   * ✅ Usa el computed canSeeStore para determinar acceso a la tienda
   * Permite acceso a: ADMIN, CLIENT y USER
   */
  canAccessStore(): boolean {
    return this.canSeeStore();
  }

  /**
   * Verifica si el usuario puede comprar (email verificado + perfil completo)
   */
  canPurchase(): boolean {
    return this.auth.canPurchase();
  }

  displayName(): string {
    const user = this.user();
    return user?.username || 'Usuario';
  }

  getProfileCompleteness(): number {
    return this.profileCompleteness();
  }

  isProfileComplete(): boolean {
    return this.profileCompleteness() === 100;
  }

  isEmailVerified(): boolean {
    return this.user()?.emailVerified ?? false;
  }

  inboxCount(): number {
    return this.unreadNotifications();
  }

  /**
   * Carga el contador de notificaciones no leídas
   */
  private async loadUnreadCount(): Promise<void> {
    if (!this.isAuthenticated()) {
      this.unreadNotifications.set(0);
      return;
    }

    try {
      const previousCount = this.unreadNotifications();
      const count = await this.notificationService.getUnreadCount();

      // Detectar si hay una nueva notificación
      if (count > previousCount && previousCount > 0) {
        await this.showNewNotificationToast();
      }

      this.unreadNotifications.set(count);
    } catch (error) {
      this.logger.error('[Navbar] Error loading unread notifications count:', error);
      // No establecer a 0 en caso de error para mantener el último valor conocido
    }
  }

  /**
   * Muestra un toast con la última notificación recibida
   */
  private async showNewNotificationToast(): Promise<void> {
    try {
      const notifications = await this.notificationService.getMyNotifications();

      // Obtener la notificación más reciente no leída
      const latestNotification = notifications
        .filter(n => n.status === 'UNREAD')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (latestNotification) {
        // Ligaduras de Material Symbols: la plantilla las pinta dentro de un
        // <span class="material-symbols-outlined">, igual que el resto de la app.
        const typeIcons: Record<string, string> = {
          'USER_VERIFICATION_APPROVED': 'check_circle',
          'USER_VERIFICATION_REJECTED': 'cancel',
          'ROLE_REQUEST_APPROVED': 'celebration',
          'ROLE_REQUEST_REJECTED': 'warning',
          'SYSTEM': 'info',
        };

        this.newNotificationToast.set({
          title: latestNotification.title,
          message: latestNotification.message,
          type: typeIcons[latestNotification.type] || 'info',
          show: true
        });

        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
          this.newNotificationToast.set(null);
        }, 5000);
      }
    } catch (error) {
      this.logger.error('[Navbar] Error showing notification toast:', error);
    }
  }

  /**
   * Cierra el toast de notificación manualmente
   */
  closeNotificationToast(): void {
    this.newNotificationToast.set(null);
  }

  /**
   * Inicia el polling periódico para actualizar el contador de notificaciones
   */
  private startNotificationPolling(): void {
    // Cargar inmediatamente si está autenticado
    if (this.isAuthenticated()) {
      this.loadUnreadCount();
    }

    // Actualizar cada 30 segundos, pero sólo con la pestaña visible: antes
    // seguía consultando en todas las pestañas olvidadas de fondo, y cada vez
    // que detectaba una notificación nueva hacía una segunda petición para
    // traer la lista completa.
    this.pollingInterval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (this.isAuthenticated()) {
        this.loadUnreadCount();
      } else {
        this.unreadNotifications.set(0);
      }
    }, 30000);

    // Al volver a la pestaña, refrescar en el acto en vez de esperar al
    // siguiente ciclo: si estuvo oculta un rato, el contador está viejo.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.isAuthenticated()) {
      this.loadUnreadCount();
    }
  };

  trackByPath(_i: number, it: MenuItem) { return it.path; }

  isGestionActive(): boolean {
    const url = this.routerSvc.url || '';
    return url.startsWith('/producto')
      || url.startsWith('/cliente')
      || url.startsWith('/socio')
      || url.startsWith('/venta')
      || url.startsWith('/zona')
      || url.startsWith('/autoridad')
      || url.startsWith('/sobornos')
      || url.startsWith('/decision')
      || url.startsWith('/tematica')
      || url.startsWith('/distribuidor')
      || url.startsWith('/consejo-shelby')
      || url.startsWith('/revisiones-mensuales')
      || url.startsWith('/acuerdos-clandestinos')
      || url.startsWith('/admin');
  }

  isInboxActive(): boolean {
    const url = this.routerSvc.url || '';
    return url.startsWith('/inbox');
  }

  isInStore(): boolean {
    const url = this.routerSvc.url || '';
    return url === '/tienda' || url.startsWith('/tienda?') || url.startsWith('/tienda/') ||
           url === '/mis-compras' || url.startsWith('/mis-compras?') || url.startsWith('/mis-compras/');
  }

  

  private updateIndicator() {
    // ✅ Deshabilitar el indicador cuando estás en el store (tienda/mis-compras)
    if (this.isInStore()) {
      this.indicator.visible = false;
      return;
    }

    const menuEl = this.menuRef?.nativeElement;
    const activeEl = menuEl?.querySelector(
      '.menu__item a.active, .menu__item--dropdown > .has-underline.active'
    ) as HTMLElement | null;

    if (!menuEl || !activeEl) {
      this.indicator.visible = false;
      return;
    }

    const menuRect = menuEl.getBoundingClientRect();
    const btnRect = activeEl.getBoundingClientRect();
    const x = btnRect.left - menuRect.left;
    const y = btnRect.top - menuRect.top;
    const w = btnRect.width;
    const h = btnRect.height;

    this.indicator = { x, y, w, h, visible: true };
  }

  /**
   * Logout con animación full-screen (velo global)
   */
  logout(): void {
    // Disparar velo en modo "logout"
    this.transition.start('logout');
    // Mensaje se controla desde app.html; mantenemos fase "loading" hasta finalizar

    // Pequeño delay para permitir que el velo aparezca antes de la petición
    setTimeout(() => {
      this.auth.logout().subscribe({
        next: () => {
          // Dar feedback visual breve antes de cerrar el velo
          setTimeout(() => this.transition.finish(), 800);
        },
        error: () => {
          // Aunque falle la llamada, cerramos sesión local y removemos el velo
          setTimeout(() => this.transition.finish(), 800);
        }
      });
    }, 120);
  }

  /**
   * 📱 Toggle del menú móvil
   */
  toggleMobileMenu(): void {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }

  /**
   * 📱 Cierra el menú móvil
   */
  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  /**
   * 📱 Abre el menú móvil
   */
  openMobileMenu(): void {
    this.mobileMenuOpen.set(true);
  }

  /**
   * Bloquea el scroll del documento mientras el drawer móvil está abierto.
   * Sin esto la página de fondo sigue desplazándose bajo el menú y al cerrarlo
   * el usuario aparece en otra parte del listado.
   */
  private readonly lockScrollOnMobileMenu = effect(() => {
    const open = this.mobileMenuOpen();
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('has-drawer-open', open);
  });

  /**
   * Limpia el polling al destruir el componente
   */
  ngOnDestroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    if (this.resizeRaf) {
      cancelAnimationFrame(this.resizeRaf);
    }
    if (typeof document !== 'undefined') {
      document.body.classList.remove('has-drawer-open');
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }
}
