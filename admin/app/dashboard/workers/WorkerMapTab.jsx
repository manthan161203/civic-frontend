'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { useQuery } from '@tanstack/react-query';

import { adminApi } from '@/api/index';
import { qk } from '@/api/queryKeys';
import { elapsed } from '@/lib/relativeTime';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Toolbar from '@/components/ui/Toolbar';
import EmptyState from '@/components/ui/EmptyState';
import { ErrorPanel } from '@/components/ui/AsyncBoundary';
import Spinner from '@/components/ui/Spinner';

/** Centre of Gujarat — the fallback view before any worker has reported a fix. */
const DEFAULT_CENTER = { lat: 22.2587, lng: 71.1924 };

/**
 * Fit the viewport to the markers, once per change in how many there are.
 *
 * Refitting on every poll would yank the map out from under an admin who has
 * panned somewhere deliberately, so the count is the trigger rather than the
 * positions themselves.
 */
function FitBounds({ positions }) {
  const map = useMap();
  const previousCount = useRef(0);

  useEffect(() => {
    if (!map || !positions.length) return;
    if (positions.length === previousCount.current) return;
    previousCount.current = positions.length;

    const bounds = new google.maps.LatLngBounds();
    positions.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [map, positions]);

  return null;
}

/**
 * Where workers are right now.
 *
 * ── Why the timestamp is on every marker ─────────────────────────────────────
 *
 * A worker's position is one mutable point, not a track. The app updates it
 * while the worker has it open; when they close it, the last fix stays in the
 * row forever. Without an age beside it, a dot from six hours ago reads exactly
 * like presence — which is how you dispatch someone who went home at four.
 */
export default function WorkerMapTab() {
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [selected, setSelected] = useState(null);

  const locationsQuery = useQuery({
    queryKey: [...qk.workers.locations(), onlineOnly],
    queryFn: ({ signal }) =>
      adminApi.getWorkerLocations({ online_only: onlineOnly }, { signal }).then((r) => r.data),
    // Positions go stale quickly, and Query pauses this while the tab is
    // hidden — which the old hand-rolled loader could not do.
    refetchInterval: 60_000,
  });

  const workers = useMemo(
    () => (locationsQuery.data ?? []).filter((w) => w.latitude && w.longitude),
    [locationsQuery.data],
  );

  const positions = useMemo(
    () => workers.map((w) => ({ lat: w.latitude, lng: w.longitude })),
    [workers],
  );

  const withoutFix = (locationsQuery.data?.length ?? 0) - workers.length;

  if (locationsQuery.error) {
    return <ErrorPanel error={locationsQuery.error} onRetry={locationsQuery.refetch} />;
  }

  return (
    <div className="space-y-3">
      <Toolbar>
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={onlineOnly}
            onChange={(e) => setOnlineOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--color-primary)]"
          />
          Online only
        </label>

        <div className="flex-1" />

        {locationsQuery.isFetching && <Spinner size="sm" label="Refreshing positions" />}

        <span className="tabular text-xs text-ink-muted">
          {workers.length} on the map
          {withoutFix > 0 && (
            <span className="text-ink-subtle"> · {withoutFix} with no position</span>
          )}
        </span>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => locationsQuery.refetch()}
          disabled={locationsQuery.isFetching}
        >
          Refresh
        </Button>
      </Toolbar>

      {!locationsQuery.isPending && workers.length === 0 ? (
        <Card>
          <EmptyState
            icon="mapPin"
            title={onlineOnly ? 'Nobody is online right now' : 'No positions reported'}
            description="Positions come from the worker app while it is open. They stop updating when it is closed."
            action={
              onlineOnly ? (
                <Button size="sm" variant="secondary" onClick={() => setOnlineOnly(false)}>
                  Include offline workers
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div
          className="overflow-hidden rounded-card border border-border"
          style={{ height: 'calc(100vh - 15rem)' }}
        >
          <Map
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={7}
            mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID}
            gestureHandling="greedy"
            style={{ width: '100%', height: '100%' }}
          >
            {workers.map((w) => (
              <AdvancedMarker
                key={w.id ?? `${w.latitude},${w.longitude}`}
                position={{ lat: w.latitude, lng: w.longitude }}
                onClick={() => setSelected(w)}
                title={w.name}
              >
                <span
                  className={`block h-3.5 w-3.5 rounded-full border-2 shadow ${
                    w.is_online
                      ? 'border-success-strong bg-success'
                      : 'border-ink-subtle bg-ink-subtle'
                  }`}
                />
              </AdvancedMarker>
            ))}

            {selected && (
              <InfoWindow
                position={{ lat: selected.latitude, lng: selected.longitude }}
                onCloseClick={() => setSelected(null)}
              >
                <div className="min-w-40 space-y-1 p-0.5">
                  <p className="text-sm font-semibold text-ink">{selected.name}</p>
                  <p className="text-xs text-ink-muted">
                    {[selected.ward, selected.department].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <Badge tone={selected.is_online ? 'success' : 'neutral'} dot>
                    {selected.is_online ? 'Online' : 'Offline'}
                  </Badge>
                  {selected.location_updated_at && (
                    <p className="text-xs text-ink-subtle">
                      Position {elapsed(selected.location_updated_at)} old
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}

            <FitBounds positions={positions} />
          </Map>
        </div>
      )}
    </div>
  );
}
