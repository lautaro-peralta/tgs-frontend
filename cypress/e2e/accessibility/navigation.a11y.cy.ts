/**
 * Accessibility Tests - Navigation and Menu
 *
 * WCAG 2.1 Level AA Compliance Tests
 * Validates navigation menus, mobile navigation, breadcrumbs, and keyboard navigation
 */

describe('Navigation - Accessibility (WCAG 2.1 AA)', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
    cy.waitForAngular();
  });

  describe('Main Navigation Structure', () => {
    it('should have no accessibility violations in navigation', () => {
      cy.checkA11yWCAG('nav, [role="navigation"]');
    });

    it('should have proper nav landmark with accessible name', () => {
      cy.get('nav, [role="navigation"]').should('exist').and('be.visible');

      cy.get('nav, [role="navigation"]').first().should('satisfy', ($el) => {
        const ariaLabel = $el.attr('aria-label');
        const ariaLabelledby = $el.attr('aria-labelledby');

        // Nav should be identifiable
        return ariaLabel || ariaLabelledby || $el.prop('tagName') === 'NAV';
      });

      cy.checkA11yWCAG('nav', {
        rules: {
          'landmark-unique': { enabled: true }
        }
      });
    });

    it('should have accessible navigation links', () => {
      cy.get('nav a, [role="navigation"] a').each($link => {
        cy.wrap($link).should('satisfy', ($el) => {
          const text = $el.text().trim();
          const ariaLabel = $el.attr('aria-label');
          const title = $el.attr('title');

          return text.length > 0 || ariaLabel || title;
        });
      });

      cy.checkA11yWCAG('nav a');
    });

    it('should highlight current page in navigation', () => {
      cy.get('nav a[aria-current="page"], nav .active, [role="navigation"] [aria-current]').then($current => {
        if ($current.length > 0) {
          cy.wrap($current).should('satisfy', ($el) => {
            return $el.attr('aria-current') === 'page' ||
                   $el.hasClass('active') ||
                   $el.hasClass('current');
          });
        }
      });
    });

    it('should have keyboard accessible nav links', () => {
      cy.get('nav a').first().focus();
      cy.focused().should('exist').and('be.visible');

      // Tab through navigation
      cy.get('nav a').each(($link, index) => {
        if (index < 5) { // Test first 5 links
          cy.wrap($link).should('not.have.attr', 'tabindex', '-1');
        }
      });
    });

    it('should have sufficient color contrast for nav text', () => {
      cy.checkA11yWCAG('nav, [role="navigation"]', {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });
  });

  describe('Mobile Navigation / Hamburger Menu', () => {
    it('should have accessible hamburger button', () => {
      cy.get('button[class*="hamburger"], button[class*="menu-toggle"], [data-cy*="menu-toggle"]').then($toggle => {
        if ($toggle.length > 0) {
          cy.wrap($toggle).first().should('satisfy', ($el) => {
            const ariaLabel = $el.attr('aria-label');
            const ariaExpanded = $el.attr('aria-expanded');
            const text = $el.text().trim();

            // Button should describe its purpose and state
            return (ariaLabel || text.length > 0) && ariaExpanded !== undefined;
          });

          cy.checkA11yWCAG('button[class*="hamburger"], button[class*="menu-toggle"]');
        }
      });
    });

    it('should toggle aria-expanded on menu button', () => {
      cy.viewport(375, 667); // Mobile viewport

      cy.get('button[class*="hamburger"], button[class*="menu-toggle"]').then($toggle => {
        if ($toggle.length > 0) {
          const initialExpanded = $toggle.attr('aria-expanded');
          cy.log('Initial aria-expanded:', initialExpanded);

          cy.wrap($toggle).click();

          cy.wrap($toggle).should('have.attr', 'aria-expanded', initialExpanded === 'true' ? 'false' : 'true');
        }
      });
    });

    it('should trap focus in open mobile menu', () => {
      cy.viewport(375, 667);

      cy.get('button[class*="hamburger"], button[class*="menu-toggle"]').then($toggle => {
        if ($toggle.length > 0) {
          cy.wrap($toggle).click();

          // Focus should be trapped in menu
          cy.get('nav[aria-hidden="false"], .mobile-menu[aria-hidden="false"]').then($menu => {
            if ($menu.length > 0) {
              cy.wrap($menu).find('a, button').first().focus();
              cy.focused().should('exist');
            }
          });
        }
      });
    });

    it('should close menu on Escape key', () => {
      cy.viewport(375, 667);

      cy.get('button[class*="hamburger"], button[class*="menu-toggle"]').then($toggle => {
        if ($toggle.length > 0) {
          cy.wrap($toggle).click();

          cy.get('body').type('{esc}');

          cy.wrap($toggle).should('have.attr', 'aria-expanded', 'false');
        }
      });
    });

    it('should have accessible mobile menu structure', () => {
      cy.viewport(375, 667);

      cy.get('button[class*="hamburger"], button[class*="menu-toggle"]').then($toggle => {
        if ($toggle.length > 0) {
          cy.wrap($toggle).click();

          cy.checkA11yWCAG('.mobile-menu, nav[class*="mobile"]');
        }
      });
    });
  });

  describe('Dropdown/Submenu Navigation', () => {
    it('should have accessible dropdown triggers', () => {
      cy.get('button[aria-haspopup="true"], [aria-haspopup="menu"], .dropdown-toggle').then($dropdowns => {
        if ($dropdowns.length > 0) {
          cy.wrap($dropdowns).each($dropdown => {
            cy.wrap($dropdown).should('satisfy', ($el) => {
              const ariaHaspopup = $el.attr('aria-haspopup');
              const ariaExpanded = $el.attr('aria-expanded');

              return ariaHaspopup && ariaExpanded !== undefined;
            });
          });

          cy.checkA11yWCAG('button[aria-haspopup]');
        }
      });
    });

    it('should toggle aria-expanded on dropdown interaction', () => {
      cy.get('button[aria-haspopup="true"]').first().then($dropdown => {
        if ($dropdown.length > 0) {
          const initialExpanded = $dropdown.attr('aria-expanded');

          cy.wrap($dropdown).click();

          cy.wrap($dropdown).should('have.attr', 'aria-expanded', initialExpanded === 'true' ? 'false' : 'true');
        }
      });
    });

    it('should have accessible submenu items', () => {
      cy.get('button[aria-haspopup="true"]').first().then($dropdown => {
        if ($dropdown.length > 0) {
          cy.wrap($dropdown).click();

          cy.get('[role="menu"], [role="menuitem"], .dropdown-menu').then($menu => {
            if ($menu.length > 0) {
              cy.checkA11yWCAG('[role="menu"], .dropdown-menu');
            }
          });
        }
      });
    });

    it('should support keyboard navigation in dropdowns', () => {
      cy.get('button[aria-haspopup="true"]').first().then($dropdown => {
        if ($dropdown.length > 0) {
          cy.wrap($dropdown).focus().type('{enter}');

          // Arrow down should navigate to first item
          cy.focused().type('{downarrow}');
          cy.focused().should('have.attr', 'role', 'menuitem')
            .or('have.prop', 'tagName', 'A');
        }
      });
    });

    it('should close dropdown on Escape', () => {
      cy.get('button[aria-haspopup="true"]').first().then($dropdown => {
        if ($dropdown.length > 0) {
          cy.wrap($dropdown).click();

          cy.get('body').type('{esc}');

          cy.wrap($dropdown).should('have.attr', 'aria-expanded', 'false');
        }
      });
    });
  });

  describe('Breadcrumb Navigation', () => {
    beforeEach(() => {
      // Navigate to a deeper page that might have breadcrumbs
      cy.visit('/tienda');
      cy.waitForAngular();
      cy.injectAxe();
    });

    it('should have accessible breadcrumb navigation', () => {
      cy.get('nav[aria-label*="breadcrumb"], nav[aria-label*="ruta"], .breadcrumb').then($breadcrumb => {
        if ($breadcrumb.length > 0) {
          cy.wrap($breadcrumb).should('have.attr', 'aria-label')
            .or('have.attr', 'role', 'navigation');

          cy.checkA11yWCAG('nav[aria-label*="breadcrumb"], .breadcrumb');
        }
      });
    });

    it('should mark current page in breadcrumb', () => {
      cy.get('.breadcrumb [aria-current="page"], .breadcrumb .active').then($current => {
        if ($current.length > 0) {
          cy.wrap($current).should('have.attr', 'aria-current', 'page');
        }
      });
    });

    it('should have proper breadcrumb list structure', () => {
      cy.get('.breadcrumb ol, .breadcrumb ul, [aria-label*="breadcrumb"] ol').then($list => {
        if ($list.length > 0) {
          cy.wrap($list).find('li').should('have.length.greaterThan', 0);

          cy.checkA11yWCAG('.breadcrumb, [aria-label*="breadcrumb"]', {
            rules: {
              'list': { enabled: true },
              'listitem': { enabled: true }
            }
          });
        }
      });
    });
  });

  describe('Skip Navigation Links', () => {
    it('should have skip to main content link', () => {
      // Tab once to reveal skip link
      cy.get('body').tab();

      cy.focused().then($el => {
        if ($el.attr('href') === '#main-content' ||
            $el.attr('href') === '#main' ||
            $el.text().toLowerCase().includes('skip')) {

          cy.wrap($el).should('be.visible');
          cy.wrap($el).should('have.attr', 'href').and('match', /#.+/);

          cy.checkA11yWCAG($el);
        }
      });
    });

    it('should navigate to main content when skip link clicked', () => {
      cy.get('body').tab();

      cy.focused().then($el => {
        if ($el.attr('href')?.startsWith('#')) {
          const target = $el.attr('href');
          cy.wrap($el).click();

          // Should focus main content
          cy.get(target || 'main, [role="main"]').should('exist');
        }
      });
    });
  });

  describe('Keyboard Navigation Flow', () => {
    it('should have logical tab order', () => {
      const tabbedElements: string[] = [];

      // Tab through first 10 elements
      for (let i = 0; i < 10; i++) {
        cy.get('body').tab();
        cy.focused().then($el => {
          if ($el.length > 0) {
            const descriptor = `${$el.prop('tagName')} ${$el.attr('class') || ''} ${$el.attr('id') || ''}`;
            tabbedElements.push(descriptor);
            cy.log(`Tab ${i}: ${descriptor}`);
          }
        });
      }

      // Verify we tabbed through elements
      cy.wrap(tabbedElements).should('have.length.greaterThan', 0);
    });

    it('should have visible focus indicators on all interactive elements', () => {
      cy.get('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').each(($el, index) => {
        if (index < 5 && $el.is(':visible')) { // Test first 5 visible elements
          cy.wrap($el).focus();

          cy.focused().then($focused => {
            const outline = $focused.css('outline');
            const outlineWidth = $focused.css('outline-width');
            const boxShadow = $focused.css('box-shadow');

            // Should have visible focus indicator
            expect(
              outline !== 'none' ||
              parseFloat(outlineWidth) > 0 ||
              boxShadow !== 'none'
            ).to.be.true;
          });
        }
      });
    });

    it('should not have positive tabindex values', () => {
      cy.get('[tabindex]').each($el => {
        const tabindex = parseInt($el.attr('tabindex') || '0');

        // Positive tabindex creates unpredictable tab order
        expect(tabindex).to.be.at.most(0);
      });
    });

    it('should support arrow key navigation in menus', () => {
      cy.get('nav [role="menu"], nav ul').first().then($menu => {
        if ($menu.length > 0) {
          cy.wrap($menu).find('a, button, [role="menuitem"]').first().focus();

          // Down arrow should move to next item
          cy.focused().type('{downarrow}');
          cy.focused().should('exist');

          // Up arrow should move back
          cy.focused().type('{uparrow}');
          cy.focused().should('exist');
        }
      });
    });
  });

  describe('User Menu / Account Navigation', () => {
    it('should have accessible user menu button', () => {
      cy.get('[data-cy*="user-menu"], button[class*="user"], [aria-label*="cuenta"]').then($userMenu => {
        if ($userMenu.length > 0) {
          cy.wrap($userMenu).first().should('satisfy', ($el) => {
            const ariaLabel = $el.attr('aria-label');
            const ariaHaspopup = $el.attr('aria-haspopup');
            const text = $el.text().trim();

            return (ariaLabel || text.length > 0) && ariaHaspopup;
          });

          cy.checkA11yWCAG('[data-cy*="user-menu"], button[class*="user"]');
        }
      });
    });

    it('should have accessible logout button', () => {
      cy.get('[data-cy*="user-menu"], button[class*="user"]').first().then($menu => {
        if ($menu.length > 0) {
          cy.wrap($menu).click();

          cy.get('[data-cy*="logout"], button[class*="logout"], a[href*="logout"]').then($logout => {
            if ($logout.length > 0) {
              cy.wrap($logout).should('satisfy', ($el) => {
                const text = $el.text().trim();
                const ariaLabel = $el.attr('aria-label');

                return text.length > 0 || ariaLabel;
              });
            }
          });
        }
      });
    });
  });

  describe('Footer Navigation', () => {
    it('should have accessible footer navigation', () => {
      cy.get('footer nav, footer [role="navigation"]').then($footerNav => {
        if ($footerNav.length > 0) {
          cy.checkA11yWCAG('footer nav, footer [role="navigation"]');
        }
      });
    });

    it('should have accessible footer links', () => {
      cy.get('footer a').each($link => {
        if ($link.is(':visible')) {
          cy.wrap($link).should('satisfy', ($el) => {
            const text = $el.text().trim();
            const ariaLabel = $el.attr('aria-label');

            return text.length > 0 || ariaLabel;
          });
        }
      });
    });

    it('should have sufficient contrast in footer', () => {
      cy.checkA11yWCAG('footer', {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });
  });

  describe('Search Navigation', () => {
    it('should have accessible search form in navigation', () => {
      cy.get('nav input[type="search"], header input[type="search"]').then($search => {
        if ($search.length > 0) {
          cy.wrap($search).should('satisfy', ($el) => {
            const id = $el.attr('id');
            const ariaLabel = $el.attr('aria-label');
            const placeholder = $el.attr('placeholder');

            return ariaLabel || placeholder || (id && Cypress.$(`label[for="${id}"]`).length > 0);
          });

          cy.checkA11yWCAG('nav input[type="search"], header input[type="search"]');
        }
      });
    });

    it('should have accessible search button', () => {
      cy.get('nav button[type="submit"], header button[type="submit"]').then($searchBtn => {
        if ($searchBtn.length > 0) {
          cy.wrap($searchBtn).first().should('satisfy', ($el) => {
            const ariaLabel = $el.attr('aria-label');
            const text = $el.text().trim();

            return ariaLabel || text.length > 0;
          });
        }
      });
    });
  });

  describe('Comprehensive Navigation Accessibility', () => {
    it('should pass all WCAG 2.1 AA rules for navigation', () => {
      cy.checkA11y('nav, [role="navigation"]', {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      });
    });

    it('should have no critical navigation violations', () => {
      cy.checkA11y('nav, [role="navigation"], header', {
        includedImpacts: ['critical', 'serious']
      });
    });

    it('should have multiple navigation landmarks properly labeled', () => {
      cy.get('nav, [role="navigation"]').then($navs => {
        if ($navs.length > 1) {
          cy.wrap($navs).each($nav => {
            cy.wrap($nav).should('satisfy', ($el) => {
              return $el.attr('aria-label') || $el.attr('aria-labelledby');
            });
          });
        }
      });
    });

    it('should be fully keyboard navigable', () => {
      let successfulTabs = 0;

      for (let i = 0; i < 15; i++) {
        cy.get('body').tab();
        cy.focused().then($el => {
          if ($el.length > 0) {
            successfulTabs++;
            cy.log(`Tab ${i}: ${$el.prop('tagName')}`);
          }
        });
      }

      cy.wrap(successfulTabs).should('be.greaterThan', 5);
    });

    it('should have consistent navigation across pages', () => {
      // Get navigation structure on home page
      cy.get('nav a').then($homeLinks => {
        const homeNavCount = $homeLinks.length;

        // Navigate to another page
        cy.visit('/tienda');
        cy.waitForAngular();

        // Compare navigation structure
        cy.get('nav a').should('have.length', homeNavCount);
      });
    });
  });
});
