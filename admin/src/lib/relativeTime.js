/**
 * Elapsed time, in the form a dispatch desk actually reads.
 *
 * The console shows `formatDate(created_at)` — "23 Jul 2026" — which answers a
 * question nobody triaging is asking. What matters on this screen is *how long
 * this has been sitting there*, because that is what SLA escalation keys on.
 * "4d 02h" is scannable down a column in a way a date is not.
 */

/**
 * @param {string|Date|null|undefined} value
 * @param {Date} [now] injectable so this is testable without freezing the clock
 * @returns {string} e.g. "18m", "3h 42m", "4d 02h", or "—"
 */
export function elapsed(value, now = new Date()) {
  if (!value) return '—';

  const then = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(then.getTime())) return '—';

  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  // A future timestamp means clock skew between the server and this browser,
  // not a negative age. Showing "-3m" invites someone to file a bug about it.
  if (seconds < 0) return 'just now';
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`;

  const days = Math.floor(hours / 24);
  // Past a fortnight the hours stop being informative and the column just gets
  // wider; weeks are the useful unit at that range.
  if (days > 13) return `${Math.floor(days / 7)}w`;
  return `${days}d ${String(hours % 24).padStart(2, '0')}h`;
}

/**
 * How overdue an issue is, as a tone the table can colour a cell with.
 *
 * Thresholds are deliberately coarse. The backend owns real SLA escalation
 * (`escalation_level`, `is_escalated`); this is only a visual hint for rows the
 * jobs service has not yet acted on, so it must not look authoritative.
 *
 * @param {string|Date|null|undefined} createdAt
 * @param {string} status
 * @returns {'none'|'watch'|'late'}
 */
export function ageTone(createdAt, status) {
  if (!createdAt) return 'none';
  // A closed issue's age is history, not a backlog signal.
  if (status === 'resolved' || status === 'closed') return 'none';

  const hours = (Date.now() - new Date(createdAt).getTime()) / 36e5;
  if (hours >= 72) return 'late';
  if (hours >= 24) return 'watch';
  return 'none';
}
