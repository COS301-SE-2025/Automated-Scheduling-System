/// <reference types="cypress" />

// Helper functions for common test operations

// Login helper
function loginUser(email, password) {
  cy.visit('/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('form').submit();
  cy.url().should('include', '/dashboard');
}

// Mock auth helper
function mockAuthentication(token = 'mock-token') {
  cy.window().its('localStorage').invoke('setItem', 'authToken', token);
}

// Clean state helper
function cleanSlate() {
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.window().its('sessionStorage').invoke('clear');
}

// Export helpers for use in tests
(window as any).testHelpers = {
  loginUser,
  mockAuthentication,
  cleanSlate
};
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }