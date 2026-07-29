'use client';

import { useState } from 'react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { formatDateTime } from '@/lib/dateUtils';
import { elapsed } from '@/lib/relativeTime';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';

/**
 * Read-only detail for one issue.
 *
 * The map is unchanged — `@vis.gl/react-google-maps` `<Map>` is already a
 * component and simply moved inside the `<Modal>` shell. Worth knowing it now
 * renders inside a portal, which is why the container has an explicit height:
 * the Maps SDK measures its parent, and a parent with no height produces a
 * blank grey box rather than an error.
 */

/** One label/value row. */
function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-divider py-2 last:border-0">
      <dt className="shrink-0 text-xs text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm text-ink">{children}</dd>
    </div>
  );
}

export default function IssueDetailModal({ open, issue, workerName, onClose }) {
  const [photoFailed, setPhotoFailed] = useState(false);

  if (!issue) return null;

  let photo = issue.before_photos?.[0];
  if (photo && !photo.startsWith('http')) {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    photo = `${base}${photo.startsWith('/') ? '' : '/'}${photo}`;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={issue.description || 'Issue'}
      description={issue.address || undefined}
      size="lg"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge kind="issueStatus" value={issue.status} />
          <StatusBadge kind="priority" value={issue.priority} />
          {issue.is_escalated && (
            <StatusBadge kind="issueStatus" value="escalated" appearance="solid" />
          )}
          {issue.is_blocked && (
            <StatusBadge kind="issueStatus" value="blocked" appearance="outline" />
          )}
        </div>

        {photo && !photoFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt="Reported issue"
            onError={() => setPhotoFailed(true)}
            className="max-h-72 w-full rounded-card bg-surface-alt object-contain"
          />
        )}
        {photo && photoFailed && (
          <div className="flex h-32 items-center justify-center rounded-card bg-surface-alt text-sm text-ink-subtle">
            Photo could not be loaded
          </div>
        )}

        {issue.latitude != null && issue.longitude != null && (
          // Explicit height: the Maps SDK measures its container, and a portal'd
          // parent with auto height renders a blank grey box.
          <div className="overflow-hidden rounded-card border border-border" style={{ height: 190 }}>
            <Map
              defaultCenter={{ lat: issue.latitude, lng: issue.longitude }}
              defaultZoom={15}
              mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID}
              gestureHandling="cooperative"
              disableDefaultUI
              zoomControl
              style={{ width: '100%', height: '100%' }}
            >
              <AdvancedMarker position={{ lat: issue.latitude, lng: issue.longitude }} />
            </Map>
          </div>
        )}

        <dl>
          <Row label="Ward">{issue.ward || '—'}</Row>
          <Row label="Type">
            <span className="capitalize">{issue.issue_type?.replace(/_/g, ' ') || '—'}</span>
          </Row>
          <Row label="Department">
            <span className="capitalize">{issue.department || '—'}</span>
          </Row>
          <Row label="Assigned to">
            {issue.assigned_worker_id ? (
              workerName || 'Assigned'
            ) : (
              <span className="text-ink-subtle">Unassigned</span>
            )}
          </Row>
          <Row label="Upvotes">
            <span className="tabular">{issue.upvote_count ?? 0}</span>
          </Row>
          <Row label="Reported">
            <span className="tabular">{formatDateTime(issue.created_at, 'en-IN')}</span>
          </Row>
          {/* The number an operator is actually judging the row on. */}
          <Row label="Open for">
            <span className="tabular">{elapsed(issue.created_at)}</span>
          </Row>
          {issue.resolution_notes && (
            <Row label="Resolution notes">
              <span className="whitespace-pre-wrap">{issue.resolution_notes}</span>
            </Row>
          )}
        </dl>
      </div>
    </Modal>
  );
}
