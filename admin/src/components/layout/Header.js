'use client';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../lib/dateUtils';

const TITLES = {
  '/dashboard': { title: 'Dashboard', sub: 'Overview and live statistics' },
  '/dashboard/issues': { title: 'Issues', sub: 'Manage and track all reported issues' },
  '/dashboard/workers': { title: 'Workers', sub: 'Field worker accounts and performance' },
  '/dashboard/citizens': { title: 'Citizens', sub: 'Registered citizen accounts' },
  '/dashboard/admins': { title: 'Admin Management', sub: 'Admin hierarchy and role assignment' },
  '/dashboard/analytics': { title: 'Analytics', sub: 'Trends, breakdowns, and insights' },
  '/dashboard/flags': { title: 'Flags & Moderation', sub: 'Reported content review queue' },
  '/dashboard/announcements': { title: 'Announcements', sub: 'Broadcast messages to citizens' },
  '/dashboard/locations': { title: 'Locations', sub: 'District → Taluka → Ward hierarchy' },
  '/dashboard/admin-messages': { title: 'Messages', sub: 'Inter-admin communication and coordination' },
  '/dashboard/admin-overrides': { title: 'Override Management', sub: 'Manage cross-scope emergency access' },
  '/dashboard/info': { title: 'System Info', sub: 'Guide to the Civic admin panel' },
  '/dashboard/map': { title: 'Live Map', sub: 'Issue heatmap and worker locations' },
  '/dashboard/profile': { title: 'My Profile', sub: 'Update your name and phone number' },
};

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const match = Object.entries(TITLES).find(
    ([k]) => pathname === k || pathname.startsWith(k + '/')
  );
  const page = match?.[1] || { title: 'Admin', sub: '' };

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4 flex-shrink-0 shadow-sm">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold text-gray-900 leading-tight">{page.title}</h1>
        {page.sub && <p className="text-xs text-gray-400 leading-tight hidden sm:block">{page.sub}</p>}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-gray-400 hidden md:block">
          {formatDate(new Date().toISOString(), 'en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user.name?.charAt(0)?.toUpperCase() || 'A'}</span>
            </div>
            <span className="text-xs font-medium text-gray-700 hidden lg:block truncate max-w-28">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
