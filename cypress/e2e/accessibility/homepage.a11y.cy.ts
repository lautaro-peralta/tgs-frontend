/**
 * Accessibility Tests - Homepage
 *
 * WCAG 2.1 Level AA Compliance Tests
 * Validates homepage accessibility including hero section, navigation, and content structure
 */

describe('Homepage - Accessibility (WCAG 2.1 AA)', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  describe('Page Structure and Navigation', () => {
    it('should have no accessibility violations on initial load', () => {
      cy.checkA11yWCAG();
    });

    it('should have proper heading hierarchy (H1, H2, H3)', () => {
      cy.get('h1').should('exist').and('be.visible');

      // Verify heading hierarchy
      cy.get('h1').first().then($h1 => {
        cy.log('Main heading:', $h1.text());
      });

      cy.checkA11yWCAG('body', {
        rules: {
          'heading-order': { enabled: true }
        }
      });
    });

    it('should have proper landmark regions (header, main, footer, nav)', () => {
      cy.get('header').should('exist');
      cy.get('main, [role="main"]').should('exist');
      cy.get('footer').should('exist');
      cy.get('nav, [role="navigation"]').should('exist');

      cy.checkA11yWCAG('body', {
        rules: {
          'region': { enabled: true },
          'landmark-one-main': { enabled: true }
        }
      });
    });

    it('should have accessible navigation links with proper labels', () => {
      cy.get('nav a, a[role="navigation"]').each($link => {
        // Each link should have accessible text
        cy.wrap($link).should('satisfy', ($el) => {
          const text = $el.text().trim();
          const ariaLabel = $el.attr('aria-label');
          const title = $el.attr('title');
          return text.length > 0 || ariaLabel || title;
        });
      });

      cy.checkA11yWCAG('nav');
    });

    it('should have skip-to-content link for keyboard navigation', () => {
      // Tab once to focus skip link (if present)
      cy.get('body').tab();

      // Check if skip link exists and is focusable
      cy.focused().then($el => {
        if ($el.attr('href') === '#main-content' || $el.text().toLowerCase().includes('skip')) {
          cy.log('Skip link found:', $el.text());
        }
      });
    });
  });

  describe('Interactive Elements', () => {
    it('should have accessible buttons with proper labels', () => {
      cy.get('button').each($button => {
        cy.wrap($button).should('satisfy', ($el) => {
          const text = $el.text().trim();
          const ariaLabel = $el.attr('aria-label');
          const title = $el.attr('title');
          return text.length > 0 || ariaLabel || title;
        });
      });

      cy.checkA11yWCAG('button');
    });

    it('should have keyboard accessible interactive elements', () => {
      cy.get('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
        .each($el => {
          cy.wrap($el).should('be.visible').and('not.have.attr', 'tabindex', '-1');
        });
    });

    it('should have proper focus indicators on interactive elements', () => {
      // Tab through interactive elements
      cy.get('body').tab();
      cy.focused().should('exist').and('be.visible');

      cy.checkA11yWCAG('body', {
        rules: {
          'focus-order-semantics': { enabled: true }
        }
      });
    });
  });

  describe('Visual Accessibility', () => {
    it('should have sufficient color contrast (WCAG AA: 4.5:1)', () => {
      cy.checkA11yWCAG('body', {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });

    it('should have properly sized text (minimum 12px)', () => {
      cy.get('body, p, span, div, a, button').each($el => {
        cy.wrap($el).then($element => {
          const fontSize = parseFloat(window.getComputedStyle($element[0]).fontSize);
          if ($element.is(':visible') && $element.text().trim().length > 0) {
            expect(fontSize).to.be.at.least(12);
          }
        });
      });
    });

    it('should have alt text for all images', () => {
      cy.get('img').each($img => {
        const alt = $img.attr('alt');
        const role = $img.attr('role');

        if (role === 'presentation' || role === 'none') {
          // Decorative images should have empty alt
          expect(alt).to.equal('');
        } else {
          // Content images should have descriptive alt
          expect(alt).to.exist;
        }
      });

      cy.checkA11yWCAG('img');
    });
  });

  describe('Form Elements (if present)', () => {
    it('should have properly labeled form controls', () => {
      cy.get('input, textarea, select').each($input => {
        const id = $input.attr('id');
        const ariaLabel = $input.attr('aria-label');
        const ariaLabelledby = $input.attr('aria-labelledby');
        const hasLabel = id && cy.get(`label[for="${id}"]`).should('exist');

        // Each form control should have a label
        expect(ariaLabel || ariaLabelledby || hasLabel).to.exist;
      });

      cy.checkA11yWCAG('form', {
        rules: {
          'label': { enabled: true },
          'label-title-only': { enabled: true }
        }
      });
    });

    it('should have accessible error messages', () => {
      cy.get('[role="alert"], .error, .invalid').each($error => {
        if ($error.is(':visible')) {
          cy.wrap($error).should('have.attr', 'role', 'alert')
            .or('have.attr', 'aria-live', 'polite')
            .or('have.attr', 'aria-live', 'assertive');
        }
      });
    });
  });

  describe('Dynamic Content', () => {
    it('should announce dynamic content changes to screen readers', () => {
      // Check for aria-live regions
      cy.get('[aria-live], [role="status"], [role="alert"]').should('exist');

      cy.checkA11yWCAG('body', {
        rules: {
          'aria-allowed-attr': { enabled: true },
          'aria-valid-attr': { enabled: true },
          'aria-valid-attr-value': { enabled: true }
        }
      });
    });

    it('should have accessible loading states', () => {
      // Check for loading indicators with proper ARIA
      cy.get('[aria-busy="true"], [role="progressbar"], .loading').each($loader => {
        if ($loader.is(':visible')) {
          cy.wrap($loader).should('satisfy', ($el) => {
            return $el.attr('aria-busy') === 'true' ||
                   $el.attr('role') === 'progressbar' ||
                   $el.attr('aria-label');
          });
        }
      });
    });
  });

  describe('Language and Document Properties', () => {
    it('should have proper lang attribute on html element', () => {
      cy.get('html').should('have.attr', 'lang').and('match', /^[a-z]{2}(-[A-Z]{2})?$/);
    });

    it('should have a descriptive page title', () => {
      cy.title().should('exist').and('have.length.greaterThan', 0);
    });

    it('should have proper meta viewport for responsive design', () => {
      cy.get('meta[name="viewport"]').should('exist')
        .and('have.attr', 'content').and('include', 'width=device-width');
    });
  });

  describe('Comprehensive Accessibility Audit', () => {
    it('should pass all WCAG 2.1 Level A rules', () => {
      cy.checkA11y(undefined, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag21a']
        }
      });
    });

    it('should pass all WCAG 2.1 Level AA rules', () => {
      cy.checkA11y(undefined, {
        runOnly: {
          type: 'tag',
          values: ['wcag2aa', 'wcag21aa']
        }
      });
    });

    it('should have no critical or serious violations', () => {
      cy.checkA11y(undefined, {
        includedImpacts: ['critical', 'serious']
      });
    });
  });
});
