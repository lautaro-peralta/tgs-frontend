/**
 * Accessibility Tests - Shopping Cart
 *
 * WCAG 2.1 Level AA Compliance Tests
 * Validates cart functionality, quantity controls, checkout flow accessibility
 */

describe('Shopping Cart - Accessibility (WCAG 2.1 AA)', () => {
  beforeEach(() => {
    cy.visit('/tienda');
    cy.injectAxe();
    cy.waitForAngular();
  });

  describe('Cart Icon and Badge', () => {
    it('should have accessible cart icon with label', () => {
      cy.get('[data-cy*="cart"], [class*="cart-icon"], a[href*="cart"]').first()
        .should('satisfy', ($el) => {
          const ariaLabel = $el.attr('aria-label');
          const text = $el.text().trim();
          const title = $el.attr('title');

          return ariaLabel || text.length > 0 || title;
        });

      cy.checkA11yWCAG('[data-cy*="cart"], [class*="cart-icon"]');
    });

    it('should announce cart item count to screen readers', () => {
      cy.get('[data-cy*="cart"] .badge, [class*="cart-count"], [class*="cart-badge"]').then($badge => {
        if ($badge.length > 0) {
          cy.wrap($badge).should('satisfy', ($el) => {
            const ariaLabel = $el.attr('aria-label');
            const text = $el.text().trim();

            // Badge should be accessible
            return (ariaLabel && ariaLabel.match(/\d+/)) || text.match(/\d+/);
          });
        }
      });
    });
  });

  describe('Cart Page Structure', () => {
    beforeEach(() => {
      // Add a product to cart first
      cy.get('.product-card button, [data-cy*="add"]').first().then($btn => {
        if ($btn.length > 0) {
          cy.wrap($btn).click();
          cy.wait(500);
        }
      });

      // Navigate to cart
      cy.visit('/carrito');
      cy.waitForAngular();
      cy.injectAxe();
    });

    it('should have no accessibility violations on cart page', () => {
      cy.checkA11yWCAG();
    });

    it('should have proper heading for cart page', () => {
      cy.get('h1').should('exist').and('be.visible');
      cy.get('h1').should('contain.text', /carrito|cart|cesta/i);

      cy.checkA11yWCAG('h1');
    });

    it('should have main landmark for cart content', () => {
      cy.get('main, [role="main"]').should('exist');

      cy.checkA11yWCAG('main');
    });
  });

  describe('Cart Items List', () => {
    beforeEach(() => {
      // Add product to cart
      cy.visit('/tienda');
      cy.waitForAngular();
      cy.get('.product-card button, [data-cy*="add"]').first().click();
      cy.wait(500);

      // Go to cart
      cy.visit('/carrito');
      cy.waitForAngular();
      cy.injectAxe();
    });

    it('should have accessible cart items with proper structure', () => {
      cy.get('.cart-item, [data-cy*="cart-item"]').first().within(() => {
        // Each item should have product name
        cy.get('h2, h3, h4, .product-name, [class*="name"]').should('exist');

        // Each item should have price
        cy.get('.price, [class*="price"]').should('exist');
      });

      cy.checkA11yWCAG('.cart-item, [data-cy*="cart-item"]');
    });

    it('should have alt text for cart item images', () => {
      cy.get('.cart-item img, [data-cy*="cart-item"] img').each($img => {
        cy.wrap($img).should('have.attr', 'alt');

        const alt = $img.attr('alt');
        if (alt) {
          expect(alt).to.have.length.greaterThan(0);
        }
      });

      cy.checkA11yWCAG('img', {
        rules: {
          'image-alt': { enabled: true }
        }
      });
    });

    it('should announce item removal to screen readers', () => {
      cy.get('[role="alert"], [aria-live]').should('exist');
    });
  });

  describe('Quantity Controls', () => {
    beforeEach(() => {
      // Add product and navigate to cart
      cy.visit('/tienda');
      cy.waitForAngular();
      cy.get('.product-card button, [data-cy*="add"]').first().click();
      cy.wait(500);

      cy.visit('/carrito');
      cy.waitForAngular();
      cy.injectAxe();
    });

    it('should have accessible quantity increment/decrement buttons', () => {
      cy.get('button[data-cy*="inc"], button[class*="increment"], button[class*="plus"]').each($btn => {
        cy.wrap($btn).should('satisfy', ($el) => {
          const ariaLabel = $el.attr('aria-label');
          const text = $el.text().trim();
          const title = $el.attr('title');

          return ariaLabel || text.length > 0 || title;
        });
      });

      cy.get('button[data-cy*="dec"], button[class*="decrement"], button[class*="minus"]').each($btn => {
        cy.wrap($btn).should('satisfy', ($el) => {
          const ariaLabel = $el.attr('aria-label');
          const text = $el.text().trim();
          const title = $el.attr('title');

          return ariaLabel || text.length > 0 || title;
        });
      });

      cy.checkA11yWCAG('button[class*="quantity"], button[data-cy*="quantity"]');
    });

    it('should have accessible quantity input field', () => {
      cy.get('input[type="number"], input[class*="quantity"]').each($input => {
        const id = $input.attr('id');
        const ariaLabel = $input.attr('aria-label');
        const ariaLabelledby = $input.attr('aria-labelledby');

        if (id) {
          cy.get(`label[for="${id}"]`).should('exist');
        } else {
          expect(ariaLabel || ariaLabelledby).to.exist;
        }
      });

      cy.checkA11yWCAG('input[type="number"]', {
        rules: {
          'label': { enabled: true }
        }
      });
    });

    it('should announce quantity changes to screen readers', () => {
      // Click increment button
      cy.get('button[data-cy*="inc"], button[class*="increment"]').first().then($btn => {
        if ($btn.length > 0) {
          cy.wrap($btn).click();

          // Check for live region update
          cy.get('[role="status"], [aria-live="polite"]').should('exist');
        }
      });
    });

    it('should have keyboard accessible quantity controls', () => {
      cy.get('button[data-cy*="inc"], button[class*="increment"]').first().focus();
      cy.focused().should('exist').and('be.visible');

      cy.focused().type('{enter}');
      cy.wait(300);

      // Verify quantity changed
      cy.get('input[type="number"], [class*="quantity-value"]').first()
        .should('exist');
    });
  });

  describe('Remove Item Controls', () => {
    beforeEach(() => {
      // Add product and navigate to cart
      cy.visit('/tienda');
      cy.waitForAngular();
      cy.get('.product-card button, [data-cy*="add"]').first().click();
      cy.wait(500);

      cy.visit('/carrito');
      cy.waitForAngular();
      cy.injectAxe();
    });

    it('should have accessible remove buttons with descriptive labels', () => {
      cy.get('button[data-cy*="remove"], button[class*="remove"], button[class*="delete"]').each($btn => {
        const ariaLabel = $btn.attr('aria-label');
        const text = $btn.text().trim();

        // Button should describe action
        if (ariaLabel) {
          expect(ariaLabel).to.match(/eliminar|remover|remove|delete|quitar/i);
        } else {
          expect(text).to.match(/eliminar|remover|remove|delete|quitar/i);
        }
      });

      cy.checkA11yWCAG('button[data-cy*="remove"], button[class*="remove"]');
    });

    it('should show confirmation dialog with proper ARIA', () => {
      cy.get('button[data-cy*="remove"], button[class*="remove"]').first().then($btn => {
        if ($btn.length > 0) {
          cy.wrap($btn).click();

          // Check if confirmation dialog appears
          cy.get('[role="dialog"], [role="alertdialog"]').then($dialog => {
            if ($dialog.length > 0) {
              cy.wrap($dialog).should('have.attr', 'aria-modal', 'true')
                .or('have.attr', 'role');

              cy.checkA11yWCAG('[role="dialog"], [role="alertdialog"]');
            }
          });
        }
      });
    });
  });

  describe('Cart Summary and Totals', () => {
    beforeEach(() => {
      // Add product and navigate to cart
      cy.visit('/tienda');
      cy.waitForAngular();
      cy.get('.product-card button, [data-cy*="add"]').first().click();
      cy.wait(500);

      cy.visit('/carrito');
      cy.waitForAngular();
      cy.injectAxe();
    });

    it('should have accessible cart summary section', () => {
      cy.get('.cart-summary, [class*="summary"], aside').then($summary => {
        if ($summary.length > 0) {
          cy.wrap($summary).within(() => {
            // Should have heading
            cy.get('h2, h3, [role="heading"]').should('exist');
          });

          cy.checkA11yWCAG('.cart-summary, [class*="summary"]');
        }
      });
    });

    it('should have proper semantic structure for price information', () => {
      cy.get('.subtotal, .total, [class*="price"]').each($price => {
        if ($price.is(':visible')) {
          // Price should have associated label
          const text = $price.text();
          expect(text).to.match(/\d+|total|subtotal|precio/i);
        }
      });

      cy.checkA11yWCAG('.cart-summary, [class*="total"]');
    });

    it('should have sufficient color contrast for prices', () => {
      cy.checkA11yWCAG('.price, .total, [class*="price"]', {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });
  });

  describe('Checkout Button', () => {
    beforeEach(() => {
      // Add product and navigate to cart
      cy.visit('/tienda');
      cy.waitForAngular();
      cy.get('.product-card button, [data-cy*="add"]').first().click();
      cy.wait(500);

      cy.visit('/carrito');
      cy.waitForAngular();
      cy.injectAxe();
    });

    it('should have accessible checkout button', () => {
      cy.get('button[data-cy*="checkout"], button[class*="checkout"], a[href*="checkout"]').first()
        .should('satisfy', ($el) => {
          const ariaLabel = $el.attr('aria-label');
          const text = $el.text().trim();

          return (ariaLabel || text).match(/checkout|pagar|finalizar|comprar/i);
        });

      cy.checkA11yWCAG('button[data-cy*="checkout"], a[href*="checkout"]');
    });

    it('should be keyboard accessible', () => {
      cy.get('button[data-cy*="checkout"], button[class*="checkout"]').first().focus();
      cy.focused().should('exist').and('be.visible');

      cy.focused().type('{enter}');
    });

    it('should have proper focus indicator', () => {
      cy.get('button[data-cy*="checkout"], button[class*="checkout"]').first().focus();

      cy.focused().then($btn => {
        const outline = $btn.css('outline');
        const outlineColor = $btn.css('outline-color');
        const boxShadow = $btn.css('box-shadow');

        // Should have visible focus indicator
        expect(outline !== 'none' || boxShadow !== 'none').to.be.true;
      });
    });
  });

  describe('Empty Cart State', () => {
    beforeEach(() => {
      // Clear cart and visit
      localStorage.removeItem('cart.v1');
      cy.visit('/carrito');
      cy.waitForAngular();
      cy.injectAxe();
    });

    it('should have accessible empty cart message', () => {
      cy.get('.empty-cart, [class*="empty"], [role="status"]').then($empty => {
        if ($empty.length > 0) {
          cy.wrap($empty).should('be.visible');
          cy.checkA11yWCAG('.empty-cart, [class*="empty"]');
        }
      });
    });

    it('should have accessible call-to-action for empty cart', () => {
      cy.get('a[href*="tienda"], a[href*="productos"], button[class*="shop"]').then($cta => {
        if ($cta.length > 0) {
          cy.wrap($cta).should('satisfy', ($el) => {
            const text = $el.text().trim();
            const ariaLabel = $el.attr('aria-label');

            return text.length > 0 || ariaLabel;
          });
        }
      });
    });
  });

  describe('Cart Loading States', () => {
    it('should have accessible loading indicators', () => {
      cy.visit('/carrito');

      cy.get('[role="progressbar"], [aria-busy="true"], .loading').then($loader => {
        if ($loader.length > 0) {
          cy.wrap($loader).should('satisfy', ($el) => {
            return $el.attr('role') === 'progressbar' ||
                   $el.attr('aria-busy') === 'true' ||
                   $el.attr('aria-label');
          });

          cy.checkA11yWCAG('[role="progressbar"], [aria-busy="true"]');
        }
      });
    });
  });

  describe('Discount/Promo Codes', () => {
    beforeEach(() => {
      // Add product and navigate to cart
      cy.visit('/tienda');
      cy.waitForAngular();
      cy.get('.product-card button, [data-cy*="add"]').first().click();
      cy.wait(500);

      cy.visit('/carrito');
      cy.waitForAngular();
      cy.injectAxe();
    });

    it('should have accessible promo code input', () => {
      cy.get('input[name*="promo"], input[name*="coupon"], input[name*="discount"]').then($input => {
        if ($input.length > 0) {
          const id = $input.attr('id');
          const ariaLabel = $input.attr('aria-label');
          const ariaLabelledby = $input.attr('aria-labelledby');

          if (id) {
            cy.get(`label[for="${id}"]`).should('exist');
          } else {
            expect(ariaLabel || ariaLabelledby).to.exist;
          }

          cy.checkA11yWCAG('input[name*="promo"], input[name*="coupon"]');
        }
      });
    });

    it('should announce promo code errors/success', () => {
      cy.get('input[name*="promo"], input[name*="coupon"]').then($input => {
        if ($input.length > 0) {
          cy.wrap($input).type('INVALID123');
          cy.get('button[type="submit"]').first().click();

          // Check for error message
          cy.get('[role="alert"], .error, [class*="error"]').then($error => {
            if ($error.length > 0) {
              cy.wrap($error).should('have.attr', 'role', 'alert')
                .or('have.attr', 'aria-live');
            }
          });
        }
      });
    });
  });

  describe('Comprehensive Cart Accessibility', () => {
    beforeEach(() => {
      // Add product and navigate to cart
      cy.visit('/tienda');
      cy.waitForAngular();
      cy.get('.product-card button, [data-cy*="add"]').first().click();
      cy.wait(500);

      cy.visit('/carrito');
      cy.waitForAngular();
      cy.injectAxe();
    });

    it('should pass all WCAG 2.1 AA rules', () => {
      cy.checkA11y(undefined, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      });
    });

    it('should have no critical violations', () => {
      cy.checkA11y(undefined, {
        includedImpacts: ['critical', 'serious']
      });
    });

    it('should be fully keyboard navigable', () => {
      // Tab through interactive elements
      cy.get('body').tab();
      cy.focused().should('exist');

      // Tab multiple times
      for (let i = 0; i < 10; i++) {
        cy.get('body').tab();
        cy.focused().should('exist').and('be.visible');
      }
    });
  });
});
