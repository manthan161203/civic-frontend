/**
 * React view of the network state held in `@/api/networkStatus`.
 *
 *   const { isOffline, isSlow, isRetrying, isConnected, type } = useNetworkStatus();
 *
 * Merges what the OS reports about the radio with what the transport observes
 * about actual requests — see the module docstring there for why one signal
 * alone is not enough.
 */

import { useSyncExternalStore, useCallback } from 'react';
import {
  subscribeToNetwork,
  getNetworkState,
  waitForConnection,
} from '../api/networkStatus';

/**
 * @typedef {import('../api/networkStatus').NetworkState} NetworkState
 */

/**
 * @returns {NetworkState & {
 *   isRetrying: boolean,
 *   isDegraded: boolean,
 *   waitForConnection: (timeoutMs?: number) => Promise<boolean>,
 * }}
 */
export function useNetworkStatus() {
  // useSyncExternalStore rather than useState + useEffect: it subscribes during
  // render, so a change between first render and effect commit cannot be
  // missed, and it is tear-free under concurrent rendering.
  const state = useSyncExternalStore(subscribeToNetwork, getNetworkState, getNetworkState);

  const wait = useCallback((timeoutMs) => waitForConnection(timeoutMs), []);

  return {
    ...state,
    isRetrying: state.pendingRetries > 0,
    /** Online, but not working well — worth telling the user before they retry. */
    isDegraded: !state.isOffline && (state.isSlow || state.pendingRetries > 0),
    waitForConnection: wait,
  };
}

export default useNetworkStatus;
