'use client';
import { APIProvider } from '@vis.gl/react-google-maps';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/**
 * Wrap any subtree that needs Google Maps with this provider.
 * Only ONE instance should be mounted at a time (the dashboard layout uses it).
 */
export default function GoogleMapProvider({ children }) {
  return (
    <APIProvider apiKey={API_KEY}>
      {children}
    </APIProvider>
  );
}
