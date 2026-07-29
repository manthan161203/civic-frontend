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

  /*
   * The eleven that used to fall through to a bare "Admin".
   *
   * Every screen names itself in-body via PageHeader, so this is not the only
   * label — but the top bar is the one that stays put while you scroll, and a
   * console where half the pages are called "Admin" in the chrome is a console
   * you cannot orient yourself in from a screenshot.
   */
  '/dashboard/blocked-tasks': { title: 'Blocked Tasks', sub: 'Work a field worker has stopped on' },
  '/dashboard/surveys': { title: 'Surveys', sub: 'Satisfaction responses from citizens' },
  '/dashboard/disputes': { title: 'Disputes', sub: 'Citizens contesting a resolution' },
  '/dashboard/complaints': { title: 'Complaints', sub: 'Reports about worker conduct' },
  '/dashboard/sla': { title: 'SLA Monitor', sub: 'Issues approaching or past their deadline' },
  '/dashboard/leaderboard': { title: 'Leaderboard', sub: 'Citizen and worker standings' },
  '/dashboard/custom-types': { title: 'Issue Types', sub: 'Custom categories awaiting approval' },
  '/dashboard/squads': { title: 'Squads', sub: 'Multi-worker assignments' },
  '/dashboard/bulk-notifications': { title: 'Bulk Notifications', sub: 'Broadcast to a ward or radius' },
  '/dashboard/geofence': { title: 'Geofences', sub: 'Zones for targeted alerts' },
  '/dashboard/ai-insights': { title: 'AI Insights', sub: 'Trends, movement and anomalies' },
};

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const match = Object.entries(TITLES).find(
    ([k]) => pathname === k || pathname.startsWith(k + '/')
  );
  const page = match?.[1] || { title: 'Admin', sub: '' };

  return (
    <header className="h-14 bg-surface border-b border-divider flex items-center px-6 gap-4 flex-shrink-0 shadow-sm">
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold text-ink leading-tight">{page.title}</h1>
        {page.sub && <p className="text-xs text-ink-subtle leading-tight hidden sm:block">{page.sub}</p>}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-ink-subtle hidden md:block">
          {formatDate(new Date().toISOString(), 'en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user.name?.charAt(0)?.toUpperCase() || 'A'}</span>
            </div>
            <span className="text-xs font-medium text-ink-muted hidden lg:block truncate max-w-28">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
