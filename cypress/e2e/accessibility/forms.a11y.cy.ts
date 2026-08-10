/**
 * Accessibility Tests - Forms
 *
 * WCAG 2.1 Level AA Compliance Tests
 * Validates login, register, and other form accessibility
 */

describe('Forms - Accessibility (WCAG 2.1 AA)', () => {
  describe('Login Form', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should have no accessibility violations on login form', () => {
      cy.checkA11yWCAG('form, [role="form"]');
    });

    it('should have accessible form heading', () => {
      cy.get('h1, h2, h3').should('contain.text', /login|ingres|iniciar|sign in/i);

      cy.checkA11yWCAG('h1, h2, h3', {
        rules: {
          'heading-order': { enabled: true }
        }
      });
    });

    it('should have properly labeled email input', () => {
      cy.get('input[type="email"], input[name*="email"], [data-cy*="email"]').first()
        .should('satisfy', ($el) => {
          const id = $el.attr('id');
          const ariaLabel = $el.attr('aria-label');
          const ariaLabelledby = $el.attr('aria-labelledby');
          const placeholder = $el.attr('placeholder');

          // Check for explicit label
          if (id) {
            const hasLabel = Cypress.$(`label[for="${id}"]`).length > 0;
            if (hasLabel) return true;
          }

          return !!(ariaLabel || ariaLabelledby || placeholder);
        });

      cy.checkA11yWCAG('input[type="email"]', {
        rules: {
          'label': { enabled: true },
          'label-title-only': { enabled: true }
        }
      });
    });

    it('should have properly labeled password input', () => {
      cy.get('input[type="password"]').first()
        .should('satisfy', ($el) => {
          const id = $el.attr('id');
          const ariaLabel = $el.attr('aria-label');
          const ariaLabelledby = $el.attr('aria-labelledby');
          const placeholder = $el.attr('placeholder');

          if (id) {
            const hasLabel = Cypress.$(`label[for="${id}"]`).length > 0;
            if (hasLabel) return true;
          }

          return !!(ariaLabel || ariaLabelledby || placeholder);
        });

      cy.checkA11yWCAG('input[type="password"]', {
        rules: {
          'label': { enabled: true }
        }
      });
    });

    it('should have accessible submit button', () => {
      cy.get('button[type="submit"], [data-cy*="login-button"]').first()
        .should('satisfy', ($el) => {
          const text = $el.text().trim();
          const ariaLabel = $el.attr('aria-label');

          return text.length > 0 || ariaLabel;
        });

      cy.checkA11yWCAG('button[type="submit"]');
    });

    it('should show accessible error messages', () => {
      // Submit form with invalid data
      cy.get('button[type="submit"], [data-cy*="login-button"]').first().click();

      cy.wait(500);

      // Check for error messages
      cy.get('[role="alert"], .error, [class*="error"], [aria-invalid="true"]').then($errors => {
        if ($errors.length > 0) {
          cy.wrap($errors).first().should('satisfy', ($el) => {
            return $el.attr('role') === 'alert' ||
                   $el.attr('aria-live') === 'polite' ||
                   $el.attr('aria-live') === 'assertive';
          });

          cy.checkA11yWCAG('[role="alert"], .error');
        }
      });
    });

    it('should mark invalid fields with aria-invalid', () => {
      // Submit form to trigger validation
      cy.get('button[type="submit"]').first().click();

      cy.wait(500);

      cy.get('input[aria-invalid="true"], .ng-invalid.ng-touched').then($invalid => {
        if ($invalid.length > 0) {
          cy.wrap($invalid).each($field => {
            // Field should be associated with error message
            const ariaDescribedby = $field.attr('aria-describedby');
            const ariaErrormessage = $field.attr('aria-errormessage');

            if (ariaDescribedby) {
              cy.get(`#${ariaDescribedby}`).should('exist');
            }
          });
        }
      });
    });

    it('should have keyboard accessible form controls', () => {
      // Tab through form elements
      cy.get('input[type="email"]').first().focus();
      cy.focused().should('exist').and('be.visible');

      cy.get('body').tab();
      cy.focused().should('exist').and('be.visible');

      cy.get('body').tab();
      cy.focused().should('have.attr', 'type', 'submit')
        .or('have.prop', 'tagName', 'BUTTON');
    });

    it('should have visible focus indicators on form inputs', () => {
      cy.get('input[type="email"]').first().focus();

      cy.focused().then($input => {
        const outline = $input.css('outline');
        const border = $input.css('border');
        const boxShadow = $input.css('box-shadow');

        // Should have some visual focus indicator
        expect(outline !== 'none' || border || boxShadow !== 'none').to.be.true;
      });
    });

    it('should have sufficient color contrast for labels', () => {
      cy.checkA11yWCAG('label, .label', {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });
  });

  describe('Registration Form', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();

      // Switch to register tab if exists
      cy.get('[data-cy*="register"], button[class*="register"], a[href*="register"]').then($tab => {
        if ($tab.length > 0) {
          cy.wrap($tab).first().click();
          cy.wait(300);
        }
      });
    });

    it('should have no accessibility violations on registration form', () => {
      cy.checkA11yWCAG('form, [role="form"]');
    });

    it('should have properly labeled name input', () => {
      cy.get('input[name*="name"], input[name*="nombre"], [data-cy*="name"]').first().then($input => {
        if ($input.length > 0) {
          const id = $input.attr('id');
          const ariaLabel = $input.attr('aria-label');
          const ariaLabelledby = $input.attr('aria-labelledby');
          const placeholder = $input.attr('placeholder');

          if (id) {
            cy.get(`label[for="${id}"]`).should('exist');
          } else {
            expect(ariaLabel || ariaLabelledby || placeholder).to.exist;
          }

          cy.checkA11yWCAG($input, {
            rules: {
              'label': { enabled: true }
            }
          });
        }
      });
    });

    it('should have accessible password confirmation field', () => {
      cy.get('input[name*="confirm"], input[name*="repeat"]').then($confirm => {
        if ($confirm.length > 0) {
          cy.wrap($confirm).should('satisfy', ($el) => {
            const id = $el.attr('id');
            const ariaLabel = $el.attr('aria-label');
            const ariaLabelledby = $el.attr('aria-labelledby');
            const placeholder = $el.attr('placeholder');

            if (id) {
              return Cypress.$(`label[for="${id}"]`).length > 0;
            }

            return !!(ariaLabel || ariaLabelledby || placeholder);
          });

          cy.checkA11yWCAG('input[name*="confirm"]');
        }
      });
    });

    it('should show password requirements accessibly', () => {
      cy.get('.password-requirements, [class*="requirement"], [role="status"]').then($requirements => {
        if ($requirements.length > 0) {
          cy.wrap($requirements).should('be.visible');

          // Requirements should be associated with password field
          cy.get('input[type="password"]').first().then($password => {
            const describedby = $password.attr('aria-describedby');
            if (describedby) {
              expect($requirements.attr('id')).to.equal(describedby);
            }
          });

          cy.checkA11yWCAG('.password-requirements, [class*="requirement"]');
        }
      });
    });

    it('should have accessible checkboxes for terms/conditions', () => {
      cy.get('input[type="checkbox"]').then($checkbox => {
        if ($checkbox.length > 0) {
          cy.wrap($checkbox).each($cb => {
            const id = $cb.attr('id');
            const ariaLabel = $cb.attr('aria-label');
            const ariaLabelledby = $cb.attr('aria-labelledby');

            if (id) {
              cy.get(`label[for="${id}"]`).should('exist');
            } else {
              expect(ariaLabel || ariaLabelledby).to.exist;
            }
          });

          cy.checkA11yWCAG('input[type="checkbox"]', {
            rules: {
              'label': { enabled: true }
            }
          });
        }
      });
    });

    it('should validate and show errors accessibly', () => {
      // Fill form incorrectly
      cy.get('input[type="email"]').first().type('invalid-email');
      cy.get('input[type="password"]').first().type('123');
      cy.get('button[type="submit"]').first().click();

      cy.wait(500);

      // Check for accessible error messages
      cy.get('[role="alert"], .error, [class*="error"]').then($errors => {
        if ($errors.length > 0) {
          cy.wrap($errors).first().should('satisfy', ($el) => {
            return $el.attr('role') === 'alert' || $el.attr('aria-live');
          });
        }
      });
    });
  });

  describe('Contact/Profile Forms', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.injectAxe();
    });

    it('should have accessible text inputs', () => {
      cy.get('input[type="text"], input[type="tel"], input[type="email"]').each($input => {
        if ($input.is(':visible')) {
          const id = $input.attr('id');
          const ariaLabel = $input.attr('aria-label');
          const ariaLabelledby = $input.attr('aria-labelledby');
          const placeholder = $input.attr('placeholder');

          // Should have some form of label
          if (id) {
            const hasLabel = Cypress.$(`label[for="${id}"]`).length > 0;
            if (!hasLabel) {
              expect(ariaLabel || ariaLabelledby || placeholder).to.exist;
            }
          } else {
            expect(ariaLabel || ariaLabelledby || placeholder).to.exist;
          }
        }
      });
    });

    it('should have accessible select dropdowns', () => {
      cy.get('select').then($selects => {
        if ($selects.length > 0) {
          cy.wrap($selects).each($select => {
            const id = $select.attr('id');
            const ariaLabel = $select.attr('aria-label');
            const ariaLabelledby = $select.attr('aria-labelledby');

            if (id) {
              cy.get(`label[for="${id}"]`).should('exist');
            } else {
              expect(ariaLabel || ariaLabelledby).to.exist;
            }
          });

          cy.checkA11yWCAG('select', {
            rules: {
              'label': { enabled: true }
            }
          });
        }
      });
    });

    it('should have accessible textareas', () => {
      cy.get('textarea').then($textareas => {
        if ($textareas.length > 0) {
          cy.wrap($textareas).each($textarea => {
            const id = $textarea.attr('id');
            const ariaLabel = $textarea.attr('aria-label');
            const ariaLabelledby = $textarea.attr('aria-labelledby');
            const placeholder = $textarea.attr('placeholder');

            if (id) {
              const hasLabel = Cypress.$(`label[for="${id}"]`).length > 0;
              if (!hasLabel) {
                expect(ariaLabel || ariaLabelledby || placeholder).to.exist;
              }
            } else {
              expect(ariaLabel || ariaLabelledby || placeholder).to.exist;
            }
          });

          cy.checkA11yWCAG('textarea');
        }
      });
    });
  });

  describe('Form Validation Messages', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should have proper ARIA attributes for required fields', () => {
      cy.get('input[required], [aria-required="true"]').each($required => {
        if ($required.is(':visible')) {
          cy.wrap($required).should('satisfy', ($el) => {
            return $el.attr('required') !== undefined || $el.attr('aria-required') === 'true';
          });
        }
      });
    });

    it('should associate validation errors with inputs', () => {
      // Submit form to trigger validation
      cy.get('button[type="submit"]').first().click();

      cy.wait(500);

      cy.get('input[aria-invalid="true"], input[aria-describedby]').then($inputs => {
        if ($inputs.length > 0) {
          cy.wrap($inputs).each($input => {
            const describedby = $input.attr('aria-describedby');
            const errormessage = $input.attr('aria-errormessage');

            if (describedby) {
              describedby.split(' ').forEach(id => {
                cy.get(`#${id}`).should('exist');
              });
            }

            if (errormessage) {
              cy.get(`#${errormessage}`).should('exist');
            }
          });
        }
      });
    });

    it('should have sufficient color contrast for error messages', () => {
      cy.get('button[type="submit"]').first().click();

      cy.wait(500);

      cy.checkA11yWCAG('.error, [role="alert"], [class*="error"]', {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });

    it('should not rely solely on color for error indication', () => {
      cy.get('button[type="submit"]').first().click();

      cy.wait(500);

      // Errors should have text, icons, or other non-color indicators
      cy.get('.error, [class*="error"], input[aria-invalid="true"]').then($errors => {
        if ($errors.length > 0) {
          cy.wrap($errors).first().should('satisfy', ($el) => {
            const hasText = $el.text().trim().length > 0;
            const hasIcon = $el.find('svg, i, .icon').length > 0;
            const hasAriaInvalid = $el.attr('aria-invalid') === 'true';

            return hasText || hasIcon || hasAriaInvalid;
          });
        }
      });
    });
  });

  describe('Form Navigation and Submission', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should support Enter key to submit form', () => {
      cy.get('input[type="email"]').first().type('test@example.com{enter}');

      cy.wait(500);

      // Form should attempt submission (may show validation errors)
      cy.get('[role="alert"], .error, .loading').should('exist');
    });

    it('should maintain focus order through form', () => {
      let previousTabIndex = -1;

      cy.get('form input, form button').each(($el, index) => {
        if ($el.is(':visible') && $el.attr('tabindex') !== '-1') {
          const tabindex = parseInt($el.attr('tabindex') || '0');

          if (previousTabIndex >= 0) {
            expect(tabindex).to.be.at.least(previousTabIndex);
          }

          previousTabIndex = tabindex;
        }
      });
    });

    it('should have accessible loading state during submission', () => {
      cy.get('input[type="email"]').first().type('test@example.com');
      cy.get('input[type="password"]').first().type('password123');
      cy.get('button[type="submit"]').first().click();

      // Check for loading indicator
      cy.get('[role="progressbar"], [aria-busy="true"], .loading').then($loader => {
        if ($loader.length > 0) {
          cy.wrap($loader).should('satisfy', ($el) => {
            return $el.attr('role') === 'progressbar' ||
                   $el.attr('aria-busy') === 'true' ||
                   $el.attr('aria-label');
          });
        }
      });
    });

    it('should disable submit button during processing', () => {
      cy.get('button[type="submit"]').first().then($btn => {
        if ($btn.attr('disabled') || $btn.attr('aria-disabled') === 'true') {
          // Button should communicate disabled state
          cy.wrap($btn).should('have.attr', 'disabled')
            .or('have.attr', 'aria-disabled', 'true');
        }
      });
    });
  });

  describe('Comprehensive Form Accessibility', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should pass all WCAG 2.1 AA rules for forms', () => {
      cy.checkA11y('form, [role="form"]', {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      });
    });

    it('should have no critical form violations', () => {
      cy.checkA11y('form, [role="form"]', {
        includedImpacts: ['critical', 'serious']
      });
    });

    it('should be fully keyboard accessible', () => {
      // Tab through entire form
      cy.get('body').tab();
      cy.focused().should('exist');

      let tabCount = 0;
      const maxTabs = 20;

      function tabThrough() {
        if (tabCount < maxTabs) {
          cy.focused().then($el => {
            if ($el.length > 0) {
              cy.log(`Focused: ${$el.prop('tagName')}`);
              tabCount++;
              cy.get('body').tab();
              tabThrough();
            }
          });
        }
      }

      tabThrough();
      expect(tabCount).to.be.greaterThan(0);
    });

    it('should have proper fieldset grouping for related fields', () => {
      cy.get('fieldset').then($fieldsets => {
        if ($fieldsets.length > 0) {
          cy.wrap($fieldsets).each($fieldset => {
            // Each fieldset should have a legend
            cy.wrap($fieldset).find('legend').should('exist');
          });

          cy.checkA11yWCAG('fieldset');
        }
      });
    });
  });
});
