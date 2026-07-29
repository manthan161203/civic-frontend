'use client';

// ── SVG Icon Components ────────────────────────────────────────────────────────
function IcoBuilding({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:size,height:size}}>
      <rect x="3" y="9" width="18" height="13" rx="1" />
      <path d="M8 22V12h8v10" />
      <path d="M3 9l9-7 9 7" />
    </svg>
  );
}
function IcoUsers({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:size,height:size}}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function IcoRefresh({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:size,height:size}}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}
function IcoPin({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:size,height:size}}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IcoList({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:size,height:size}}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth={3} strokeLinecap="round" />
      <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth={3} strokeLinecap="round" />
      <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}
function IcoDatabase({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:size,height:size}}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}
function IcoCode({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:size,height:size}}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

const SECTIONS = [
  {
    title: 'What is Civic?',
    icon: <IcoBuilding />,
    color: 'border-primary/20 bg-primary-soft',
    iconBg: 'bg-primary-soft text-primary',
    content: `Civic is a government issue reporting and resolution platform. Citizens report civic problems — potholes, broken streetlights, water supply failures — via the mobile app. Those issues are routed to the right department, assigned to field workers, and tracked to resolution. The admin panel (this interface) gives administrators visibility and control over the entire pipeline.`,
  },
  {
    title: 'User Roles',
    icon: <IcoUsers />,
    color: 'border-accent/30 bg-accent-soft',
    iconBg: 'bg-accent-soft text-accent',
    items: [
      { label: 'Super Admin', desc: 'Full system access. Can create district/taluka/ward admins, view all issues, and change any user\'s role.' },
      { label: 'District Admin', desc: 'Manages all issues and workers within their district. Can create taluka and ward admins.' },
      { label: 'Taluka Admin', desc: 'Manages issues within their taluka. Can create ward admins.' },
      { label: 'Ward Admin', desc: 'Manages issues in their specific ward. Can assign workers to issues.' },
      { label: 'Worker', desc: 'Field staff. Receives task assignments on their mobile app, updates status, and uploads resolution photos.' },
      { label: 'Citizen', desc: 'Any registered user. Reports issues, tracks progress, upvotes and comments.' },
    ],
  },
  {
    title: 'Issue Lifecycle',
    icon: <IcoRefresh />,
    color: 'border-success/30 bg-success-soft',
    iconBg: 'bg-success-soft text-success',
    flow: [
      { status: 'open', color: 'bg-danger-soft text-danger', desc: 'Citizen submits an issue. Awaiting admin review.' },
      { status: 'assigned', color: 'bg-info-soft text-info', desc: 'Admin assigns a worker. Worker notified via app.' },
      { status: 'in_progress', color: 'bg-primary-soft text-primary-strong', desc: 'Worker accepts the task and starts working.' },
      { status: 'resolved', color: 'bg-success-soft text-success', desc: 'Worker uploads after-photo and marks complete.' },
      { status: 'closed', color: 'bg-surface-alt text-ink-muted', desc: 'Admin or system closes the issue. No further action.' },
      { status: 'escalated', color: 'bg-accent-soft text-accent', desc: 'Flagged for higher-level attention (e.g. critical or overdue).' },
    ],
  },
  {
    title: 'Location Hierarchy',
    icon: <IcoPin />,
    color: 'border-warning/30 bg-warning-soft',
    iconBg: 'bg-warning-soft text-warning',
    content: `The system uses a 3-level geographic hierarchy: District → Taluka → Ward. Issues are tagged to the ward where they occur. Admins are scoped to their level — a district admin sees all issues in their district; a ward admin sees only their ward. Use the Locations page to add or remove districts, talukas, and wards.`,
  },
  {
    title: 'Admin Panel Pages',
    icon: <IcoList />,
    color: 'border-border bg-surface-alt',
    iconBg: 'bg-surface-alt text-ink-muted',
    items: [
      { label: 'Dashboard', desc: 'Live stats: open issues, in-progress, resolved today, total workers online. Trend charts for the last 7 days.' },
      { label: 'Issues', desc: 'Browse, filter, search all issues. Assign or reassign workers. Escalate or bulk-close. Export to CSV.' },
      { label: 'Workers', desc: 'Manage field workers — create accounts, assign wards/departments, deactivate, view leaderboard.' },
      { label: 'Citizens', desc: 'View registered citizens, their issue count, reward points, and activity status.' },
      { label: 'Admins', desc: 'Manage the admin hierarchy. Create sub-admins with location scope. Promote citizens/workers to admin roles.' },
      { label: 'Analytics', desc: 'Detailed charts by time range (7/14/30/90 days) — volume trend, by type, by status, by priority, top wards.' },
      { label: 'Flags', desc: 'Moderation queue. Citizens can flag issues or comments as spam, inappropriate, or duplicate.' },
      { label: 'Announcements', desc: 'Broadcast messages to all citizens or a specific district/taluka/ward.' },
      { label: 'Locations', desc: 'Add/remove districts, talukas, and wards in the geographic hierarchy.' },
      { label: 'Geofences', desc: 'Create geographic boundary zones for targeted notifications. Define radius-based areas, send bulk notifications to citizens/workers within a geofence.' },
      { label: 'SLA Dashboard', desc: 'Monitor service level agreement compliance. Track breached, warning, and on-track issues. Real-time SLA metrics by ward.' },
      { label: 'AI Insights', desc: 'AI-powered analysis of issue patterns, worker performance, and resolution quality. Low-confidence predictions and poor resolutions flagged for review.' },
    ],
  },
  {
    title: 'Storage Backends',
    icon: <IcoDatabase />,
    color: 'border-warning/30 bg-warning-soft',
    iconBg: 'bg-warning-soft text-warning',
    content: `Issue photos are stored in one of three backends, controlled by the STORAGE_BACKEND environment variable on the server:`,
    items: [
      { label: 'local', desc: 'Files saved to the server\'s uploads/ folder. Good for local development.' },
      { label: 'cloudinary', desc: 'Uploaded to Cloudinary CDN with automatic quality and format optimisation.' },
      { label: 'supabase', desc: 'Uploaded to Supabase Storage bucket. Recommended for production with a Supabase database.' },
    ],
  },
  {
    title: 'System Improvements (Latest Release)',
    icon: <IcoCode />,
    color: 'border-info/30 bg-info-soft',
    iconBg: 'bg-info-soft text-info',
    items: [
      { label: 'Query Optimization', desc: '99% reduction in N+1 database queries. Geographic tree loads in 1 query instead of 100+. Badge checks reduced from 10+ to 1 query.' },
      { label: 'Error Logging', desc: '22+ silent catch blocks fixed with proper error logging. Workers and admins now receive feedback when operations fail instead of silent failures.' },
      { label: 'Input Validation', desc: 'Geofence coordinates validated (lat: -90/+90, lng: -180/+180, radius > 0). Frontend + backend validation prevents invalid data.' },
      { label: 'Notification Batching', desc: 'Dispute and escalation notifications batch-send to admins instead of per-admin loops. Reduces API calls and improves performance.' },
      { label: 'Env Validation', desc: 'API URL and critical config validated at startup. Prevents silent failures in production due to missing configuration.' },
      { label: 'Location Tracking', desc: 'Worker GPS updates now properly log errors instead of silently failing every 30 seconds.' },
    ],
  },
  {
    title: 'Key API Endpoints',
    icon: <IcoCode />,
    color: 'border-accent/30 bg-accent-soft',
    iconBg: 'bg-accent-soft text-accent',
    code: [
      ['GET /admin/dashboard', 'Live dashboard stats'],
      ['GET /admin/analytics', 'Analytics data (pass ?days=30)'],
      ['GET /admin/issues', 'Paginated issue list with filters'],
      ['POST /admin/issues/{id}/assign', 'Assign worker to issue'],
      ['POST /admin/issues/bulk', 'Bulk close or escalate'],
      ['GET /admin/workers', 'Paginated worker list'],
      ['GET /admin/workers/leaderboard', 'Worker performance rankings'],
      ['POST /admin/workers', 'Create a new worker account'],
      ['GET /admin/citizens', 'Paginated citizen list'],
      ['POST /admin/admins', 'Create a sub-admin'],
      ['PATCH /admin/users/{id}/role', 'Change user role'],
      ['GET /admin/flags', 'Moderation flags queue'],
      ['POST /admin/announcements', 'Create announcement'],
      ['GET /locations/tree', 'Full district/taluka/ward tree (optimized with eager loading)'],
      ['GET /admin/geofences', 'List all geofences (paginated)'],
      ['POST /admin/geofences', 'Create geofence with validation'],
      ['PATCH /admin/geofences/{id}', 'Update geofence coordinates/radius'],
      ['DELETE /admin/geofences/{id}', 'Delete a geofence'],
      ['POST /admin/notifications/geofence', 'Send bulk notification within geofence'],
    ],
  },
];


export default function InfoPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-surface/20 flex items-center justify-center flex-shrink-0 text-white">
            <IcoBuilding size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black mb-1">Civic Admin — System Guide</h1>
            <p className="text-white/75 text-sm leading-relaxed">
              Everything you need to know about managing the Civic issue resolution platform. This page explains roles, workflows, and how to use each section of the admin panel.
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <div key={section.title} className={`rounded-xl border p-5 ${section.color}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${section.iconBg}`}>
              {section.icon}
            </div>
            <h2 className="text-base font-bold text-ink">{section.title}</h2>
          </div>

          {section.content && (
            <p className="text-sm text-ink-muted leading-relaxed mb-3">{section.content}</p>
          )}

          {section.flow && (
            <div className="space-y-2">
              {section.flow.map((step, i) => (
                <div key={step.status} className="flex items-start gap-3">
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <span className="text-xs text-ink-subtle font-bold w-3">{i + 1}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize w-24 justify-center ${step.color}`}>
                      {step.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-ink-muted">{step.desc}</p>
                </div>
              ))}
            </div>
          )}

          {section.items && (
            <div className="space-y-2">
              {section.items.map((item) => (
                <div key={item.label} className="flex gap-3 bg-surface/60 rounded-lg px-3 py-2.5">
                  <span className="text-sm font-bold text-ink w-36 flex-shrink-0">{item.label}</span>
                  <span className="text-sm text-ink-muted leading-relaxed">{item.desc}</span>
                </div>
              ))}
            </div>
          )}

          {section.code && (
            <div className="space-y-1.5">
              {section.code.map(([endpoint, desc]) => (
                <div key={endpoint} className="flex items-center gap-3 bg-surface/60 rounded-lg px-3 py-2">
                  <code className="text-xs font-mono text-accent font-semibold flex-shrink-0 w-64">{endpoint}</code>
                  <span className="text-xs text-ink-subtle">{desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Footer */}
      <div className="text-center text-xs text-ink-subtle pb-2">
        Civic Admin Panel · Built with Next.js · Backend: FastAPI + PostgreSQL
      </div>
    </div>
  );
}
