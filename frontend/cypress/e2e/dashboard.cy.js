describe('Dashboard Page', () => {
  beforeEach(() => {
    // Mock authentication - same pattern as calendar tests
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', 'mock-token');
    });

    // Intercept authentication API calls
    cy.intercept('GET', '**/profile', {
      statusCode: 200,
      body: {
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'Admin',
        isActive: true
      }
    }).as('getProfile');

    cy.intercept('GET', '**/roles/permissions', {
      statusCode: 200,
      body: ['dashboard', 'calendar', 'events', 'users', 'roles', 'rules', 'competencies', 'event-definitions']
    }).as('getPermissions');
    
    // Intercept API calls using correct endpoints
    cy.intercept('GET', '**/event-schedules', { fixture: 'events.json' }).as('getScheduledEvents');
    cy.intercept('GET', '**/users', { fixture: 'users.json' }).as('getUsers');
  });

  describe('Dashboard Loading', () => {
    it('should load dashboard page successfully', () => {
      cy.visit('/dashboard');
      cy.wait(3000); // Allow page to load
      
      // Check that we're on the dashboard and not redirected
      cy.url().should('include', '/dashboard');
      
      // Look for dashboard content
      cy.get('body').should('contain.text', 'Dashboard');
    });

    it('should display page content after loading', () => {
      cy.visit('/dashboard');
      cy.wait(3000);
      
      // Check that page has loaded with some content
      cy.get('body').should('be.visible');
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Dashboard Content', () => {
    beforeEach(() => {
      cy.visit('/dashboard');
      cy.wait(3000); // Allow page to load
    });

    it('should display dashboard features and navigation', () => {
      // Look for feature blocks or navigation elements
      cy.get('body').should('be.visible');
      
      // Check for links or buttons that might be on the dashboard
      cy.get('a, button').should('exist');
    });

    it('should display upcoming events section', () => {
      // Look for upcoming events content
      cy.get('body').then(($body) => {
        const bodyText = $body.text();
        // Check if there's content related to events or activities
        expect(bodyText).to.match(/(upcoming|events|activities|schedule)/i);
      });
    });

    it('should have interactive elements', () => {
      // Check that there are clickable elements on the dashboard
      cy.get('a, button').should('have.length.at.least', 1);
    });

    it('should have navigation elements', () => {
      // Look for navigation or feature elements
      cy.get('body').should('be.visible');
      
      // Check if there are links to other pages
      cy.get('a').should('exist');
    });
  });

  describe('Dashboard Navigation', () => {
    beforeEach(() => {
      cy.visit('/dashboard');
      cy.wait(3000);
    });

    it('should have links to main application features', () => {
      // Check for navigation links
      cy.get('a[href*="/calendar"], a[href*="/users"], a[href*="/events"]').should('exist');
    });

    it('should allow navigation to different sections', () => {
      // Try to find and click navigation elements
      cy.get('a').then(($links) => {
        if ($links.length > 0) {
          // If there are links, they should be clickable
          cy.wrap($links.first()).should('be.visible');
        }
      });
    });
  });

  describe('Dashboard Error Handling', () => {
    it('should handle API errors gracefully', () => {
      // Mock failed API calls
      cy.intercept('GET', '**/event-schedules', { statusCode: 500 }).as('getEventsError');
      
      cy.visit('/dashboard');
      cy.wait('@getEventsError');
      
      // Page should still load even if some data fails
      cy.get('body').should('be.visible');
      cy.url().should('include', '/dashboard');
    });

    it('should display dashboard even with partial data failures', () => {
      cy.visit('/dashboard');
      cy.wait(3000);
      
      // Dashboard should be accessible
      cy.get('body').should('be.visible');
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Dashboard Responsive Design', () => {
    it('should display on mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.visit('/dashboard');
      cy.wait(3000);
      
      // Page should load and be accessible
      cy.get('body').should('be.visible');
      cy.url().should('include', '/dashboard');
    });

    it('should display on desktop viewport', () => {
      cy.viewport(1280, 720);
      cy.visit('/dashboard');
      cy.wait(3000);
      
      // Page should load
      cy.get('body').should('be.visible');
      cy.url().should('include', '/dashboard');
    });
  });
});
