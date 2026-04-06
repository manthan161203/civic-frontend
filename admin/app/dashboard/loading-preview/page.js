'use client';
import { useState } from 'react';
import LoadingPage from '../../../src/components/ui/LoadingPage.jsx';
import { DashboardSkeleton, CardSkeleton, ListSkeleton, FormSkeleton } from '../../../src/components/ui/SkeletonLoaders.jsx';

export default function LoadingPreviewPage() {
  const [activePreview, setActivePreview] = useState('full-page');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Loading UI Preview</h1>
        <p className="text-gray-600 mb-8">Test all loading states and skeleton components</p>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white rounded-lg p-3 shadow-sm">
          {[
            { id: 'full-page', label: '🎯 Full Page Loading' },
            { id: 'dashboard', label: '📊 Dashboard Skeleton' },
            { id: 'cards', label: '📇 Card Skeleton' },
            { id: 'list', label: '📋 List Skeleton' },
            { id: 'form', label: '📝 Form Skeleton' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActivePreview(id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activePreview === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Preview Container */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
          <div className="min-h-[600px] relative">
            {activePreview === 'full-page' && <LoadingPage title="Loading Dashboard" subtitle="Fetching your data..." />}
            {activePreview === 'dashboard' && <DashboardSkeleton />}
            {activePreview === 'cards' && (
              <div className="p-6">
                <h2 className="text-xl font-bold mb-6 text-gray-900">Card Skeleton Preview</h2>
                <CardSkeleton count={4} />
              </div>
            )}
            {activePreview === 'list' && (
              <div className="p-6">
                <h2 className="text-xl font-bold mb-6 text-gray-900">List Skeleton Preview</h2>
                <ListSkeleton count={6} />
              </div>
            )}
            {activePreview === 'form' && (
              <div className="p-6">
                <h2 className="text-xl font-bold mb-6 text-gray-900">Form Skeleton Preview</h2>
                <FormSkeleton />
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">💡 About These Components</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ All animations use CSS (GPU accelerated)</li>
            <li>✓ Full Page Loading: Use when app first loads or major page transition</li>
            <li>✓ Dashboard Skeleton: Multi-section placeholder for dashboard pages</li>
            <li>✓ Card Skeleton: Grid of card-based content</li>
            <li>✓ List Skeleton: Linear list of items</li>
            <li>✓ Form Skeleton: Form fields placeholder</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
