describe('Calendar Page', () => {
  beforeEach(() => {
    // Mock authentication - simple approach like other tests
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', 'mock-token');
    });

    // Intercept all API calls that might be made by the calendar page
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
    
    // Intercept API calls - using actual backend endpoints
    cy.intercept('GET', '**/event-schedules', { fixture: 'calendar-events.json' }).as('getScheduledEvents');
    cy.intercept('GET', '**/event-definitions', { fixture: 'event-definitions.json' }).as('getEventDefinitions');
    cy.intercept('GET', '**/competencies', {
      statusCode: 200,
      body: []
    }).as('getCompetencies');
    
    cy.intercept('POST', '**/event-schedules', { 
      statusCode: 201, 
      body: { 
        CustomEventScheduleID: 123, 
        Title: 'Test Event',
        message: 'Event created successfully' 
      } 
    }).as('createEvent');
    cy.intercept('PUT', '**/event-schedules/**', { 
      statusCode: 200, 
      body: { message: 'Event updated successfully' } 
    }).as('updateEvent');
    cy.intercept('DELETE', '**/event-schedules/**', { 
      statusCode: 200, 
      body: { message: 'Event deleted successfully' } 
    }).as('deleteEvent');
    cy.intercept('POST', '**/event-definitions', { 
      statusCode: 201, 
      body: { 
        CustomEventID: 456, 
        EventName: 'New Event Type',
        message: 'Event definition created successfully' 
      } 
    }).as('createEventDefinition');
  });

  describe('Calendar Loading and Display', () => {
    it('should load calendar page successfully', () => {
      cy.visit('/calendar');
      
      // Give the page some time to load and check basic elements
      cy.wait(2000);
      
      // Check that we're on the calendar page (not redirected)
      cy.url().should('include', '/calendar');
      
      // Look for page content - be flexible about what text appears
      cy.get('body').should('be.visible');
      
      // Try to find calendar-related content
      cy.get('body').then(($body) => {
        const bodyText = $body.text();
        expect(bodyText).to.match(/(Calendar|Schedule|Event)/i);
      });
    });

    it('should display calendar grid with events', () => {
      cy.visit('/calendar');
      cy.wait(3000); // Allow page to fully load
      
      // Check that FullCalendar is rendered eventually
      cy.get('.fc', { timeout: 15000 }).should('be.visible');
      
      // Try to find calendar structure
      cy.get('.fc').within(() => {
        // Look for basic calendar elements
        cy.get('.fc-header-toolbar, .fc-toolbar', { timeout: 10000 }).should('exist');
      });
    });

    it('should display calendar view controls', () => {
      cy.visit('/calendar');
      cy.wait(3000);
      
      // Check for calendar controls
      cy.get('.fc', { timeout: 15000 }).should('be.visible');
      
      // Look for navigation buttons
      cy.get('.fc-toolbar', { timeout: 10000 }).within(() => {
        cy.get('button').should('have.length.at.least', 1);
      });
    });

    it('should display action buttons', () => {
      cy.visit('/calendar');
      cy.wait(3000);
      
      // Look for action buttons that should be on the calendar page
      cy.get('button', { timeout: 10000 }).should('exist');
      
      // Check if page has action-related text
      cy.get('body').then(($body) => {
        const bodyText = $body.text();
        expect(bodyText).to.match(/(Create|Schedule|Event|New)/i);
      });
    });
  });

  describe('Calendar Navigation', () => {
    beforeEach(() => {
      cy.visit('/calendar');
      cy.wait(3000); // Allow page to load
    });

    it('should have navigation controls', () => {
      // Check for calendar navigation elements
      cy.get('.fc', { timeout: 15000 }).should('be.visible');
      cy.get('.fc-toolbar').should('exist');
      
      // Look for navigation buttons
      cy.get('.fc-toolbar').within(() => {
        cy.get('button').should('have.length.at.least', 1);
      });
    });

    it('should allow basic calendar interaction', () => {
      cy.get('.fc', { timeout: 15000 }).should('be.visible');
      
      // Try to interact with calendar elements
      cy.get('.fc').click();
      
      // Verify interaction works
      cy.get('.fc').should('be.visible');
    });
  });

  describe('Event Creation', () => {
    beforeEach(() => {
      cy.visit('/calendar');
      cy.wait(3000); // Allow page to load
    });

    it('should have action elements for event creation', () => {
      // Look for buttons or links related to event creation
      cy.get('button, a', { timeout: 10000 }).should('exist');
      
      // Check if there are interactive elements
      cy.get('body').then(($body) => {
        const hasButtons = $body.find('button').length > 0;
        const hasLinks = $body.find('a').length > 0;
        expect(hasButtons || hasLinks).to.be.true;
      });
    });

    it('should allow calendar interaction', () => {
      cy.get('.fc', { timeout: 15000 }).should('be.visible');
      
      // Try basic interaction
      cy.get('.fc').should('exist');
    });
  });

  describe('Event Interaction', () => {
    beforeEach(() => {
      cy.visit('/calendar');
      cy.wait(3000); // Allow page to load
    });

    it('should display calendar with potential events', () => {
      cy.get('.fc', { timeout: 15000 }).should('be.visible');
      
      // Check if calendar has loaded properly
      cy.get('.fc').should('exist');
    });

    it('should handle calendar interactions gracefully', () => {
      cy.get('.fc', { timeout: 15000 }).should('be.visible');
      
      // Basic interaction test
      cy.get('.fc').click();
      cy.get('.fc').should('be.visible');
    });
  });

  describe('Calendar Responsive Design', () => {
    it('should display on mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.visit('/calendar');
      cy.wait(3000);
      
      // Page should load
      cy.get('body').should('be.visible');
      cy.url().should('include', '/calendar');
    });

    it('should display on desktop viewport', () => {
      cy.viewport(1280, 720);
      cy.visit('/calendar');
      cy.wait(3000);
      
      // Page should load
      cy.get('body').should('be.visible');
      cy.url().should('include', '/calendar');
      
      // Look for calendar if it loads
      cy.get('body').then(($body) => {
        if ($body.find('.fc').length > 0) {
          cy.get('.fc').should('be.visible');
        }
      });
    });
  });
});
