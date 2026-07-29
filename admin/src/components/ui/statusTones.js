'use client';

/**
 * One registry for every status colour and label in the console.
 *
 * Twelve separate `*_COLORS` maps existed, each a hand-written
 * `bg-X-100 text-X-700` pair, in: issues (×3), disputes, complaints, map (×2),
 * flags, geofence, announcements, ai-insights (×2), profile, dashboard,
 * AdminScopeHeader. They disagreed — `open` was red on one screen and grey on
 * another — and every one of them ended in `|| 'bg-gray-100'`, a fallback each
 * author had to discover by shipping an undefined className.
 *
 * Two things live here rather than in a component:
 *
 *   1. The **tone**, so a status maps to a semantic token instead of a literal
 *      colour, and changing "escalated" is one edit.
 *   2. The **label**, so `status.replace(/_/g, ' ')` + `capitalize` — repeated
 *      at ~30 call sites, each subtly different — stops being the caller's job.
 *      "in_progress" is not a label; "In progress" is.
 */

/**
 * @typedef {'neutral'|'primary'|'success'|'warning'|'danger'|'info'|'accent'} Tone
 * @typedef {{ tone: Tone, label: string }} ToneEntry
 */

/**
 * Every enumerated value the console renders as a badge.
 *
 * Keys match the API's own vocabulary exactly. Where the backend enum is known,
 * it is quoted in a comment — a value here that the backend cannot produce is a
 * bug waiting to be filtered on, which is precisely what happened with the
 * issues screen offering `critical`.
 *
 * @type {Record<string, Record<string, ToneEntry>>}
 */
export const STATUS_TONES = {
  /** Issue.status — open | assigned | in_progress | resolved | escalated | closed */
  issueStatus: {
    open:        { tone: 'danger',  label: 'Open' },
    assigned:    { tone: 'info',    label: 'Assigned' },
    in_progress: { tone: 'primary', label: 'In progress' },
    resolved:    { tone: 'success', label: 'Resolved' },
    escalated:   { tone: 'accent',  label: 'Escalated' },
    closed:      { tone: 'neutral', label: 'Closed' },
  },

  /**
   * Issue.priority — the backend enum is exactly urgent | high | medium | low.
   *
   * There is no `critical`. The issues screen offered one in its filter for a
   * long time, so selecting it always returned zero rows, and there was no way
   * to filter for `urgent` at all — the genuinely highest priority was simply
   * absent from the dropdown.
   */
  priority: {
    urgent: { tone: 'danger',  label: 'Urgent' },
    high:   { tone: 'warning', label: 'High' },
    medium: { tone: 'info',    label: 'Medium' },
    low:    { tone: 'neutral', label: 'Low' },
  },

  /** Issue.severity */
  severity: {
    high:   { tone: 'danger',  label: 'High' },
    medium: { tone: 'warning', label: 'Medium' },
    low:    { tone: 'success', label: 'Low' },
  },

  /** User.role */
  adminRole: {
    admin:          { tone: 'accent',  label: 'Super admin' },
    district_admin: { tone: 'primary', label: 'District admin' },
    taluka_admin:   { tone: 'info',    label: 'Taluka admin' },
    ward_admin:     { tone: 'success', label: 'Ward admin' },
    worker:         { tone: 'warning', label: 'Worker' },
    citizen:        { tone: 'neutral', label: 'Citizen' },
  },

  /** Moderation queue */
  flagStatus: {
    pending:   { tone: 'warning', label: 'Pending' },
    reviewed:  { tone: 'success', label: 'Reviewed' },
    dismissed: { tone: 'neutral', label: 'Dismissed' },
  },

  disputeStatus: {
    open:      { tone: 'danger',  label: 'Open' },
    reviewing: { tone: 'warning', label: 'Reviewing' },
    resolved:  { tone: 'success', label: 'Resolved' },
    rejected:  { tone: 'neutral', label: 'Rejected' },
  },

  complaintStatus: {
    pending:  { tone: 'warning', label: 'Pending' },
    resolved: { tone: 'success', label: 'Resolved' },
    rejected: { tone: 'neutral', label: 'Rejected' },
  },

  /** AI resolution verification */
  aiQuality: {
    good:    { tone: 'success', label: 'Good' },
    partial: { tone: 'warning', label: 'Partial' },
    poor:    { tone: 'danger',  label: 'Poor' },
  },

  /** Announcement.scope */
  announcementScope: {
    state:    { tone: 'accent',  label: 'Statewide' },
    district: { tone: 'primary', label: 'District' },
    taluka:   { tone: 'info',    label: 'Taluka' },
    ward:     { tone: 'success', label: 'Ward' },
  },

  /**
   * SatisfactionSurvey.speed_rating — stored as the integers 1, 2, 3.
   *
   * Keyed as strings because that is what `String(rating)` produces at the call
   * site, and because JSON object keys are strings anyway (`speed_breakdown`
   * comes back from the API as `{"1": n, "2": n, "3": n}`).
   */
  surveySpeed: {
    1: { tone: 'danger',  label: 'Slow' },
    2: { tone: 'warning', label: 'Average' },
    3: { tone: 'success', label: 'Fast' },
  },

  /** A plain yes/no answer, where "no" is the one worth noticing. */
  yesNo: {
    yes: { tone: 'success', label: 'Yes' },
    no:  { tone: 'danger',  label: 'No' },
  },

  /** Worker availability */
  presence: {
    online:  { tone: 'success', label: 'Online' },
    offline: { tone: 'neutral', label: 'Offline' },
    busy:    { tone: 'warning', label: 'Busy' },
  },
};

/** Shown when a value is present but not in the registry. */
export const UNKNOWN_TONE = /** @type {ToneEntry} */ ({ tone: 'neutral', label: '' });

/**
 * Resolve a raw API value to its tone and label.
 *
 * Never returns undefined, because the twelve maps this replaces each had a
 * `|| 'bg-gray-100'` fallback bolted on after someone shipped `undefined` into
 * a className. Encoding it once means nobody has to learn that again.
 *
 * An unrecognised value still renders — humanised rather than hidden — because
 * a new backend status silently vanishing from the UI is worse than one that
 * looks slightly plain.
 *
 * @param {keyof STATUS_TONES} kind
 * @param {string|null|undefined} value
 * @param {string} [fallbackLabel] shown when `value` is null/empty
 * @returns {ToneEntry}
 */
export function resolveTone(kind, value, fallbackLabel = '—') {
  if (value === null || value === undefined || value === '') {
    return { tone: 'neutral', label: fallbackLabel };
  }
  const registry = STATUS_TONES[kind];
  const entry = registry?.[value];
  if (entry) return entry;

  return { tone: 'neutral', label: humanise(value) };
}

/**
 * `in_progress` → `In progress`. The transformation that was inlined, slightly
 * differently, at every badge in the app.
 *
 * @param {string} value
 * @returns {string}
 */
export function humanise(value) {
  const spaced = String(value).replace(/[_-]+/g, ' ').trim();
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : '';
}
