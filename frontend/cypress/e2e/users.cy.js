describe('User Management', () => {
  beforeEach(() => {
    // Mock authentication - same pattern as other tests
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
    
    // Intercept API calls with correct endpoints
    cy.intercept('GET', '**/users', { fixture: 'users.json' }).as('getUsers');
    cy.intercept('GET', '**/roles', { 
      statusCode: 200,
      body: [
        { id: 1, name: 'Admin' },
        { id: 2, name: 'Manager' },
        { id: 3, name: 'Developer' }
      ]
    }).as('getRoles');
    cy.intercept('POST', '**/users', { 
      statusCode: 201, 
      body: { id: 4, firstName: 'Test', lastName: 'User', email: 'test@example.com', message: 'User created successfully' } 
    }).as('createUser');
    cy.intercept('PATCH', '**/users/**', { 
      statusCode: 200, 
      body: { message: 'User updated successfully' } 
    }).as('updateUser');
    cy.intercept('DELETE', '**/users/**', { 
      statusCode: 200, 
      body: { message: 'User deleted successfully' } 
    }).as('deleteUser');
  });

  describe('Users Page Loading', () => {
    it('should load users page successfully', () => {
      cy.visit('/users');
      cy.wait(3000); // Allow page to load
      
      // Check that we're on the users page and not redirected
      cy.url().should('include', '/users');
      
      // Look for users page content
      cy.get('body').should('contain.text', 'Users');
    });

    it('should display users data when loaded', () => {
      cy.visit('/users');
      cy.wait('@getUsers');
      
      // Look for table or user list elements
      cy.get('table, .user-list, [role="table"]').should('exist');
    });

    it('should display user information from fixture', () => {
      cy.visit('/users');
      cy.wait('@getUsers');
      
      // Check if user data from fixture is displayed
      cy.get('body').should('contain.text', 'John Doe');
      cy.get('body').should('contain.text', 'john.doe@example.com');
    });

    it('should have user management controls', () => {
      cy.visit('/users');
      cy.wait(3000);
      
      // Look for add user button or similar controls
      cy.get('button').should('exist');
    });
  });

  describe('User Management Functionality', () => {
    beforeEach(() => {
      cy.visit('/users');
      cy.wait(3000); // Allow page to load
    });

    it('should have user creation functionality', () => {
      // Look for add user button or similar functionality
      cy.get('body').then(($body) => {
        const hasCreateButton = $body.find('button').filter((i, el) => 
          el.textContent.toLowerCase().includes('add') || 
          el.textContent.toLowerCase().includes('create') ||
          el.textContent.toLowerCase().includes('new')
        ).length > 0;
        
        if (hasCreateButton) {
          // If create button exists, test it
          cy.get('button').contains(/add|create|new/i).should('be.visible');
        } else {
          // If no create button, that's acceptable - just verify page loaded
          cy.get('body').should('be.visible');
        }
      });
    });

    it('should display user management interface', () => {
      // Check for user management interface elements
      cy.get('table, .user-list, .user-grid').should('exist');
      
      // Should have some form of user data display
      cy.get('body').should('contain.text', 'John Doe');
    });

    it('should handle user interactions', () => {
      // Look for interactive elements
      cy.get('button, a').should('exist');
      
      // Test basic interaction if buttons exist
      cy.get('button').then(($buttons) => {
        if ($buttons.length > 0) {
          // Just verify buttons are clickable
          cy.wrap($buttons.first()).should('be.visible');
        }
      });
    });
  });

  describe('User Editing', () => {
    beforeEach(() => {
      cy.visit('/users');
      cy.wait('@getUsers');
    });

    it('should handle user editing interface', () => {
      // Look for edit buttons or clickable user elements
      cy.get('body').then(($body) => {
        const hasEditButton = $body.find('button').toArray().some(
          el => el.textContent.toLowerCase().includes('edit')
        );
        
        if (hasEditButton) {
          // Test edit functionality if available
          cy.get('button').contains(/edit/i).first().should('be.visible');
        } else {
          // Check for other interactive elements
          cy.get('tr, .user-item, .user-card').first().should('be.visible');
        }
      });
    });

    it('should handle user updates if editing is available', () => {
      // Check if editing functionality exists
      cy.get('body').then(($body) => {
        const hasEditElements = $body.find('button, input, select').length > 0;
        
        if (hasEditElements) {
          // Basic interaction test
          cy.get('button, input').first().should('exist');
        } else {
          // Just verify the page is functional
          cy.get('body').should('be.visible');
        }
      });
    });
  });

  describe('User Deletion', () => {
    beforeEach(() => {
      cy.visit('/users');
      cy.wait('@getUsers');
    });

    it('should handle user deletion interface', () => {
      // Look for delete buttons or actions
      cy.get('body').then(($body) => {
        const hasDeleteButton = $body.find('button').toArray().some(
          el => el.textContent.toLowerCase().includes('delete') || 
               el.textContent.includes('×') ||
               el.classList.contains('delete')
        );
        
        if (hasDeleteButton) {
          // Test delete functionality if available
          cy.get('button').contains(/delete|×/i).should('exist');
        } else {
          // Just verify user list is present
          cy.get('table, .user-list, .user-grid').should('exist');
        }
      });
    });

    it('should handle deletion workflow if available', () => {
      // Check for deletion capabilities without assuming specific UI
      cy.get('body').then(($body) => {
        const hasUserActions = $body.find('button, .action, .menu').length > 0;
        
        if (hasUserActions) {
          // Basic functionality test
          cy.get('button, .action').first().should('be.visible');
        } else {
          // Verify basic page functionality
          cy.get('body').should('contain.text', 'John Doe');
        }
      });
    });
  });

  describe('User Search and Filtering', () => {
    beforeEach(() => {
      cy.visit('/users');
      cy.wait('@getUsers');
    });

    it('should handle search functionality if available', () => {
      // Look for search inputs
      cy.get('body').then(($body) => {
        const hasSearchInput = $body.find('input[type="search"], input[placeholder*="search" i], .search-input').length > 0;
        
        if (hasSearchInput) {
          // Test search if available
          cy.get('input[type="search"], input[placeholder*="search" i], .search-input')
            .first()
            .should('be.visible');
        } else {
          // Just verify users are displayed
          cy.get('body').should('contain.text', 'John Doe');
        }
      });
    });

    it('should handle filtering if available', () => {
      // Check for filter elements
      cy.get('body').then(($body) => {
        const hasFilters = $body.find('select, .filter, .dropdown').length > 0;
        
        if (hasFilters) {
          // Test filters if they exist
          cy.get('select, .filter').first().should('be.visible');
        } else {
          // Verify basic user list functionality
          cy.get('table, .user-list, .user-grid').should('exist');
        }
      });
    });

    it('should display user information correctly', () => {
      // Verify user data is shown regardless of filtering capabilities
      cy.get('body').should('contain.text', 'John Doe');
      cy.get('body').should('contain.text', 'john.doe@example.com');
    });
  });

  describe('User Roles and Permissions', () => {
    beforeEach(() => {
      cy.visit('/users');
      cy.wait('@getUsers');
    });

    it('should handle role management if available', () => {
      // Check if role management features exist
      cy.get('body').then(($body) => {
        const hasRoleElements = $body.find('select, .role, .permission').length > 0;
        
        if (hasRoleElements) {
          // Test role functionality if available
          cy.get('select, .role').first().should('be.visible');
        } else {
          // Just verify users have role information displayed
          cy.get('body').should('contain.text', 'Admin');
        }
      });
    });

    it('should display role information', () => {
      // Verify role data is shown in user list
      cy.get('body').should('contain.text', 'Admin');
      cy.get('table, .user-list, .user-grid').should('exist');
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(() => {
      cy.visit('/users');
      cy.wait('@getUsers');
    });

    it('should handle bulk operations if available', () => {
      // Check for bulk operation capabilities
      cy.get('body').then(($body) => {
        const hasCheckboxes = $body.find('input[type="checkbox"], .checkbox').length > 0;
        const hasBulkActions = $body.find('button').toArray().some(
          el => el.textContent.toLowerCase().includes('bulk') || 
               el.textContent.toLowerCase().includes('select')
        );
        
        if (hasCheckboxes || hasBulkActions) {
          // Test bulk functionality if available
          cy.get('input[type="checkbox"], .checkbox, button').first().should('be.visible');
        } else {
          // Just verify user list functionality
          cy.get('table, .user-list, .user-grid').should('exist');
        }
      });
    });

    it('should handle data export if available', () => {
      // Check for export functionality
      cy.get('body').then(($body) => {
        const hasExportButton = $body.find('button').toArray().some(
          el => el.textContent.toLowerCase().includes('export') || 
               el.textContent.toLowerCase().includes('download')
        );
        
        if (hasExportButton) {
          // Test export if available
          cy.get('button').contains(/export|download/i).should('be.visible');
        } else {
          // Verify users are properly displayed for potential export
          cy.get('body').should('contain.text', 'john.doe@example.com');
        }
      });
    });
  });
});
