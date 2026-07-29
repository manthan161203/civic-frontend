import { TONE_CLASSES } from './ui/Badge';
import { resolveTone } from './ui/statusTones';

/**
 * The banner naming which jurisdiction the screen below is filtered to.
 *
 * ── Two things were wrong here ───────────────────────────────────────────────
 *
 * This file carried its own `ROLE_COLORS` and `ROLE_LABELS` maps — the
 * **thirteenth** such map, missed when `statusTones.js` retired twelve. It
 * disagreed with the shared `adminRole` registry: district and taluka admins
 * were the same amber here and different tones there, so the same person's role
 * was one colour in this banner and another in the table underneath it.
 *
 * And the border colour was **built at runtime**:
 *
 *     border-${roleColor.text.split('-')[1]}-200
 *
 * Tailwind resolves class names by scanning source text, so a name assembled
 * from a string split is never generated. That border has never rendered. The
 * tokenise pass made it more obviously broken rather than less — the token is
 * `border-danger`, so the expression now produces `border-danger-200`, which
 * does not exist either — but it was already dead.
 */
export default function AdminScopeHeader({ user, locationTree }) {
  if (!user) return null;

  // One registry, shared with every role badge elsewhere in the console.
  const { tone, label: roleLabel } = resolveTone('adminRole', user.role, 'Admin');
  const toneClasses = TONE_CLASSES[tone] ?? TONE_CLASSES.neutral;

  // Resolve location name based on role and IDs
  const getLocationName = () => {
    if (!locationTree || !locationTree.length) return 'Loading…';

    if (user.role === 'admin') {
      return 'All Districts';
    }

    if (user.role === 'district_admin' && user.district_id) {
      const district = locationTree.find((d) => d.id === user.district_id);
      return district?.name || 'Unknown District';
    }

    if (user.role === 'taluka_admin' && user.taluka_id) {
      for (const district of locationTree) {
        const taluka = (district.talukas || []).find((t) => t.id === user.taluka_id);
        if (taluka) return taluka.name;
      }
      return 'Unknown Taluka';
    }

    if (user.role === 'ward_admin' && user.ward_id) {
      for (const district of locationTree) {
        for (const taluka of (district.talukas || [])) {
          const ward = (taluka.wards || []).find((w) => w.id === user.ward_id);
          if (ward) return ward.name;
        }
      }
      return 'Unknown Ward';
    }

    return 'No Location';
  };

  return (
    <div className={`${toneClasses.soft} rounded-card border border-border p-4 flex items-center justify-between`}>
      <div className="flex items-center gap-4">
        <div className={`${toneClasses.solid} p-3 rounded-control flex-shrink-0`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide">{roleLabel}</div>
          <div className="text-sm font-medium text-ink mt-0.5">{getLocationName()}</div>
        </div>
      </div>

      {user.role !== 'admin' && (
        <div className="flex items-center gap-2 text-xs text-ink-muted bg-surface bg-opacity-50 px-3 py-1.5 rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
          </svg>
          Data filtered to your scope
        </div>
      )}
    </div>
  );
}
