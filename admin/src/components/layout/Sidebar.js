'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { adminApi } from '../../api/index';

// roles that can see each nav item — undefined means visible to all
// 'admin' = super admin only, 'district+' = district/super, 'any' = all admin roles
const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    roles: ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/dashboard/issues',
    label: 'Issues',
    roles: ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={3} />
      </svg>
    ),
  },
  {
    href: '/dashboard/workers',
    label: 'Workers',
    roles: ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: '/dashboard/squads',
    label: 'Squads',
    roles: ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <circle cx="9" cy="7" r="3" />
        <circle cx="17" cy="7" r="3" />
        <path d="M13 21v-2a4 4 0 00-8 0v2" />
        <path d="M21 21v-2a4 4 0 00-4-4h-1" />
      </svg>
    ),
  },
  {
    href: '/dashboard/citizens',
    label: 'Citizens',
    roles: ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: '/dashboard/admins',
    label: 'Admins',
    roles: ['admin', 'district_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    roles: ['admin', 'district_admin', 'taluka_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/dashboard/sla',
    label: 'SLA Monitor',
    roles: ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    href: '/dashboard/bulk-notifications',
    label: 'Bulk Notifications',
    roles: ['admin', 'district_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/map',
    label: 'Live Map',
    roles: ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    href: '/dashboard/flags',
    label: 'Flags',
    roles: ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
  {
    href: '/dashboard/disputes',
    label: 'Disputes',
    roles: ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    href: '/dashboard/complaints',
    label: 'Complaints',
    roles: ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <line x1="9" y1="9" x2="15" y2="9" />
        <line x1="12" y1="6" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    href: '/dashboard/surveys',
    label: 'Surveys',
    roles: ['admin', 'district_admin', 'taluka_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    href: '/dashboard/custom-types',
    label: 'Custom Types',
    roles: ['admin', 'district_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    href: '/dashboard/announcements',
    label: 'Announcements',
    roles: ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    href: '/dashboard/locations',
    label: 'Locations',
    roles: ['admin', 'district_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    href: '/dashboard/leaderboard',
    label: 'Leaderboard',
    roles: ['admin', 'district_admin', 'taluka_admin', 'ward_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 7 7" />
        <path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 17 7" />
        <rect x="6" y="9" width="12" height="10" rx="2" />
        <path d="M12 19v3M8 22h8" />
        <path d="M12 9V4" />
      </svg>
    ),
  },
  {
    href: '/dashboard/info',
    label: 'System Info',
    roles: ['admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4m0-4h.01" strokeLinecap="round" />
      </svg>
    ),
  },
];

const ROLE_LABELS = {
  admin: 'Super Admin',
  district_admin: 'District Admin',
  taluka_admin: 'Taluka Admin',
  ward_admin: 'Ward Admin',
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [scope, setScope] = useState(null);

  useEffect(() => {
    if (user?.role && user.role !== 'admin') {
      adminApi.getMyScope()
        .then(({ data }) => setScope(data))
        .catch(() => {});
    }
  }, [user?.role]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="w-60 bg-gray-950 flex flex-col h-full border-r border-gray-900">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-base leading-none">C</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight tracking-wide">Civic</div>
            <div className="text-gray-500 text-xs">Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.filter(({ roles }) => !roles || roles.includes(user?.role)).map(({ href, icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/70'
              }`}
            >
              <span className={`flex-shrink-0 ${active ? 'text-white' : 'text-gray-500'}`}>
                {icon}
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-800/60">
        <Link href="/dashboard/profile" className="flex items-center gap-3 mb-3 rounded-lg px-1 py-1 hover:bg-gray-800/50 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-semibold truncate group-hover:text-blue-300 transition-colors">{user?.name || 'Admin'}</div>
            <div className="text-gray-500 text-xs truncate">{ROLE_LABELS[user?.role] || user?.role}</div>
            {scope?.district_name && (
              <div className="text-xs text-blue-400 mt-0.5 truncate flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:10,height:10}} className="flex-shrink-0">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {[scope.district_name, scope.taluka_name, scope.ward_name].filter(Boolean).join(' / ')}
              </div>
            )}
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:12,height:12}} className="text-gray-600 flex-shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 text-gray-500 hover:text-red-400 text-xs px-2 py-1.5 rounded-lg hover:bg-gray-800/50 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 flex-shrink-0">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
