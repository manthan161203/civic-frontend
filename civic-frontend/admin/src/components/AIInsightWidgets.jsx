import React from 'react';

const SEVERITY_COLORS = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const QUALITY_COLORS = {
  good: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  poor: 'bg-red-100 text-red-700',
};

export function AdminAIClassificationWidget({ issue }) {
  if (!issue.ai_issue_type && !issue.ai_confidence && !issue.ai_suggested_description) {
    return null;
  }

  const confidencePercent = issue.ai_confidence ? Math.round(issue.ai_confidence * 100) : 0;
  const confidenceColor =
    confidencePercent > 80 ? 'bg-green-500' : confidencePercent > 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h4 className="text-xs font-bold text-blue-900 uppercase mb-3 flex items-center gap-2"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" /></svg> AI Classification</h4>
      <div className="space-y-3">
        {issue.ai_issue_type && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Predicted Type:</span>
            <span className="text-sm font-semibold text-blue-700">{issue.ai_issue_type}</span>
          </div>
        )}

        {issue.ai_severity && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Severity:</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${SEVERITY_COLORS[issue.ai_severity] || ''}`}>
              {issue.ai_severity}
            </span>
          </div>
        )}

        {issue.ai_confidence !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Confidence:</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className={`h-full ${confidenceColor}`}
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 w-10">{confidencePercent}%</span>
            </div>
          </div>
        )}

        {issue.ai_suggested_description && (
          <div>
            <span className="text-sm text-gray-700 block mb-1">AI Summary:</span>
            <p className="text-sm text-gray-600 bg-white p-2 rounded border border-blue-100">
              {issue.ai_suggested_description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminAIResolutionWidget({ issue }) {
  if (issue.ai_is_resolved === undefined && !issue.ai_resolution_quality && !issue.ai_resolution_notes) {
    return null;
  }

  const qualityColor =
    issue.ai_resolution_quality === 'poor'
      ? 'bg-red-50 border-red-200'
      : issue.ai_resolution_quality === 'partial'
      ? 'bg-yellow-50 border-yellow-200'
      : 'bg-green-50 border-green-200';

  const titleColor =
    issue.ai_resolution_quality === 'poor'
      ? 'text-red-900'
      : issue.ai_resolution_quality === 'partial'
      ? 'text-yellow-900'
      : 'text-green-900';

  return (
    <div className={`border rounded-lg p-4 mb-4 ${qualityColor}`}>
      <h4 className={`text-xs font-bold uppercase mb-3 ${titleColor}`}>
        ✓ Resolution Verification
      </h4>
      <div className="space-y-3">
        {issue.ai_is_resolved !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Status:</span>
            <span className="text-sm font-semibold">
              {issue.ai_is_resolved ? '✅ Resolved' : '❌ Not Resolved'}
            </span>
          </div>
        )}

        {issue.ai_resolution_quality && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Quality:</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${QUALITY_COLORS[issue.ai_resolution_quality]}`}>
              {issue.ai_resolution_quality}
            </span>
          </div>
        )}

        {issue.ai_resolution_notes && (
          <div>
            <span className="text-sm text-gray-700 block mb-1">AI Assessment:</span>
            <p className="text-sm text-gray-600 bg-white p-2 rounded border">
              {issue.ai_resolution_notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
