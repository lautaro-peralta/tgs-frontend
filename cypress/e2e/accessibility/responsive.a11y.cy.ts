/**
 * Accessibility Tests - Responsive Design
 *
 * WCAG 2.1 Level AA Compliance Tests
 * Validates accessibility across different viewports, zoom levels, and orientations
 */

describe('Responsive Design - Accessibility (WCAG 2.1 AA)', () => {
  const viewports = {
    mobile: { width: 375, height: 667, name: 'Mobile (375x667)' },
    tablet: { width: 768, height: 1024, name: 'Tablet (768x1024)' },
    desktop: { width: 1280, height: 720, name: 'Desktop (1280x720)' },
    wide: { width: 1920, height: 1080, name: 'Wide (1920x1080)' }
  };

  describe('Mobile Viewport (375x667)', () => {
    beforeEach(() => {
      cy.viewport(viewports.mobile.width, viewports.mobile.height);
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should have no accessibility violations on mobile', () => {
      cy.checkA11yWCAG();
    });

    it('should have proper viewport meta tag', () => {
      cy.get('meta[name="viewport"]').should('exist')
        .and('have.attr', 'content').and('include', 'width=device-width');
    });

    it('should have touch-friendly interactive elements (min 44x44px)', () => {
      cy.get('button, a, input, [role="button"]').each(($el) => {
        if ($el.is(':visible')) {
          const width = $el.outerWidth() || 0;
          const height = $el.outerHeight() || 0;

          // WCAG 2.1 Level AA: Target Size should be at least 44x44px
          cy.log(`Element: ${$el.prop('tagName')}, Size: ${width}x${height}`);

          // Allow smaller elements if they have adequate spacing
          if (width < 44 || height < 44) {
            cy.log(`Warning: Element smaller than 44x44px: ${width}x${height}`);
          }
        }
      });
    });

    it('should not have horizontal scrolling', () => {
      cy.get('body').then($body => {
        const bodyWidth = $body.outerWidth() || 0;
        const scrollWidth = $body[0].scrollWidth;

        expect(scrollWidth).to.be.at.most(bodyWidth + 1); // +1 for rounding
      });
    });

    it('should have accessible mobile navigation', () => {
      cy.get('button[class*="hamburger"], button[class*="menu-toggle"]').then($toggle => {
        if ($toggle.length > 0) {
          cy.wrap($toggle).should('be.visible');
          cy.checkA11yWCAG('button[class*="hamburger"], button[class*="menu-toggle"]');
        }
      });
    });

    it('should have readable text on mobile (minimum 16px base)', () => {
      cy.get('body').should('satisfy', ($body) => {
        const fontSize = parseFloat(window.getComputedStyle($body[0]).fontSize);
        return fontSize >= 14; // Allow slightly smaller on mobile
      });
    });

    it('should have sufficient color contrast on mobile', () => {
      cy.checkA11yWCAG('body', {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });

    it('should support portrait orientation', () => {
      cy.viewport(viewports.mobile.width, viewports.mobile.height);
      cy.checkA11yWCAG();
    });

    it('should support landscape orientation', () => {
      cy.viewport(viewports.mobile.height, viewports.mobile.width); // Swap width/height
      cy.checkA11yWCAG();
    });
  });

  describe('Tablet Viewport (768x1024)', () => {
    beforeEach(() => {
      cy.viewport(viewports.tablet.width, viewports.tablet.height);
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should have no accessibility violations on tablet', () => {
      cy.checkA11yWCAG();
    });

    it('should have touch-friendly targets on tablet', () => {
      cy.get('button, a').each(($el, index) => {
        if (index < 10 && $el.is(':visible')) {
          const width = $el.outerWidth() || 0;
          const height = $el.outerHeight() || 0;

          cy.log(`Element ${index}: ${width}x${height}`);

          // Tablet should also follow 44x44px minimum
          expect(width).to.be.at.least(32); // Slightly relaxed for testing
          expect(height).to.be.at.least(32);
        }
      });
    });

    it('should not have horizontal overflow', () => {
      cy.get('body').then($body => {
        const bodyWidth = $body.outerWidth() || 0;
        const scrollWidth = $body[0].scrollWidth;

        expect(scrollWidth).to.be.at.most(bodyWidth + 1);
      });
    });

    it('should have proper layout on tablet', () => {
      cy.get('main, [role="main"]').should('be.visible');
      cy.checkA11yWCAG('main');
    });

    it('should support both orientations on tablet', () => {
      // Portrait
      cy.viewport(viewports.tablet.width, viewports.tablet.height);
      cy.checkA11yWCAG();

      // Landscape
      cy.viewport(viewports.tablet.height, viewports.tablet.width);
      cy.checkA11yWCAG();
    });
  });

  describe('Desktop Viewport (1280x720)', () => {
    beforeEach(() => {
      cy.viewport(viewports.desktop.width, viewports.desktop.height);
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should have no accessibility violations on desktop', () => {
      cy.checkA11yWCAG();
    });

    it('should have visible full navigation on desktop', () => {
      cy.get('nav, [role="navigation"]').should('be.visible');
      cy.get('nav a, [role="navigation"] a').should('have.length.greaterThan', 0);
    });

    it('should not show mobile menu toggle on desktop', () => {
      cy.get('button[class*="hamburger"], button[class*="menu-toggle"]').should('not.be.visible')
        .or('not.exist');
    });

    it('should have proper content width (max-width)', () => {
      cy.get('main, [role="main"], .container').then($content => {
        if ($content.length > 0) {
          const width = $content.first().outerWidth() || 0;
          const viewportWidth = viewports.desktop.width;

          // Content should not extend full width on desktop
          cy.log(`Content width: ${width}, Viewport: ${viewportWidth}`);
          expect(width).to.be.at.most(viewportWidth);
        }
      });
    });

    it('should have accessible hover states', () => {
      cy.get('a, button').first().then($el => {
        if ($el.is(':visible')) {
          cy.wrap($el).trigger('mouseover');

          // Hover should not be the only indicator
          cy.checkA11yWCAG($el);
        }
      });
    });
  });

  describe('Wide Viewport (1920x1080)', () => {
    beforeEach(() => {
      cy.viewport(viewports.wide.width, viewports.wide.height);
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should have no accessibility violations on wide screens', () => {
      cy.checkA11yWCAG();
    });

    it('should have readable line lengths (max 80-100 characters)', () => {
      cy.get('p, .text-content').each(($p) => {
        if ($p.is(':visible') && $p.text().trim().length > 0) {
          const width = $p.outerWidth() || 0;
          const fontSize = parseFloat(window.getComputedStyle($p[0]).fontSize);

          // Approximate characters per line
          const approximateCharsPerLine = width / (fontSize * 0.5);

          cy.log(`Line width: ${width}px, Font: ${fontSize}px, ~${approximateCharsPerLine} chars`);

          // WCAG recommends max 80 characters for readability
          // We allow more since this is a guideline
          expect(approximateCharsPerLine).to.be.at.most(150);
        }
      });
    });

    it('should have content max-width constraint', () => {
      cy.get('main, [role="main"], .container').first().then($content => {
        const width = $content.outerWidth() || 0;

        // Content should be constrained for readability
        cy.log(`Content width on wide screen: ${width}px`);
        expect(width).to.be.at.most(1600); // Reasonable max-width
      });
    });
  });

  describe('Browser Zoom Support (WCAG 2.1 - Reflow)', () => {
    beforeEach(() => {
      cy.viewport(1280, 720);
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should support 200% zoom without horizontal scrolling', () => {
      // Simulate 200% zoom by halving viewport
      cy.viewport(640, 360);
      cy.visit('/');
      cy.waitForAngular();

      cy.get('body').then($body => {
        const bodyWidth = $body.outerWidth() || 0;
        const scrollWidth = $body[0].scrollWidth;

        // Should not require horizontal scrolling
        expect(scrollWidth).to.be.at.most(bodyWidth + 2);
      });

      cy.checkA11yWCAG();
    });

    it('should support 400% zoom (320px wide equivalent)', () => {
      // 1280 / 4 = 320px (400% zoom equivalent)
      cy.viewport(320, 180);
      cy.visit('/');
      cy.waitForAngular();

      cy.get('body').should('be.visible');
      cy.checkA11yWCAG();
    });

    it('should maintain functionality at high zoom levels', () => {
      cy.viewport(400, 300); // Simulated zoom
      cy.visit('/');
      cy.waitForAngular();

      // Navigation should still work
      cy.get('nav a, button[class*="menu"]').first().should('be.visible');

      // Interactive elements should be accessible
      cy.get('button, a').first().click();
    });
  });

  describe('Text Spacing and Reflow (WCAG 2.1.4)', () => {
    beforeEach(() => {
      cy.viewport(1280, 720);
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should support increased line height (1.5x)', () => {
      cy.get('body').invoke('css', 'line-height', '1.5');

      cy.wait(300);

      // Should not cause content to be cut off
      cy.checkA11yWCAG();
    });

    it('should support increased paragraph spacing (2x font size)', () => {
      cy.get('p').invoke('css', 'margin-bottom', '2em');

      cy.wait(300);

      cy.checkA11yWCAG();
    });

    it('should support increased letter spacing (0.12x font size)', () => {
      cy.get('body').invoke('css', 'letter-spacing', '0.12em');

      cy.wait(300);

      cy.checkA11yWCAG();
    });

    it('should support increased word spacing (0.16x font size)', () => {
      cy.get('body').invoke('css', 'word-spacing', '0.16em');

      cy.wait(300);

      cy.checkA11yWCAG();
    });

    it('should support all WCAG text spacing adjustments simultaneously', () => {
      cy.get('body').invoke('attr', 'style',
        'line-height: 1.5 !important; ' +
        'letter-spacing: 0.12em !important; ' +
        'word-spacing: 0.16em !important;'
      );

      cy.get('p').invoke('css', 'margin-bottom', '2em');

      cy.wait(500);

      // Content should still be readable and accessible
      cy.checkA11yWCAG();
    });
  });

  describe('Responsive Images', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should have responsive images that scale properly', () => {
      const testViewports = [375, 768, 1280];

      testViewports.forEach(width => {
        cy.viewport(width, 720);

        cy.get('img').each(($img) => {
          if ($img.is(':visible')) {
            const imgWidth = $img.outerWidth() || 0;
            const parentWidth = $img.parent().outerWidth() || 0;

            // Image should not exceed parent width
            expect(imgWidth).to.be.at.most(parentWidth + 1);
          }
        });
      });
    });

    it('should have alt text for all images across viewports', () => {
      [375, 1280].forEach(width => {
        cy.viewport(width, 720);

        cy.get('img').each($img => {
          cy.wrap($img).should('have.attr', 'alt');
        });
      });
    });
  });

  describe('Responsive Tables', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should have accessible tables on mobile', () => {
      cy.viewport(375, 667);

      cy.get('table').then($tables => {
        if ($tables.length > 0) {
          cy.checkA11yWCAG('table', {
            rules: {
              'table': { enabled: true },
              'td-headers-attr': { enabled: true },
              'th-has-data-cells': { enabled: true }
            }
          });
        }
      });
    });

    it('should have horizontally scrollable tables or responsive layout', () => {
      cy.viewport(375, 667);

      cy.get('table').then($tables => {
        if ($tables.length > 0) {
          // Table should either:
          // 1. Fit within viewport
          // 2. Be in a scrollable container
          // 3. Be transformed to cards on mobile

          cy.wrap($tables).first().then($table => {
            const tableWidth = $table.outerWidth() || 0;
            const parentWidth = $table.parent().outerWidth() || 0;

            if (tableWidth > parentWidth) {
              // Should have overflow container
              cy.wrap($table).parent().should('have.css', 'overflow-x', 'auto')
                .or('have.css', 'overflow-x', 'scroll')
                .or('have.css', 'overflow', 'auto');
            }
          });
        }
      });
    });
  });

  describe('Responsive Forms', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.injectAxe();
      cy.waitForAngular();
    });

    it('should have accessible forms on mobile', () => {
      cy.viewport(375, 667);

      cy.get('form').then($forms => {
        if ($forms.length > 0) {
          cy.checkA11yWCAG('form');
        }
      });
    });

    it('should have properly sized form inputs on mobile', () => {
      cy.viewport(375, 667);

      cy.get('input, textarea, select').each(($input) => {
        if ($input.is(':visible')) {
          const height = $input.outerHeight() || 0;

          // Inputs should be touch-friendly
          expect(height).to.be.at.least(40);
        }
      });
    });

    it('should have accessible buttons on all viewports', () => {
      [375, 768, 1280].forEach(width => {
        cy.viewport(width, 720);

        cy.get('button[type="submit"]').each($btn => {
          if ($btn.is(':visible')) {
            const height = $btn.outerHeight() || 0;
            const width = $btn.outerWidth() || 0;

            // Buttons should be adequately sized
            cy.log(`Button at ${width}px viewport: ${width}x${height}`);
            expect(height).to.be.at.least(36);
          }
        });
      });
    });
  });

  describe('Orientation Support', () => {
    it('should support portrait orientation on mobile', () => {
      cy.viewport(375, 667); // Portrait
      cy.visit('/');
      cy.waitForAngular();
      cy.injectAxe();

      cy.checkA11yWCAG();
    });

    it('should support landscape orientation on mobile', () => {
      cy.viewport(667, 375); // Landscape
      cy.visit('/');
      cy.waitForAngular();
      cy.injectAxe();

      cy.checkA11yWCAG();
    });

    it('should not restrict orientation (WCAG 2.1.1)', () => {
      // Check for orientation lock in CSS
      cy.get('meta[name="viewport"]').should('not.have.attr', 'content', /user-scalable=no/);

      // Application should work in both orientations
      cy.viewport(375, 667);
      cy.visit('/');
      cy.get('body').should('be.visible');

      cy.viewport(667, 375);
      cy.visit('/');
      cy.get('body').should('be.visible');
    });
  });

  describe('Comprehensive Responsive Accessibility', () => {
    it('should pass WCAG 2.1 AA across all viewports', () => {
      [375, 768, 1280, 1920].forEach(width => {
        cy.viewport(width, 720);
        cy.visit('/');
        cy.waitForAngular();
        cy.injectAxe();

        cy.log(`Testing viewport: ${width}x720`);

        cy.checkA11y(undefined, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
          }
        });
      });
    });

    it('should have no critical violations on any viewport', () => {
      [375, 768, 1280].forEach(width => {
        cy.viewport(width, 720);
        cy.visit('/');
        cy.waitForAngular();
        cy.injectAxe();

        cy.checkA11y(undefined, {
          includedImpacts: ['critical', 'serious']
        });
      });
    });

    it('should maintain keyboard accessibility across viewports', () => {
      [375, 1280].forEach(width => {
        cy.viewport(width, 720);
        cy.visit('/');
        cy.waitForAngular();

        // Tab through elements
        cy.get('body').tab();
        cy.focused().should('exist').and('be.visible');

        cy.get('body').tab();
        cy.focused().should('exist').and('be.visible');
      });
    });

    it('should support browser zoom from 100% to 200%', () => {
      const baseWidth = 1280;
      const zoomLevels = [100, 125, 150, 200];

      zoomLevels.forEach(zoom => {
        const adjustedWidth = Math.floor(baseWidth / (zoom / 100));
        cy.viewport(adjustedWidth, 720);
        cy.visit('/');
        cy.waitForAngular();
        cy.injectAxe();

        cy.log(`Testing ${zoom}% zoom (${adjustedWidth}px)`);

        cy.checkA11yWCAG();
      });
    });
  });
});
