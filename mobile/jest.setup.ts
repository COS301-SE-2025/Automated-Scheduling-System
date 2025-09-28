import '@testing-library/jest-native/extend-expect';
import { setImmediate } from 'timers';

// Increase default Jest test timeout to 30s for slower async flows
jest.setTimeout(30000);

// Silence noisy logs during tests
jest.spyOn(global.console, 'log').mockImplementation(() => {});
jest.spyOn(global.console, 'warn').mockImplementation(() => {});
jest.spyOn(global.console, 'error').mockImplementation(() => {});

// Polyfills
if (!global.setImmediate) {
  // @ts-ignore
  global.setImmediate = setImmediate;
}
