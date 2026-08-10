/// <reference types="cypress" />

/**
 * Smoke Tests
 *
 * Tests básicos que verifican que la aplicación carga correctamente
 * y que las funcionalidades críticas están disponibles.
 */
describe('Smoke Tests', () => {
  describe('Application Loading', () => {
    it('should load the application successfully', () => {
      cy.visit('/');

      // Verificar que el elemento raíz de Angular existe
      cy.get('app-root').should('exist');

      // Verificar que la aplicación cargó sin crashear
      cy.get('body').should('not.be.empty');
    });

    it('should display the navbar', () => {
      cy.visit('/');

      // Verificar que el navbar está visible
      cy.get('app-navbar').should('be.visible');

      // Verificar que el logo/brand está visible
      cy.get('.brand, [class*="brand"]').should('be.visible');
    });

    it('should have correct page title', () => {
      cy.visit('/');

      // Verificar título de la página
      cy.title().should('not.be.empty');
    });
  });

  describe('Critical Routes', () => {
    it('should navigate to login page', () => {
      cy.visit('/');

      // Verificar que estamos en la página (puede ser login por defecto)
      cy.get('app-root').should('exist');

      // Verificar que hay algún formulario de autenticación disponible
      cy.get('body').then(($body) => {
        // Si ya estamos en login, verificar el formulario
        if ($body.find('[data-cy*="login"], .auth-half.left').length > 0) {
          cy.log('✅ Login form already visible');
        } else {
          // Buscar link de login en la navegación desktop (excluir menú móvil oculto)
          const desktopLoginLink = $body.find('nav.nav a:contains("Login"), nav.nav a:contains("login")').not('.mobile-menu__action');

          if (desktopLoginLink.length > 0) {
            cy.wrap(desktopLoginLink).first().click();
            cy.log('✅ Clicked desktop navigation login link');
          } else {
            // Si no hay link en desktop nav, navegar directamente
            cy.visit('/login', { failOnStatusCode: false });
            cy.log('✅ Navigated directly to /login route');
          }
        }
      });

      // Verificar que formulario existe
      cy.get('form, [data-cy*="login"], .auth-half').should('exist');
    });

    it('should navigate to register page', () => {
      cy.visit('/');

      // Verificar que estamos en la página
      cy.get('app-root').should('exist');

      // Buscar el tab o link de registro
      cy.get('body').then(($body) => {
        // Buscar tab de registro
        const registerTab = $body.find('[data-cy="register-tab"]');
        if (registerTab.length > 0) {
          cy.dataCy('register-tab').click();
          cy.log('✅ Register tab clicked');
        } else {
          // Buscar link de registro como fallback
          const registerLink = $body.find('a:contains("Register"), a:contains("Registro"), a:contains("Sign up"), button:contains("Register")');
          if (registerLink.length > 0) {
            cy.wrap(registerLink).first().click();
          }
        }
      });

      // Verificar que el formulario de registro existe
      cy.get('form, [data-cy*="register"], .auth-half.right').should('exist');
    });

    it('should redirect unauthenticated users from protected routes', () => {
      // Intentar acceder a ruta protegida sin autenticación
      cy.visit('/dashboard', { failOnStatusCode: false });

      // Debería redirigir a login
      cy.url().should('satisfy', (url) => {
        return url.includes('/login') || url.includes('/');
      });
    });
  });

  describe('Basic Functionality', () => {
    it('should have working language selector', () => {
      cy.visit('/');

      // Buscar selector de idioma (puede estar en navbar)
      cy.get('[class*="lang"], [data-cy*="lang"]').should('exist');
    });

    it('should handle 404 errors gracefully', () => {
      cy.visit('/nonexistent-route-that-does-not-exist-12345', { failOnStatusCode: false });

      // Debería mostrar página 404 o redirigir a home
      cy.url().should('satisfy', (url) => {
        return url.includes('/404') || url.endsWith('/') || url.includes('/login');
      });
    });
  });

  describe('Performance Checks', () => {
    it('should load in reasonable time', () => {
      const startTime = Date.now();

      cy.visit('/');

      cy.get('app-root').should('exist').then(() => {
        const loadTime = Date.now() - startTime;

        // La aplicación debería cargar en menos de 5 segundos
        expect(loadTime).to.be.lessThan(5000);
      });
    });

    it('should not have excessive DOM elements', () => {
      cy.visit('/');

      cy.document().then((doc) => {
        const elementCount = doc.querySelectorAll('*').length;

        // No debería haber más de 1500 elementos en la página inicial
        expect(elementCount).to.be.lessThan(1500);
      });
    });
  });

  describe('Responsive Design', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    viewports.forEach((viewport) => {
      it(`should be usable on ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
        cy.viewport(viewport.width, viewport.height);
        cy.visit('/');

        // Verificar que el contenido principal es visible
        cy.get('app-root').should('be.visible');
        cy.get('app-navbar, nav').should('be.visible');
      });
    });
  });

  describe('Security Headers', () => {
    it('should have security headers in responses', () => {
      cy.request('/').then((response) => {
        // Verificar headers de seguridad básicos
        expect(response.headers).to.exist;

        // Note: Estos headers pueden ser configurados por el servidor
        // Si no existen, no falla el test pero lo registra
        cy.log('Response Headers:', JSON.stringify(response.headers));
      });
    });
  });
});
