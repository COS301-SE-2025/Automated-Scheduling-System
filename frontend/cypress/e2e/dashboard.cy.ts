describe('Dashboard Page', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', 'mock-token');
    });
    
    // Intercept API calls to mock data
    cy.intercept('GET', '**/api/dashboard/**', { fixture: 'dashboard-data.json' }).as('getDashboardData');
    cy.intercept('GET', '**/api/events/**', { fixture: 'events.json' }).as('getEvents');
    cy.intercept('GET', '**/api/users/**', { fixture: 'users.json' }).as('getUsers');
  });

  describe('Dashboard Loading', () => {
    it('should load dashboard page successfully', () => {
      cy.visit('/dashboard');
      cy.contains('Dashboard').should('be.visible');
      cy.wait('@getDashboardData');
    });

    it('should show loading state initially', () => {
      cy.visit('/dashboard');
      cy.contains('Loading').should('be.visible');
      cy.wait('@getDashboardData');
      cy.contains('Loading').should('not.exist');
    });
  });

  describe('Dashboard Content', () => {
    beforeEach(() => {
      cy.visit('/dashboard');
      cy.wait('@getDashboardData');
    });

    it('should display key metrics and statistics', () => {
      // Adjust these based on your dashboard components
      cy.get('[data-testid="total-users"]').should('be.visible');
      cy.get('[data-testid="total-events"]').should('be.visible');
      cy.get('[data-testid="active-rules"]').should('be.visible');
    });

    it('should display recent activities', () => {
      cy.get('[data-testid="recent-activities"]').should('be.visible');
      cy.contains('Recent Activities').should('be.visible');
    });

    it('should display upcoming events', () => {
      cy.get('[data-testid="upcoming-events"]').should('be.visible');
      cy.contains('Upcoming Events').should('be.visible');
    });

    it('should have quick action buttons', () => {
      cy.contains('Create Event').should('be.visible');
      cy.contains('Manage Users').should('be.visible');
      cy.contains('View Calendar').should('be.visible');
    });
  });

  describe('Dashboard Interactions', () => {
    beforeEach(() => {
      cy.visit('/dashboard');
      cy.wait('@getDashboardData');
    });

    it('should navigate to calendar when clicking View Calendar', () => {
      cy.contains('View Calendar').click();
      cy.url().should('include', '/calendar');
    });

    it('should navigate to users page when clicking Manage Users', () => {
      cy.contains('Manage Users').click();
      cy.url().should('include', '/users');
    });

    it('should open event creation modal when clicking Create Event', () => {
      cy.contains('Create Event').click();
      cy.get('[data-testid="event-modal"]').should('be.visible');
    });

    it('should refresh data when refresh button is clicked', () => {
      cy.get('[data-testid="refresh-button"]').click();
      cy.wait('@getDashboardData');
      cy.contains('Data refreshed').should('be.visible');
    });
  });

  describe('Dashboard Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.intercept('GET', '**/api/dashboard/**', { statusCode: 500 }).as('getDashboardError');
      
      cy.visit('/dashboard');
      cy.wait('@getDashboardError');
      
      cy.contains('Error loading dashboard').should('be.visible');
      cy.contains('Retry').should('be.visible');
    });

    it('should allow retry after error', () => {
      cy.intercept('GET', '**/api/dashboard/**', { statusCode: 500 }).as('getDashboardError');
      
      cy.visit('/dashboard');
      cy.wait('@getDashboardError');
      
      // Mock successful response for retry
      cy.intercept('GET', '**/api/dashboard/**', { fixture: 'dashboard-data.json' }).as('getDashboardRetry');
      
      cy.contains('Retry').click();
      cy.wait('@getDashboardRetry');
      cy.contains('Dashboard').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should display correctly on mobile devices', () => {
      cy.viewport('iphone-x');
      cy.visit('/dashboard');
      cy.wait('@getDashboardData');
      
      // Check if mobile navigation is working
      cy.get('[data-testid="mobile-menu-toggle"]').should('be.visible');
      cy.get('[data-testid="mobile-menu-toggle"]').click();
      cy.get('[data-testid="mobile-menu"]').should('be.visible');
    });

    it('should display correctly on tablet devices', () => {
      cy.viewport('ipad-2');
      cy.visit('/dashboard');
      cy.wait('@getDashboardData');
      
      cy.get('[data-testid="dashboard-grid"]').should('be.visible');
    });
  });
});
