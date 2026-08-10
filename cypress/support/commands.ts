/// <reference types="cypress" />
/// <reference types="cypress-axe" />
/// <reference types="cypress-real-events" />
/// <reference types="cypress-plugin-tab" />

// ***********************************************
// This file contains custom Cypress commands
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login a user
       * @example cy.login('admin@tgs.com', 'Admin123!')
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Custom command to logout a user
       * @example cy.logout()
       */
      logout(): Chainable<void>;

      /**
       * Custom command to register a new user
       * @example cy.register('test@example.com', 'Test123!', 'Test User')
       */
      register(email: string, password: string, name: string): Chainable<void>;

      /**
       * Custom command to check if user is authenticated
       * @example cy.isAuthenticated()
       */
      isAuthenticated(): Chainable<boolean>;

      /**
       * Custom command to get local storage item
       * @example cy.getLocalStorage('authToken')
       */
      getLocalStorage(key: string): Chainable<string | null>;

      /**
       * Custom command to set local storage item
       * @example cy.setLocalStorage('authToken', 'token123')
       */
      setLocalStorage(key: string, value: string): Chainable<void>;

      /**
       * Custom command to wait for Angular to be ready
       * @example cy.waitForAngular()
       */
      waitForAngular(): Chainable<void>;

      /**
       * Custom command to navigate to a route
       * @example cy.navigateTo('/tienda')
       */
      navigateTo(route: string): Chainable<void>;

      /**
       * Custom command to get by data-cy attribute
       * @example cy.dataCy('login-button')
       */
      dataCy(value: string): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to get by data-cy attribute within login form
       * @example cy.dataCyLogin('email-input')
       */
      dataCyLogin(value: string): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to get by data-cy attribute within register form
       * @example cy.dataCyRegister('email-input')
       */
      dataCyRegister(value: string): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to check accessibility with detailed logging
       * @example cy.checkA11y()
       * @example cy.checkA11y('.main-content')
       */
      checkA11y(context?: string | Node, options?: any): Chainable<void>;

      /**
       * Custom command to check WCAG 2.1 AA compliance
       * @example cy.checkA11yWCAG()
       * @example cy.checkA11yWCAG('.form-section')
       */
      checkA11yWCAG(context?: string | Node): Chainable<void>;

      /**
       * Custom command to visit a URL and wait for Angular app to fully load
       * @example cy.visitAndWaitForApp('/')
       * @example cy.visitAndWaitForApp('/tienda')
       */
      visitAndWaitForApp(url: string): Chainable<void>;
    }
  }
}

/**
 * Login command
 * Logs in a user with email and password
 */
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/');

    // Wait for the page to load
    cy.waitForAngular();

    // Ensure we're on login tab (not register)
    cy.dataCy('login-tab').click();

    // Fill login form using context-specific selectors
    cy.dataCyLogin('email-input').should('be.visible').clear().type(email);
    cy.dataCyLogin('password-input').should('be.visible').clear().type(password);
    cy.dataCy('login-button').should('be.visible').click();

    // Wait for login to complete
    cy.url().should('not.include', '/login');

    // Verify token exists in localStorage
    cy.window().its('localStorage.auth_token').should('exist');
  });
});

/**
 * Logout command
 * Logs out the current user
 */
Cypress.Commands.add('logout', () => {
  cy.dataCy('user-menu').click();
  cy.dataCy('logout-button').click();
  cy.url().should('eq', Cypress.config().baseUrl + '/');
});

/**
 * Register command
 * Registers a new user
 */
Cypress.Commands.add('register', (email: string, password: string, name: string) => {
  cy.visit('/');
  cy.waitForAngular();

  // Click on register tab to ensure we're on register form
  cy.dataCy('register-tab').click();

  // Fill register form using context-specific selectors
  cy.dataCyRegister('name-input').should('be.visible').clear().type(name);
  cy.dataCyRegister('email-input').should('be.visible').clear().type(email);
  cy.dataCyRegister('password-input').should('be.visible').clear().type(password);
  // Note: confirm-password-input doesn't exist in the actual form
  cy.dataCy('register-button').should('be.visible').click();
});

/**
 * Check if user is authenticated
 */
Cypress.Commands.add('isAuthenticated', () => {
  return cy.getLocalStorage('authToken').then((token) => {
    return !!token;
  });
});

/**
 * Get local storage item
 */
Cypress.Commands.add('getLocalStorage', (key: string) => {
  return cy.window().then((window) => {
    return window.localStorage.getItem(key);
  });
});

/**
 * Set local storage item
 */
Cypress.Commands.add('setLocalStorage', (key: string, value: string) => {
  cy.window().then((window) => {
    window.localStorage.setItem(key, value);
  });
});

/**
 * Wait for Angular to be ready
 */
Cypress.Commands.add('waitForAngular', () => {
  cy.window().should('have.property', 'ng');
  cy.wait(500); // Small delay to ensure Angular is fully loaded
});

/**
 * Navigate to a route
 */
Cypress.Commands.add('navigateTo', (route: string) => {
  cy.visit(route);
  cy.waitForAngular();
});

/**
 * Get element by data-cy attribute
 */
Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy="${value}"]`);
});

/**
 * Get element by data-cy attribute within login form
 * This prevents finding duplicate elements in the register form
 */
Cypress.Commands.add('dataCyLogin', (value: string) => {
  return cy.get('.auth-half.left').find(`[data-cy="${value}"]`);
});

/**
 * Get element by data-cy attribute within register form
 * This prevents finding duplicate elements in the login form
 */
Cypress.Commands.add('dataCyRegister', (value: string) => {
  return cy.get('.auth-half.right').find(`[data-cy="${value}"]`);
});

/**
 * Check accessibility with detailed logging
 * Note: This overrides cypress-axe's default checkA11y with custom logging
 */
Cypress.Commands.overwrite('checkA11y', (originalFn, context?: string | Node, options?: any, violationCallback?: any, skipFailures?: boolean) => {
  // Custom violation callback with detailed logging
  const customCallback = (violations: any[]) => {
    if (violations.length) {
      cy.task('log', `\n❌ ${violations.length} accessibility violation(s) detected:`);

      violations.forEach((violation, index) => {
        cy.task('log', `\n${index + 1}. ${violation.id}: ${violation.description}`);
        cy.task('log', `   Impact: ${violation.impact}`);
        cy.task('log', `   Help: ${violation.help}`);
        cy.task('log', `   Help URL: ${violation.helpUrl}`);
        cy.task('log', `   Elements affected: ${violation.nodes.length}`);

        violation.nodes.forEach((node: any, nodeIndex: number) => {
          cy.task('log', `\n   Element ${nodeIndex + 1}:`);
          cy.task('log', `   - HTML: ${node.html}`);
          cy.task('log', `   - Target: ${node.target.join(' > ')}`);
          cy.task('log', `   - Failure: ${node.failureSummary}`);
        });
      });
    } else {
      cy.task('log', '✅ No accessibility violations detected');
    }

    // Call the provided callback if any
    if (violationCallback) {
      violationCallback(violations);
    }
  };

  // Call the original checkA11y with our custom callback
  return originalFn(context, options, customCallback, skipFailures);
});

/**
 * Check WCAG 2.1 AA compliance
 * Specialized command that only checks WCAG 2.1 Level A and AA rules
 */
Cypress.Commands.add('checkA11yWCAG', (context?: string | Node) => {
  cy.checkA11y(context, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
    }
  });
});

/**
 * Visit and wait for Angular app to fully load
 * Ensures Angular has fully bootstrapped before continuing with tests
 */
Cypress.Commands.add('visitAndWaitForApp', (url: string) => {
  // Visit the URL with increased timeout
  cy.visit(url, { timeout: 30000 });

  // Wait for Angular to be available on the window object
  cy.window().should('have.property', 'ng');

  // Wait for body to be visible
  cy.get('body', { timeout: 30000 }).should('be.visible');

  // Wait for app-root to be rendered
  cy.get('app-root', { timeout: 30000 }).should('exist').should('be.visible');

  // Small additional wait for stability
  cy.wait(1000);
});

// Export empty object to satisfy TypeScript module system
export {};
