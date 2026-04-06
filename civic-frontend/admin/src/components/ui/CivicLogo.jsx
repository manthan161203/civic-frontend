'use client';
import React from 'react';

const CivicLogo = ({ size = 'md', showText = true, darkMode = false }) => {
  const sizes = {
    sm: { icon: 32, text: 14 },
    md: { icon: 48, text: 18 },
    lg: { icon: 64, text: 24 },
    xl: { icon: 96, text: 32 },
  };

  const s = sizes[size];
  const textColor = darkMode ? '#f3f4f6' : '#111827';
  const accentColor = '#2563eb';

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Logo Icon */}
      <div className={`w-${s.icon} h-${s.icon} flex items-center justify-center`} style={{ width: s.icon, height: s.icon }}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: s.icon, height: s.icon }}
        >
          {/* Background circle with gradient */}
          <defs>
            <linearGradient id="civicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>

          {/* Outer circle */}
          <circle cx="50" cy="50" r="48" fill="url(#civicGradient)" opacity="0.1" />

          {/* Building/City shape - represents civic services */}
          <g transform="translate(50, 50)">
            {/* Left building */}
            <rect x="-28" y="-15" width="12" height="30" fill={accentColor} rx="2" />
            {/* Windows left building */}
            <rect x="-26" y="-12" width="3" height="3" fill="white" rx="0.5" />
            <rect x="-26" y="-6" width="3" height="3" fill="white" rx="0.5" />
            <rect x="-26" y="0" width="3" height="3" fill="white" rx="0.5" />
            <rect x="-20" y="-12" width="3" height="3" fill="white" rx="0.5" />
            <rect x="-20" y="-6" width="3" height="3" fill="white" rx="0.5" />
            <rect x="-20" y="0" width="3" height="3" fill="white" rx="0.5" />

            {/* Center building (taller) */}
            <rect x="-8" y="-22" width="16" height="37" fill={accentColor} rx="2" />
            {/* Windows center building */}
            <rect x="-6" y="-19" width="3" height="3" fill="white" rx="0.5" />
            <rect x="-6" y="-13" width="3" height="3" fill="white" rx="0.5" />
            <rect x="-6" y="-7" width="3" height="3" fill="white" rx="0.5" />
            <rect x="-6" y="-1" width="3" height="3" fill="white" rx="0.5" />
            <rect x="0" y="-19" width="3" height="3" fill="white" rx="0.5" />
            <rect x="0" y="-13" width="3" height="3" fill="white" rx="0.5" />
            <rect x="0" y="-7" width="3" height="3" fill="white" rx="0.5" />
            <rect x="0" y="-1" width="3" height="3" fill="white" rx="0.5" />

            {/* Right building */}
            <rect x="16" y="-12" width="12" height="27" fill={accentColor} rx="2" />
            {/* Windows right building */}
            <rect x="18" y="-9" width="3" height="3" fill="white" rx="0.5" />
            <rect x="18" y="-3" width="3" height="3" fill="white" rx="0.5" />
            <rect x="24" y="-9" width="3" height="3" fill="white" rx="0.5" />
            <rect x="24" y="-3" width="3" height="3" fill="white" rx="0.5" />

            {/* Civic connection line (representing community) */}
            <circle cx="-20" cy="18" r="2" fill={accentColor} />
            <circle cx="0" cy="20" r="2" fill={accentColor} />
            <circle cx="20" cy="18" r="2" fill={accentColor} />
            <line x1="-20" y1="18" x2="0" y2="20" stroke={accentColor} strokeWidth="1" opacity="0.5" />
            <line x1="0" y1="20" x2="20" y2="18" stroke={accentColor} strokeWidth="1" opacity="0.5" />
          </g>
        </svg>
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col items-center">
          <h1
            className="font-bold tracking-tight"
            style={{ fontSize: s.text, color: textColor }}
          >
            Civic
          </h1>
          <p
            className="text-xs font-medium"
            style={{ color: accentColor }}
          >
            Community Platform
          </p>
        </div>
      )}
    </div>
  );
};

export default CivicLogo;
