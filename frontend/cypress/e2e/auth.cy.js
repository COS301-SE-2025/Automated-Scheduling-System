describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear any existing auth state
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Login Page', () => {
    it('should load the login page', () => {
      cy.visit('/login');
      cy.contains('Sign in to continue').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
    });

    it('should show validation errors for invalid inputs', () => {
      cy.visit('/login');

      // Try to submit empty form
      cy.get('button[type="submit"]').click();
      // Check for validation messages (adjust selectors based on your implementation)
      cy.contains('Email is required').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');

      // Use obviously fake credentials that won't exist
      cy.get('input[type="email"]').type('nonexistent@fakeemail.com');
      cy.get('input[type="password"]').type('wrongpassword123');
      cy.get('button[type="submit"]').click();

      // Wait for error message to appear (adjust timeout as needed)
      cy.contains('Login Failed', { timeout: 10000 }).should('be.visible');
    });

    it('should successfully login with valid credentials', () => {
      cy.visit('/login');

      cy.get('input[type="email"]').type('john.doe@example.com');
      cy.get('input[type="password"]').type('Pa$$w0rd!');
      cy.get('button[type="submit"]').click();

      // Should redirect to dashboard after successful login
      cy.url().should('include', '/dashboard', { timeout: 10000 });
    });
  });

  describe('Signup Page', () => {
    it('should load the signup page', () => {
      cy.visit('/signup');
      cy.contains('Get started by creating a new account').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
    });

    it('should navigate to login from signup', () => {
      cy.visit('/signup');
      cy.contains('Sign in').click();
      cy.url().should('include', '/login');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', () => {
      cy.visit('/dashboard');
      // Give it some time to redirect
      cy.wait(2000);
      cy.url().should('include', '/login');
    });

    it('should redirect unauthenticated users from other protected routes', () => {
      const protectedRoutes = ['/users', '/calendar', '/events', '/rules', '/roles'];

      protectedRoutes.forEach(route => {
        cy.visit(route);
        // Give it some time to redirect
        cy.wait(1000);
        cy.url().should('include', '/login');
      });
    });
  });

  describe('Forgot Password', () => {
    it('should load forgot password page', () => {
      cy.visit('/forgot-password');
      // Wait a bit for the page to load
      cy.wait(1000);
      // Look for any text that indicates it's the forgot password page
      cy.get('body').should('contain.text', 'password');
      cy.get('input[type="email"]').should('be.visible');
    });

    it('should navigate back to login', () => {
      cy.visit('/forgot-password');
      // Look for the "Back to login" link
      cy.contains('Back to login').click();
      cy.url().should('include', '/login');
    });
  });
});
