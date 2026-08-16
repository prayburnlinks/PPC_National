/**
 * Stand-in for firebase/functions in tests.
 *
 * The real package ships ESM that expects browser globals, which the Node test
 * environment does not provide — importing it fails any suite that reaches
 * authService. Mapped in jest.config.js, the same way firebase-config is.
 *
 * Suites that need to drive the callable (see authService.phoneSignIn.test.js)
 * override this with their own jest.mock factory.
 */

export const getFunctions = jest.fn(() => ({}));
export const httpsCallable = jest.fn(() => jest.fn());
