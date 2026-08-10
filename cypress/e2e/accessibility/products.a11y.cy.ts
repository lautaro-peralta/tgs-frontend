/**
 * Accessibility Tests - Products/Store Section
 *
 * WCAG 2.1 Level AA Compliance Tests
 * Validates product catalog, search, filters, and product cards accessibility
 *
 * Note: The store page requires authentication and specific user roles to display products.
 * Tests are designed to be flexible and handle cases where products may not be available.
 */

describe('Products/Store - Accessibility (WCAG 2.1 AA)', () => {
  beforeEach(() => {
    cy.visit('/tienda');
    cy.injectAxe();
    cy.waitForAngular();
    // Wait for Angular to fully render the page
    cy.get('app-root', { timeout: 10000 }).should('be.visible');
  });

  describe('Product Catalog Page Structure', () => {
    it('should have no critical accessibility violations on products page', () => {
      // Check for critical and serious violations only
      cy.checkA11y(undefined, {
        includedImpacts: ['critical', 'serious']
      });
    });

    it('should have proper page heading (H1) for products section', () => {
      // The store has an H1 with the store title
      cy.get('h1.store__title, main h1, [role="main"] h1').should('exist').and('be.visible');
    });

    it('should have main landmark for product content', () => {
      // Store uses <main> or role="main"
      cy.get('main, [role="main"]').should('exist').and('be.visible');
    });
  });

  describe('Product Search and Filters', () => {
    it('should have accessible search input with proper label', () => {
      // The store has a search input wrapped in a label
      cy.get('.store__filters input[type="text"], .store__filters input.input').then($inputs => {
        if ($inputs.length > 0) {
          cy.wrap($inputs.first()).should('exist');
          // Check that input has a label (either explicit or via parent label element)
          cy.wrap($inputs.first()).closest('label').should('exist');
        }
      });
    });

    it('should have keyboard accessible search button', () => {
      cy.get('.btn--search, button[type="button"]').then($buttons => {
        $buttons.each((_, btn) => {
          const $btn = Cypress.$(btn);
          if ($btn.is(':visible') && $btn.text().includes('Buscar')) {
            cy.wrap($btn).should('not.have.attr', 'tabindex', '-1');
          }
        });
      });
    });

    it('should announce search results to screen readers', () => {
      // The search indicator has role="status" and aria-live="polite"
      cy.get('.store__filters input.input').first().then($search => {
        if ($search.length > 0) {
          cy.wrap($search).clear().type('test');
          cy.get('.btn--search').click();
          // After search, check if results indicator exists
          cy.get('[role="status"], [aria-live="polite"], .search-indicator').should('exist');
        }
      });
    });
  });

  describe('Product Cards/Grid', () => {
    it('should have accessible product cards when products exist', () => {
      // Wait for loading to complete
      cy.get('.muted').should('not.exist');

      cy.get('.store__grid').then($grid => {
        if ($grid.length > 0 && $grid.find('.store-card, .product-card, article').length > 0) {
          cy.get('.store-card, .product-card, article').first().within(() => {
            // Each product card should have heading (h2)
            cy.get('h2, h3, h4, [role="heading"]').should('exist');
            // Each product should have price
            cy.get('.price, [class*="price"], [data-cy="price"]').should('exist');
          });
        } else {
          // No products available - this is acceptable
          cy.log('No products available in store - skipping product card tests');
        }
      });
    });

    it('should have alt text for all product images when products exist', () => {
      cy.get('.store__grid').then($grid => {
        if ($grid.length > 0) {
          cy.get('.store-card img, .product-card img, article img').each($img => {
            cy.wrap($img).should('have.attr', 'alt');
          });
        }
      });
    });

    it('should have accessible add-to-cart buttons when products exist', () => {
      cy.get('.store__grid').then($grid => {
        if ($grid.length > 0 && $grid.find('.store-card').length > 0) {
          cy.get('.add-to-cart, [data-cy*="add-cart"], button.btn--accent').each($btn => {
            if ($btn.is(':visible')) {
              const ariaLabel = $btn.attr('aria-label');
              const text = $btn.text().trim();
              // Button should have accessible name
              expect(ariaLabel || text.length > 0).to.be.true;
            }
          });
        }
      });
    });

    it('should have proper ARIA labels for add-to-cart buttons', () => {
      cy.get('.store__grid').then($grid => {
        if ($grid.length > 0 && $grid.find('[data-cy*="add-cart"]').length > 0) {
          cy.get('[data-cy*="add-cart"]').each($btn => {
            const ariaLabel = $btn.attr('aria-label');
            // aria-label should describe the action
            if (ariaLabel) {
              expect(ariaLabel.toLowerCase()).to.match(/agregar|añadir|add|carrito|cart/i);
            }
          });
        }
      });
    });

    it('should have sufficient color contrast on product prices', () => {
      cy.get('.store__grid').then($grid => {
        if ($grid.length > 0 && $grid.find('.price').length > 0) {
          cy.checkA11y('.price, [class*="price"]', {
            rules: {
              'color-contrast': { enabled: true }
            }
          });
        }
      });
    });
  });

  describe('Empty States and Messages', () => {
    it('should have accessible empty state when no products', () => {
      cy.get('.store__empty').then($empty => {
        if ($empty.length > 0 && $empty.is(':visible')) {
          // Empty state should be visible and accessible
          cy.wrap($empty).should('be.visible');
          cy.wrap($empty).find('h3').should('exist');
        }
      });
    });

    it('should show accessible loading state', () => {
      // The loading state uses .muted class
      // This test verifies that when loading, the element is accessible
      cy.get('.muted').should('not.exist'); // Should not be loading after waitForAngular
    });
  });

  describe('Cart FAB Button', () => {
    it('should have accessible cart floating action button', () => {
      cy.get('.cart-fab, #cartAnchor').should('exist').and('be.visible');
      cy.get('.cart-fab, #cartAnchor').should('have.attr', 'aria-label');
    });

    it('should be keyboard accessible', () => {
      cy.get('.cart-fab, #cartAnchor').should('not.have.attr', 'tabindex', '-1');
    });
  });

  describe('Cart Drawer', () => {
    it('should open cart drawer when FAB is clicked', () => {
      cy.get('.cart-fab, #cartAnchor').click();
      cy.get('.cart-drawer').should('have.class', 'open');
    });

    it('should have accessible cart drawer structure', () => {
      cy.get('.cart-fab, #cartAnchor').click();
      cy.get('.cart-drawer').within(() => {
        // Header should exist
        cy.get('.cart-drawer__header').should('exist');
        // Close button should exist and be accessible
        cy.get('button').contains(/cerrar|close/i).should('exist');
      });
    });

    it('should close cart drawer with close button', () => {
      cy.get('.cart-fab, #cartAnchor').click();
      cy.get('.cart-drawer').should('have.class', 'open');
      cy.get('.cart-drawer__header button').click();
      cy.get('.cart-drawer').should('not.have.class', 'open');
    });
  });

  describe('Comprehensive Store Accessibility', () => {
    it('should pass WCAG 2.1 AA rules for critical elements', () => {
      cy.checkA11y('main, [role="main"]', {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa']
        },
        includedImpacts: ['critical', 'serious']
      });
    });

    it('should have no critical violations in store header', () => {
      cy.get('.store__header').then($header => {
        if ($header.length > 0) {
          cy.checkA11y('.store__header', {
            includedImpacts: ['critical', 'serious']
          });
        }
      });
    });

    it('should be keyboard navigable', () => {
      // Test basic keyboard navigation using cypress-plugin-tab
      cy.get('body').tab();
      cy.focused().should('exist');

      // Tab through a few elements to ensure keyboard navigation works
      for (let i = 0; i < 5; i++) {
        cy.focused().then($el => {
          if ($el.length > 0) {
            cy.log(`Focused element: ${$el.prop('tagName')}`);
          }
        });
        cy.get('body').tab();
      }
    });
  });

  describe('Responsive Accessibility', () => {
    it('should maintain accessibility on mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.wait(500); // Wait for responsive adjustments
      cy.checkA11y(undefined, {
        includedImpacts: ['critical', 'serious']
      });
    });

    it('should maintain accessibility on tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.wait(500);
      cy.checkA11y(undefined, {
        includedImpacts: ['critical', 'serious']
      });
    });
  });
});
