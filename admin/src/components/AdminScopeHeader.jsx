const ROLE_COLORS = {
  admin: { bg: 'bg-red-50', text: 'text-red-700', icon: 'bg-red-100' },
  district_admin: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'bg-orange-100' },
  taluka_admin: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'bg-yellow-100' },
  ward_admin: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'bg-blue-100' },
};

const ROLE_LABELS = {
  admin: 'Super Admin',
  district_admin: 'District Admin',
  taluka_admin: 'Taluka Admin',
  ward_admin: 'Ward Admin',
};

export default function AdminScopeHeader({ user, locationTree }) {
  if (!user) return null;

  const roleColor = ROLE_COLORS[user.role] || ROLE_COLORS.ward_admin;
  const roleLabel = ROLE_LABELS[user.role] || 'Admin';

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
    <div className={`${roleColor.bg} rounded-xl border border-${roleColor.text.split('-')[1]}-200 p-4 flex items-center justify-between`}>
      <div className="flex items-center gap-4">
        <div className={`${roleColor.icon} p-3 rounded-lg flex-shrink-0`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-5 h-5 ${roleColor.text}`}>
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <div className={`text-xs font-semibold uppercase tracking-wide ${roleColor.text}`}>{roleLabel}</div>
          <div className="text-sm font-medium text-gray-800 mt-0.5">{getLocationName()}</div>
        </div>
      </div>

      {user.role !== 'admin' && (
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-white bg-opacity-50 px-3 py-1.5 rounded-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
          </svg>
          Data filtered to your scope
        </div>
      )}
    </div>
  );
}
