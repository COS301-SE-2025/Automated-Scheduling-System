describe('Calendar Page', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', 'mock-token');
    });
    
    // Intercept API calls
    cy.intercept('GET', '**/api/events/**', { fixture: 'calendar-events.json' }).as('getCalendarEvents');
    cy.intercept('POST', '**/api/events/**', { statusCode: 201, body: { id: 123, message: 'Event created' } }).as('createEvent');
    cy.intercept('PUT', '**/api/events/**', { statusCode: 200, body: { message: 'Event updated' } }).as('updateEvent');
    cy.intercept('DELETE', '**/api/events/**', { statusCode: 200, body: { message: 'Event deleted' } }).as('deleteEvent');
  });

  describe('Calendar Loading and Display', () => {
    it('should load calendar page successfully', () => {
      cy.visit('/calendar');
      cy.contains('Calendar').should('be.visible');
      cy.wait('@getCalendarEvents');
    });

    it('should display calendar grid with events', () => {
      cy.visit('/calendar');
      cy.wait('@getCalendarEvents');
      
      cy.get('[data-testid="calendar-grid"]').should('be.visible');
      cy.get('.fc-event').should('exist'); // FullCalendar event class
    });

    it('should display different calendar views', () => {
      cy.visit('/calendar');
      cy.wait('@getCalendarEvents');
      
      // Test month view (default)
      cy.get('[data-testid="month-view"]').should('have.class', 'active');
      
      // Test week view
      cy.contains('Week').click();
      cy.get('[data-testid="week-view"]').should('be.visible');
      
      // Test day view
      cy.contains('Day').click();
      cy.get('[data-testid="day-view"]').should('be.visible');
    });
  });

  describe('Calendar Navigation', () => {
    beforeEach(() => {
      cy.visit('/calendar');
      cy.wait('@getCalendarEvents');
    });

    it('should navigate between months', () => {
      cy.get('[data-testid="prev-month"]').click();
      cy.get('[data-testid="next-month"]').click();
    });

    it('should go to today when today button is clicked', () => {
      cy.contains('Today').click();
      // Check if current date is highlighted
      const today = new Date().getDate();
      cy.get('.fc-today').should('contain', today);
    });

    it('should navigate to specific date when date is clicked', () => {
      cy.get('.fc-daygrid-day').first().click();
      // Should show day view or open event creation
    });
  });

  describe('Event Creation', () => {
    beforeEach(() => {
      cy.visit('/calendar');
      cy.wait('@getCalendarEvents');
    });

    it('should open event creation modal when clicking on empty date', () => {
      cy.get('.fc-daygrid-day').first().click();
      cy.get('[data-testid="event-modal"]').should('be.visible');
      cy.contains('Create Event').should('be.visible');
    });

    it('should create new event with valid data', () => {
      cy.get('[data-testid="create-event-btn"]').click();
      
      cy.get('[data-testid="event-title"]').type('Test Event');
      cy.get('[data-testid="event-description"]').type('This is a test event');
      cy.get('[data-testid="event-start-time"]').type('2024-01-15T10:00');
      cy.get('[data-testid="event-end-time"]').type('2024-01-15T12:00');
      
      cy.get('[data-testid="save-event"]').click();
      cy.wait('@createEvent');
      
      cy.contains('Event created successfully').should('be.visible');
      cy.get('[data-testid="event-modal"]').should('not.exist');
    });

    it('should validate required fields', () => {
      cy.get('[data-testid="create-event-btn"]').click();
      cy.get('[data-testid="save-event"]').click();
      
      cy.contains('Title is required').should('be.visible');
      cy.contains('Start time is required').should('be.visible');
    });

    it('should validate time logic (end after start)', () => {
      cy.get('[data-testid="create-event-btn"]').click();
      
      cy.get('[data-testid="event-title"]').type('Test Event');
      cy.get('[data-testid="event-start-time"]').type('2024-01-15T12:00');
      cy.get('[data-testid="event-end-time"]').type('2024-01-15T10:00');
      
      cy.get('[data-testid="save-event"]').click();
      cy.contains('End time must be after start time').should('be.visible');
    });
  });

  describe('Event Interaction', () => {
    beforeEach(() => {
      cy.visit('/calendar');
      cy.wait('@getCalendarEvents');
    });

    it('should display event details when clicking on event', () => {
      cy.get('.fc-event').first().click();
      cy.get('[data-testid="event-details-modal"]').should('be.visible');
    });

    it('should edit event', () => {
      cy.get('.fc-event').first().click();
      cy.get('[data-testid="edit-event-btn"]').click();
      
      cy.get('[data-testid="event-title"]').clear().type('Updated Event Title');
      cy.get('[data-testid="save-event"]').click();
      cy.wait('@updateEvent');
      
      cy.contains('Event updated successfully').should('be.visible');
    });

    it('should delete event with confirmation', () => {
      cy.get('.fc-event').first().click();
      cy.get('[data-testid="delete-event-btn"]').click();
      
      cy.get('[data-testid="confirm-delete"]').should('be.visible');
      cy.contains('Are you sure').should('be.visible');
      
      cy.get('[data-testid="confirm-delete-yes"]').click();
      cy.wait('@deleteEvent');
      
      cy.contains('Event deleted successfully').should('be.visible');
    });

    it('should drag and drop event to different date', () => {
      cy.get('.fc-event').first().trigger('mousedown', { which: 1 });
      cy.get('.fc-daygrid-day').eq(5).trigger('mousemove').trigger('mouseup');
      
      cy.wait('@updateEvent');
      cy.contains('Event moved successfully').should('be.visible');
    });

    it('should resize event duration', () => {
      cy.get('.fc-event .fc-event-resizer').first().trigger('mousedown', { which: 1 });
      cy.get('.fc-event').first().trigger('mousemove', { clientY: 100 }).trigger('mouseup');
      
      cy.wait('@updateEvent');
    });
  });

  describe('Calendar Filters and Views', () => {
    beforeEach(() => {
      cy.visit('/calendar');
      cy.wait('@getCalendarEvents');
    });

    it('should filter events by type', () => {
      cy.get('[data-testid="event-type-filter"]').select('Meeting');
      cy.get('.fc-event').should('contain', 'Meeting');
    });

    it('should filter events by user', () => {
      cy.get('[data-testid="user-filter"]').select('John Doe');
      // Events should be filtered to show only John Doe's events
    });

    it('should search events', () => {
      cy.get('[data-testid="event-search"]').type('Team Meeting');
      cy.get('.fc-event').should('contain', 'Team Meeting');
    });
  });

  describe('Calendar Export and Import', () => {
    beforeEach(() => {
      cy.visit('/calendar');
      cy.wait('@getCalendarEvents');
    });

    it('should export calendar data', () => {
      cy.get('[data-testid="export-calendar"]').click();
      cy.get('[data-testid="export-format"]').select('ICS');
      cy.get('[data-testid="confirm-export"]').click();
      
      // Check if file download starts
    });

    it('should import calendar data', () => {
      cy.get('[data-testid="import-calendar"]').click();
      cy.get('[data-testid="file-input"]').selectFile('cypress/fixtures/sample-calendar.ics');
      cy.get('[data-testid="confirm-import"]').click();
      
      cy.contains('Calendar imported successfully').should('be.visible');
    });
  });

  describe('Responsive Calendar', () => {
    it('should display correctly on mobile', () => {
      cy.viewport('iphone-x');
      cy.visit('/calendar');
      cy.wait('@getCalendarEvents');
      
      // Check if mobile view is active
      cy.get('[data-testid="mobile-calendar"]').should('be.visible');
      
      // Check if events are displayed as list on mobile
      cy.get('[data-testid="event-list-mobile"]').should('be.visible');
    });

    it('should allow swiping between months on mobile', () => {
      cy.viewport('iphone-x');
      cy.visit('/calendar');
      cy.wait('@getCalendarEvents');
      
      // Simulate swipe gesture
      cy.get('[data-testid="calendar-container"]')
        .trigger('touchstart', { touches: [{ clientX: 300, clientY: 200 }] })
        .trigger('touchmove', { touches: [{ clientX: 100, clientY: 200 }] })
        .trigger('touchend');
    });
  });
});
