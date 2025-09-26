/// <reference types="cypress" />
/// <reference types="mocha" />

// Ensure Cypress and Mocha globals are available
declare namespace Cypress {
    interface Chainable {
        // Add any custom commands you might create later
    }
}

// Mocha globals (used by Cypress)
declare const describe: Mocha.SuiteFunction;
declare const it: Mocha.TestFunction;
declare const beforeEach: Mocha.HookFunction;
declare const afterEach: Mocha.HookFunction;
declare const before: Mocha.HookFunction;
declare const after: Mocha.HookFunction;

// Cypress globals
declare const cy: Cypress.cy;
declare const Cypress: Cypress.Cypress;
declare const expect: Chai.ExpectStatic;
declare const assert: Chai.AssertStatic;
