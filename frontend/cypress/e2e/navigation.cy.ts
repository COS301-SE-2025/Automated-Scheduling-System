describe('Navigation and Routing', () => {
  beforeEach(() => {
    // Mock authentication - you'll need to adjust this based on your auth implementation
    cy.window().then((win) => {
      // Set mock auth token in localStorage
      win.localStorage.setItem('authToken', 'mock-token');
    });
  });

  describe('Landing Page', () => {
    it('should load the landing page for unauthenticated users', () => {
      cy.clearLocalStorage();
      cy.visit('/');
      cy.contains('Welcome').should('be.visible'); // Adjust based on your landing page content
    });

    it('should have navigation to login and signup', () => {
      cy.clearLocalStorage();
      cy.visit('/');
      cy.contains('Login').should('be.visible');
      cy.contains('Sign Up').should('be.visible');
    });
  });

  describe('Main Navigation', () => {
    beforeEach(() => {
      // Assume user is logged in
      cy.visit('/dashboard');
    });

    it('should navigate to all main pages', () => {
      const pages = [
        { link: 'Dashboard', url: '/dashboard' },
        { link: 'Calendar', url: '/calendar' },
        { link: 'Events', url: '/events' },
        { link: 'Users', url: '/users' },
        { link: 'Roles', url: '/roles' },
        { link: 'Rules', url: '/rules' },
        { link: 'Competency', url: '/competency' }
      ];

      pages.forEach(page => {
        cy.contains(page.link).click();
        cy.url().should('include', page.url);
        cy.go('back'); // Go back to test next navigation
      });
    });

    it('should display user menu and logout option', () => {
      cy.visit('/dashboard');
      // Look for user menu (adjust selector based on your implementation)
      cy.get('[data-testid="user-menu"]').click();
      cy.contains('Logout').should('be.visible');
    });

    it('should logout and redirect to login', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="user-menu"]').click();
      cy.contains('Logout').click();
      cy.url().should('include', '/login');
    });
  });

  describe('Theme Toggle', () => {
    it('should toggle between light and dark themes', () => {
      cy.visit('/dashboard');
      
      // Find theme toggle button (adjust selector)
      cy.get('[data-testid="theme-toggle"]').click();
      
      // Check if theme class is applied (adjust based on your implementation)
      cy.get('html').should('have.class', 'dark');
      
      // Toggle back
      cy.get('[data-testid="theme-toggle"]').click();
      cy.get('html').should('not.have.class', 'dark');
    });
  });

  describe('Help Pages', () => {
    it('should navigate to help page', () => {
      cy.visit('/dashboard');
      cy.contains('Help').click();
      cy.url().should('include', '/help');
    });

    it('should load landing help page for unauthenticated users', () => {
      cy.clearLocalStorage();
      cy.visit('/landing-help');
      cy.contains('Help').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should show 404 page for invalid routes', () => {
      cy.visit('/invalid-route');
      cy.contains('404').should('be.visible');
      cy.contains('Page not found').should('be.visible');
    });

    it('should provide way to navigate back from 404', () => {
      cy.visit('/invalid-route');
      cy.contains('Go Home').click();
      cy.url().should('not.include', '/invalid-route');
    });
  });
});
