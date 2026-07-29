'use client';
import { useEffect, useState } from 'react';
import Sidebar from '../../src/components/layout/Sidebar.js';
import Header from '../../src/components/layout/Header.js';
import GoogleMapProvider from '../../src/components/ui/GoogleMapProvider.js';
import { adminApi } from '../../src/api/index';
import { logger } from '../../src/lib/logger';

function SOSBanner() {
  const [sosIssues, setSosIssues] = useState([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fetchSOS = async () => {
      try {
        const { data } = await adminApi.getActiveSOS();
        setSosIssues(data || []);
      } catch (err) {
        // Was `catch {}`. This poll drives the SOS banner — the one thing on
        // screen that must not fail quietly, because its absence reads as
        // "no emergencies" rather than "the check is broken".
        logger.error('SOSBanner', 'Active SOS poll failed', err);
      }
    };
    fetchSOS();
    const interval = setInterval(fetchSOS, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!sosIssues.length || !visible) return null;

  return (
    <div className="relative bg-danger text-white px-4 py-2.5 flex items-center gap-3 animate-pulse shadow-lg z-50">
      <span className="flex items-center gap-2 font-bold text-sm">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 18, height: 18 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        SOS ALERT — {sosIssues.length} active emergency {sosIssues.length === 1 ? 'issue' : 'issues'}
      </span>
      <div className="flex-1 flex gap-3 overflow-x-auto text-xs font-medium">
        {sosIssues.slice(0, 5).map((s) => (
          <a
            key={s.id}
            href={`/dashboard/issues?search=${s.id_short}`}
            className="bg-danger-strong/60 rounded-full px-3 py-1 whitespace-nowrap hover:bg-danger-strong transition-colors"
          >
            {s.issue_type} — {s.ward || 'Unknown ward'} ({s.minutes_ago}m ago)
          </a>
        ))}
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-white/70 hover:text-white p-1 rounded transition-colors flex-shrink-0"
        title="Dismiss"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}>
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <GoogleMapProvider>
      <div className="flex flex-col h-full">
        <SOSBanner />
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </GoogleMapProvider>
  );
}
