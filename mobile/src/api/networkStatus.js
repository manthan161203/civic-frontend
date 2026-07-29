/**
 * Network state, from two independent sources.
 *
 * **NetInfo** tells you what the OS believes about the radio: is there an
 * interface, does it claim internet reachability, is it wifi or cellular.
 *
 * **The transport** tells you what actually happened: did the last request
 * succeed, is one being retried, has one been running long enough to look
 * stuck.
 *
 * Both matter, and neither is sufficient. NetInfo happily reports `connected`
 * on a captive-portal wifi that drops every request; conversely a single failed
 * request does not mean the device is offline. The old `OfflineBanner` used only
 * the second signal — it registered its own axios interceptor and inferred
 * offline from any response-less error — so it could not distinguish "no
 * network" from "the server is down", and it stayed up until the next
 * successful request rather than until connectivity returned.
 *
 * This module holds the merged state; `useNetworkStatus` is the React view of
 * it.
 */

import NetInfo from '@react-native-community/netinfo';
import { SLOW_REQUEST_MS } from '../config/env';

/**
 * @typedef {object} NetworkState
 * @property {boolean} isConnected        the OS reports an active interface
 * @property {boolean|null} isInternetReachable  OS reachability probe; null = unknown
 * @property {string|null} type           'wifi' | 'cellular' | 'none' | …
 * @property {boolean} isOffline          nothing will succeed right now
 * @property {boolean} isSlow             a request has been running past SLOW_REQUEST_MS
 * @property {number} pendingRetries      requests currently being retried
 * @property {number|null} lastFailureAt  epoch ms of the last network-level failure
 */

/** @type {NetworkState} */
let state = {
  isConnected: true,
  isInternetReachable: null,
  type: null,
  isOffline: false,
  isSlow: false,
  pendingRetries: 0,
  lastFailureAt: null,
};

/** @type {Set<(s: NetworkState) => void>} */
const listeners = new Set();

function emit() {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch (err) {
      console.error('[network] listener threw', err);
    }
  }
}

function update(patch) {
  const next = { ...state, ...patch };

  // `isInternetReachable` is null until the OS has probed. Treating unknown as
  // offline would flash a banner on every cold start, so only an explicit
  // false counts.
  next.isOffline = !next.isConnected || next.isInternetReachable === false;

  const changed = Object.keys(next).some((k) => next[k] !== state[k]);
  state = next;
  if (changed) emit();
}

/** @returns {NetworkState} */
export const getNetworkState = () => state;

/**
 * Subscribe to network state.
 * @param {(s: NetworkState) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeToNetwork(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/* ── OS-level connectivity ───────────────────────────────────────────────── */

let netInfoUnsubscribe = null;

/** Begin listening to NetInfo. Called once, from the root layout. */
export function startNetworkMonitoring() {
  if (netInfoUnsubscribe) return netInfoUnsubscribe;

  netInfoUnsubscribe = NetInfo.addEventListener((s) => {
    update({
      isConnected: Boolean(s.isConnected),
      isInternetReachable: s.isInternetReachable,
      type: s.type,
    });
  });

  // addEventListener fires on subscribe on some platforms but not all; fetch
  // once so the first render is not built on the optimistic default.
  NetInfo.fetch().then((s) =>
    update({
      isConnected: Boolean(s.isConnected),
      isInternetReachable: s.isInternetReachable,
      type: s.type,
    }),
  );

  return netInfoUnsubscribe;
}

export function stopNetworkMonitoring() {
  netInfoUnsubscribe?.();
  netInfoUnsubscribe = null;
}

/* ── Transport-level signals ─────────────────────────────────────────────── */

/*
 * Counters rather than booleans, because several requests are usually in
 * flight. A single one finishing must not clear a banner that another is still
 * justifying.
 */

let inFlight = 0;
/** @type {ReturnType<typeof setTimeout> | null} */
let slowTimer = null;

/** Called by the transport when a request starts. */
export function noteRequestStarted() {
  inFlight += 1;
  if (inFlight === 1 && !slowTimer) {
    slowTimer = setTimeout(() => {
      // Still waiting after SLOW_REQUEST_MS — say so rather than leaving the
      // user staring at a spinner that looks identical to a hang.
      if (inFlight > 0) update({ isSlow: true });
    }, SLOW_REQUEST_MS);
  }
}

/**
 * Called by the transport when a request settles.
 * @param {{ ok: boolean, isNetworkFailure?: boolean }} result
 */
export function noteRequestFinished({ ok, isNetworkFailure = false }) {
  inFlight = Math.max(0, inFlight - 1);

  if (inFlight === 0) {
    if (slowTimer) {
      clearTimeout(slowTimer);
      slowTimer = null;
    }
    update({ isSlow: false });
  }

  if (isNetworkFailure) {
    update({ lastFailureAt: Date.now() });
  } else if (ok) {
    // A success proves reachability regardless of what NetInfo thinks — this is
    // what recovers from a captive portal that NetInfo reported as connected.
    update({ lastFailureAt: null, isConnected: true, isInternetReachable: true });
  }
}

/** Called when the transport begins a backoff retry. */
export function noteRetryStarted() {
  update({ pendingRetries: state.pendingRetries + 1 });
}

/** Called when a retry cycle ends, whatever the outcome. */
export function noteRetryFinished() {
  update({ pendingRetries: Math.max(0, state.pendingRetries - 1) });
}

/**
 * Resolve once the device is back online, or after `timeoutMs`.
 *
 * Lets the offline queue wait for connectivity instead of polling.
 *
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>} true if connectivity returned
 */
export function waitForConnection(timeoutMs = 60_000) {
  if (!state.isOffline) return Promise.resolve(true);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, timeoutMs);

    const unsubscribe = subscribeToNetwork((s) => {
      if (!s.isOffline) {
        clearTimeout(timer);
        unsubscribe();
        resolve(true);
      }
    });
  });
}
