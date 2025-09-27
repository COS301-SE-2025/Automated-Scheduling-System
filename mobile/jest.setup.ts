import '@testing-library/jest-native/extend-expect';
import { setImmediate } from 'timers';

// Silence noisy logs during tests
jest.spyOn(global.console, 'log').mockImplementation(() => {});
jest.spyOn(global.console, 'warn').mockImplementation(() => {});
jest.spyOn(global.console, 'error').mockImplementation(() => {});

// Polyfills
if (!global.setImmediate) {
  // @ts-ignore
  global.setImmediate = setImmediate;
}
