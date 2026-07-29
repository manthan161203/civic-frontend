// jest.setup.js
// Jest setup and global test configuration

import '@testing-library/jest-dom';

/* ── Browser APIs jsdom does not implement ─────────────────────────────────
 *
 * Needed now that components are tested, not just pure modules:
 *
 *   matchMedia      — Recharts calls it on mount
 *   ResizeObserver  — Recharts' ResponsiveContainer, and anything measuring
 *   scrollIntoView  — focus management inside Modal
 *
 * Without these the failure is a bare "not a function" from deep inside a
 * vendor bundle, which points nowhere near the test that triggered it.
 */
global.matchMedia =
  global.matchMedia ||
  ((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

global.ResizeObserver =
  global.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}

/* ── next/navigation ────────────────────────────────────────────────────────
 * Screen tests render components that call useSearchParams/useRouter, which
 * throw outside the App Router runtime.
 */
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

/* ── localStorage ───────────────────────────────────────────────────────────
 * A real in-memory implementation rather than bare jest.fn()s. The token store
 * in src/api/http.js writes then reads back; with mocks that always return
 * undefined, a test can pass while the code under test is broken.
 */
const store = new Map();
global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};

beforeEach(() => store.clear());

// Mock window.location
delete window.location;
window.location = {
  href: '',
  pathname: '',
  search: '',
  hash: '',
  reload: jest.fn(),
};

// Suppress a known React warning that is not actionable here.
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
