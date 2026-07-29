/**
 * Offline action queue.
 *
 * Workers lose signal constantly — basements, lift shafts, the inside of a
 * culvert. This holds the actions they take while disconnected and replays them
 * through `POST /sync` when connectivity returns.
 *
 * ── What this replaces ───────────────────────────────────────────────────────
 *
 * The app already contained 800-odd lines across three modules for this:
 * `src/utils/offlineSync.js`, `src/services/offlineSync.js` (near-duplicates of
 * each other) and `src/utils/offlineQueue.js`. **None of them was imported by
 * anything.** `src/api/sync.js` existed too, equally unused, so `POST /sync`
 * had never been called by the app at all. One of the orphans even imported
 * `@react-native-community/netinfo`, which was not in `package.json` — proof it
 * had never been bundled.
 *
 * This is one module, wired to real screens.
 *
 * ── What the backend accepts ─────────────────────────────────────────────────
 *
 * Five actions: `create_issue`, `accept_task`, `start_task`, `update_location`,
 * `add_note`. Anything else is rejected per-action, so `ACTIONS` below is the
 * whole vocabulary.
 *
 * `create_issue` is the citizen flow — a report composed with no signal. Photos
 * are multipart and cannot ride in a JSON batch, so they stay on the device
 * under `_local.photos` (stripped before sending) and are uploaded once the
 * server answers with the new issue's `resource_id`.
 *
 * Each entry carries a `client_id`; the backend deduplicates on
 * `(user_id, client_id)`, so replaying the same queue twice is safe.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncApi } from './sync';
import { subscribeToNetwork, getNetworkState } from './networkStatus';
import { toApiError } from './errors';

const STORAGE_KEY = '@civic/offline_queue';

/** The only actions `POST /sync` understands. */
export const ACTIONS = /** @type {const} */ ({
  CREATE_ISSUE: 'create_issue',
  ACCEPT_TASK: 'accept_task',
  START_TASK: 'start_task',
  UPDATE_LOCATION: 'update_location',
  ADD_NOTE: 'add_note',
});

const VALID_ACTIONS = new Set(Object.values(ACTIONS));

/**
 * Cap on stored actions.
 *
 * A worker offline for a full shift should not accumulate an unbounded queue
 * that then takes minutes to drain. Oldest entries are dropped first.
 */
const MAX_QUEUED = 200;

/** @type {Set<(count: number) => void>} */
const listeners = new Set();

/** Subscribe to the pending-action count. @param {(count: number) => void} fn */
export function subscribeToQueue(fn) {
  listeners.add(fn);
  getQueue().then((q) => fn(q.length));
  return () => listeners.delete(fn);
}

async function notify() {
  const queue = await getQueue();
  for (const fn of listeners) {
    try {
      fn(queue.length);
    } catch (err) {
      console.error('[offlineQueue] listener threw', err);
    }
  }
}

/**
 * @typedef {object} QueuedAction
 * @property {string} action
 * @property {string} [issue_id]
 * @property {Record<string, unknown>} payload
 * @property {string} timestamp  ISO 8601
 * @property {string} client_id  dedup key; the backend enforces uniqueness
 * @property {{ photos?: {uri: string}[] }} [_local]
 *   Device-only data, stripped before the batch is sent. Photos live here
 *   because they are multipart uploads and cannot travel in a JSON body.
 */

/** @returns {Promise<QueuedAction[]>} */
export async function getQueue() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt storage should not brick the app — start over.
    return [];
  }
}

/** @param {QueuedAction[]} queue */
async function writeQueue(queue) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  await notify();
}

/**
 * Stable, collision-resistant id without pulling in a uuid dependency.
 * Only has to be unique per user, which the backend keys on.
 */
function makeClientId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Queue an action for replay.
 *
 * @param {string} action one of `ACTIONS`
 * @param {{ issueId?: string, payload?: Record<string, unknown>,
 *           local?: Record<string, unknown> }} [options]
 *   `local` holds anything the server must not receive — currently the photo
 *   URIs for an offline report. It is stripped before the batch is sent.
 * @returns {Promise<QueuedAction>}
 */
export async function enqueue(action, { issueId, payload = {}, local } = {}) {
  if (!VALID_ACTIONS.has(action)) {
    throw new Error(
      `Unsupported offline action "${action}". The backend accepts: ${[...VALID_ACTIONS].join(', ')}`,
    );
  }

  const entry = {
    action,
    ...(issueId ? { issue_id: issueId } : {}),
    payload,
    timestamp: new Date().toISOString(),
    client_id: makeClientId(),
    ...(local ? { _local: local } : {}),
  };

  const queue = await getQueue();
  queue.push(entry);

  // Drop from the front if we are over the cap — the oldest actions are the
  // least likely to still be meaningful.
  const trimmed = queue.length > MAX_QUEUED ? queue.slice(queue.length - MAX_QUEUED) : queue;
  if (trimmed.length < queue.length) {
    console.warn(`[offlineQueue] dropped ${queue.length - trimmed.length} stale action(s)`);
  }

  await writeQueue(trimmed);
  return entry;
}

/** Discard everything. Used on sign-out — a queue belongs to one session. */
export async function clearQueue() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await notify();
}

/**
 * Upload the photos an offline report could not send at the time.
 *
 * `create_issue` returns the new issue's id in `resource_id`; the photos have
 * been sitting in `_local.photos` waiting for it. This is also why a replayed
 * `create_issue` must return the *same* id — otherwise a lost response would
 * orphan them permanently.
 *
 * A failed upload is logged, not retried: the report itself is filed, and
 * pestering the user about a photo is worse than the missing photo.
 *
 * @param {QueuedAction[]} queue
 * @param {{client_id: string, success: boolean, resource_id?: string}[]} results
 * @returns {Promise<number>} how many photos went up
 */
async function uploadDeferredPhotos(queue, results) {
  const byClientId = new Map(results.map((r) => [r.client_id, r]));
  let uploaded = 0;

  for (const entry of queue) {
    if (entry.action !== ACTIONS.CREATE_ISSUE) continue;

    const photos = entry._local?.photos ?? [];
    if (!photos.length) continue;

    const result = byClientId.get(entry.client_id);
    if (!result?.resource_id) continue;

    const { issuesApi } = await import('./issues');

    for (const photo of photos) {
      try {
        const form = new FormData();
        form.append('photos', {
          uri: photo.uri,
          name: photo.name ?? 'photo.jpg',
          type: photo.type ?? 'image/jpeg',
        });
        await issuesApi.uploadPhoto(result.resource_id, form, 'before');
        uploaded += 1;
      } catch (error) {
        // The local file may be gone — the OS clears the camera cache freely,
        // and an offline report can sit for hours.
        console.warn(
          `[offlineQueue] photo upload failed for issue ${result.resource_id}:`,
          toApiError(error).message,
        );
      }
    }
  }

  return uploaded;
}

let flushing = false;

/**
 * Replay the queue.
 *
 * Only entries the server confirms are removed. A `success: false` result stays
 * queued for the next attempt; a `duplicate: true` result counts as done,
 * because the backend has already applied it.
 *
 * @returns {Promise<{ synced: number, failed: number, remaining: number, skipped?: string }>}
 */
export async function flushQueue() {
  if (flushing) return { synced: 0, failed: 0, remaining: (await getQueue()).length, skipped: 'in progress' };

  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, remaining: 0 };

  if (getNetworkState().isOffline) {
    return { synced: 0, failed: 0, remaining: queue.length, skipped: 'offline' };
  }

  flushing = true;
  try {
    // `_local` never leaves the device. The backend validates the payload
    // through its IssueCreate schema, and an unexpected key there would be a
    // 400 on an action the user cannot correct.
    const wire = queue.map(({ _local, ...action }) => action);

    const { data } = await syncApi.syncOfflineActions(wire);
    const results = data?.results ?? [];

    // `duplicate` means the backend had already applied this client_id — a
    // previous flush that succeeded server-side but whose response we never
    // saw. It is done, not failed.
    const done = new Set(
      results.filter((r) => r.success || r.duplicate).map((r) => r.client_id),
    );

    const failures = results.filter((r) => !r.success && !r.duplicate);
    for (const failure of failures) {
      console.warn(`[offlineQueue] action rejected: ${failure.client_id} — ${failure.error ?? 'no reason given'}`);
    }

    // Photos held back from an offline report now have an issue to attach to.
    // Done before the queue is rewritten, so a crash mid-upload leaves the
    // action queued and the replay returns the same resource_id.
    const uploaded = await uploadDeferredPhotos(queue, results);

    const remaining = queue.filter((entry) => !done.has(entry.client_id));
    await writeQueue(remaining);

    return {
      synced: done.size,
      failed: failures.length,
      remaining: remaining.length,
      ...(uploaded ? { photosUploaded: uploaded } : {}),
    };
  } catch (error) {
    const apiError = toApiError(error);
    // A transport failure leaves the queue untouched — this is exactly the
    // case it exists for.
    console.warn(`[offlineQueue] flush failed (${apiError.kind}); ${queue.length} action(s) still queued`);
    return { synced: 0, failed: 0, remaining: queue.length, skipped: apiError.kind };
  } finally {
    flushing = false;
  }
}

/* ── Automatic flushing ──────────────────────────────────────────────────── */

let unsubscribeNetwork = null;
let wasOffline = false;

/**
 * Flush whenever connectivity is regained.
 *
 * Started once from the root layout. Edge-triggered — it fires on the
 * offline → online transition rather than polling, which is what the orphaned
 * modules did with `setInterval`.
 */
export function startAutoFlush() {
  if (unsubscribeNetwork) return unsubscribeNetwork;

  wasOffline = getNetworkState().isOffline;

  unsubscribeNetwork = subscribeToNetwork((state) => {
    if (wasOffline && !state.isOffline) {
      flushQueue().then(({ synced, remaining }) => {
        if (synced) console.log(`[offlineQueue] replayed ${synced} action(s), ${remaining} left`);
      });
    }
    wasOffline = state.isOffline;
  });

  // Also try once at startup: the app may have been killed with a full queue.
  if (!getNetworkState().isOffline) flushQueue();

  return unsubscribeNetwork;
}

export function stopAutoFlush() {
  unsubscribeNetwork?.();
  unsubscribeNetwork = null;
}

/**
 * Run an action online, or queue it if the attempt fails for network reasons.
 *
 * The pattern every caller wants:
 *
 *   const { queued } = await runOrQueue(
 *     () => workersApi.acceptTask(id),
 *     ACTIONS.ACCEPT_TASK,
 *     { issueId: id },
 *   );
 *
 * @template T
 * @param {() => Promise<T>} online
 * @param {string} action
 * @param {{ issueId?: string, payload?: Record<string, unknown> }} [options]
 * @returns {Promise<{ queued: boolean, result?: T }>}
 */
export async function runOrQueue(online, action, options = {}) {
  if (getNetworkState().isOffline) {
    await enqueue(action, options);
    return { queued: true };
  }

  try {
    const result = await online();
    return { queued: false, result };
  } catch (error) {
    const apiError = toApiError(error);
    // Only connectivity failures are queueable. A 403 or a 422 will fail the
    // same way on replay, so surfacing it now is the honest thing to do.
    if (apiError.kind === 'network' || apiError.kind === 'timeout') {
      await enqueue(action, options);
      return { queued: true };
    }
    throw apiError;
  }
}
