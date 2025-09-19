describe('User Management', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', 'mock-token');
    });
    
    // Intercept API calls
    cy.intercept('GET', '**/api/users/**', { fixture: 'users.json' }).as('getUsers');
    cy.intercept('POST', '**/api/users/**', { 
      statusCode: 201, 
      body: { id: 4, message: 'User created successfully' } 
    }).as('createUser');
    cy.intercept('PUT', '**/api/users/**', { 
      statusCode: 200, 
      body: { message: 'User updated successfully' } 
    }).as('updateUser');
    cy.intercept('DELETE', '**/api/users/**', { 
      statusCode: 200, 
      body: { message: 'User deleted successfully' } 
    }).as('deleteUser');
  });

  describe('Users Page Loading', () => {
    it('should load users page successfully', () => {
      cy.visit('/users');
      cy.contains('Users').should('be.visible');
      cy.wait('@getUsers');
    });

    it('should display users in table format', () => {
      cy.visit('/users');
      cy.wait('@getUsers');
      
      cy.get('[data-testid="users-table"]').should('be.visible');
      cy.get('[data-testid="user-row"]').should('have.length.greaterThan', 0);
    });

    it('should display user information correctly', () => {
      cy.visit('/users');
      cy.wait('@getUsers');
      
      // Check if user data is displayed
      cy.contains('John Doe').should('be.visible');
      cy.contains('john.doe@example.com').should('be.visible');
      cy.contains('Manager').should('be.visible');
    });
  });

  describe('User Creation', () => {
    beforeEach(() => {
      cy.visit('/users');
      cy.wait('@getUsers');
    });

    it('should open user creation modal', () => {
      cy.get('[data-testid="create-user-btn"]').click();
      cy.get('[data-testid="user-modal"]').should('be.visible');
      cy.contains('Create User').should('be.visible');
    });

    it('should create new user with valid data', () => {
      cy.get('[data-testid="create-user-btn"]').click();
      
      cy.get('[data-testid="user-name"]').type('Test User');
      cy.get('[data-testid="user-email"]').type('test.user@example.com');
      cy.get('[data-testid="user-role"]').select('Developer');
      cy.get('[data-testid="user-password"]').type('password123');
      
      cy.get('[data-testid="save-user"]').click();
      cy.wait('@createUser');
      
      cy.contains('User created successfully').should('be.visible');
      cy.get('[data-testid="user-modal"]').should('not.exist');
    });

    it('should validate required fields', () => {
      cy.get('[data-testid="create-user-btn"]').click();
      cy.get('[data-testid="save-user"]').click();
      
      cy.contains('Name is required').should('be.visible');
      cy.contains('Email is required').should('be.visible');
      cy.contains('Role is required').should('be.visible');
    });

    it('should validate email format', () => {
      cy.get('[data-testid="create-user-btn"]').click();
      
      cy.get('[data-testid="user-name"]').type('Test User');
      cy.get('[data-testid="user-email"]').type('invalid-email');
      cy.get('[data-testid="save-user"]').click();
      
      cy.contains('Please enter a valid email').should('be.visible');
    });

    it('should validate password strength', () => {
      cy.get('[data-testid="create-user-btn"]').click();
      
      cy.get('[data-testid="user-name"]').type('Test User');
      cy.get('[data-testid="user-email"]').type('test@example.com');
      cy.get('[data-testid="user-password"]').type('123');
      cy.get('[data-testid="save-user"]').click();
      
      cy.contains('Password must be at least 6 characters').should('be.visible');
    });
  });

  describe('User Editing', () => {
    beforeEach(() => {
      cy.visit('/users');
      cy.wait('@getUsers');
    });

    it('should open user edit modal', () => {
      cy.get('[data-testid="edit-user-btn"]').first().click();
      cy.get('[data-testid="user-modal"]').should('be.visible');
      cy.contains('Edit User').should('be.visible');
    });

    it('should update user information', () => {
      cy.get('[data-testid="edit-user-btn"]').first().click();
      
      cy.get('[data-testid="user-name"]').clear().type('Updated User Name');
      cy.get('[data-testid="user-role"]').select('Senior Developer');
      
      cy.get('[data-testid="save-user"]').click();
      cy.wait('@updateUser');
      
      cy.contains('User updated successfully').should('be.visible');
    });

    it('should not allow editing email', () => {
      cy.get('[data-testid="edit-user-btn"]').first().click();
      cy.get('[data-testid="user-email"]').should('be.disabled');
    });
  });

  describe('User Deletion', () => {
    beforeEach(() => {
      cy.visit('/users');
      cy.wait('@getUsers');
    });

    it('should show delete confirmation modal', () => {
      cy.get('[data-testid="delete-user-btn"]').first().click();
      cy.get('[data-testid="delete-confirmation"]').should('be.visible');
      cy.contains('Are you sure you want to delete this user?').should('be.visible');
    });

    it('should delete user after confirmation', () => {
      cy.get('[data-testid="delete-user-btn"]').first().click();
      cy.get('[data-testid="confirm-delete"]').click();
      cy.wait('@deleteUser');
      
      cy.contains('User deleted successfully').should('be.visible');
    });

    it('should cancel deletion', () => {
      cy.get('[data-testid="delete-user-btn"]').first().click();
      cy.get('[data-testid="cancel-delete"]').click();
      cy.get('[data-testid="delete-confirmation"]').should('not.exist');
    });
  });

  describe('User Search and Filtering', () => {
    beforeEach(() => {
      cy.visit('/users');
      cy.wait('@getUsers');
    });

    it('should search users by name', () => {
      cy.get('[data-testid="user-search"]').type('John');
      cy.get('[data-testid="user-row"]').should('contain', 'John Doe');
    });

    it('should filter users by role', () => {
      cy.get('[data-testid="role-filter"]').select('Manager');
      cy.get('[data-testid="user-row"]').should('contain', 'Manager');
    });

    it('should filter users by status', () => {
      cy.get('[data-testid="status-filter"]').select('Active');
      cy.get('[data-testid="user-row"]').each(($row) => {
        cy.wrap($row).should('contain', 'active');
      });
    });

    it('should clear all filters', () => {
      cy.get('[data-testid="user-search"]').type('John');
      cy.get('[data-testid="role-filter"]').select('Manager');
      cy.get('[data-testid="clear-filters"]').click();
      
      cy.get('[data-testid="user-search"]').should('have.value', '');
      cy.get('[data-testid="role-filter"]').should('have.value', '');
    });
  });

  describe('User Roles and Permissions', () => {
    beforeEach(() => {
      cy.visit('/users');
      cy.wait('@getUsers');
    });

    it('should display available roles', () => {
      cy.get('[data-testid="create-user-btn"]').click();
      cy.get('[data-testid="user-role"]').click();
      
      cy.contains('Admin').should('be.visible');
      cy.contains('Manager').should('be.visible');
      cy.contains('Developer').should('be.visible');
      cy.contains('Viewer').should('be.visible');
    });

    it('should show role permissions on hover', () => {
      cy.get('[data-testid="role-info"]').first().trigger('mouseover');
      cy.get('[data-testid="role-tooltip"]').should('be.visible');
      cy.contains('Can manage users and events').should('be.visible');
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(() => {
      cy.visit('/users');
      cy.wait('@getUsers');
    });

    it('should select multiple users', () => {
      cy.get('[data-testid="user-checkbox"]').eq(0).check();
      cy.get('[data-testid="user-checkbox"]').eq(1).check();
      
      cy.get('[data-testid="selected-count"]').should('contain', '2 selected');
    });

    it('should bulk delete selected users', () => {
      cy.get('[data-testid="user-checkbox"]').eq(0).check();
      cy.get('[data-testid="user-checkbox"]').eq(1).check();
      
      cy.get('[data-testid="bulk-delete"]').click();
      cy.get('[data-testid="confirm-bulk-delete"]').click();
      
      cy.contains('Users deleted successfully').should('be.visible');
    });

    it('should export user data', () => {
      cy.get('[data-testid="export-users"]').click();
      cy.get('[data-testid="export-format"]').select('CSV');
      cy.get('[data-testid="confirm-export"]').click();
      
      // Check if download started (implementation depends on your app)
      cy.contains('Export started').should('be.visible');
    });
  });
});
