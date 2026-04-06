'use client';
import React from 'react';

const FullPageLoader = ({ visible = false, message = 'Loading...' }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm mx-4">
        {/* Custom animated spinner */}
        <style>{`
          @keyframes spinnerRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes spinnerDash {
            0% {
              stroke-dasharray: 1, 50;
              stroke-dashoffset: 0;
            }
            50% {
              stroke-dasharray: 20, 50;
              stroke-dashoffset: -10;
            }
            100% {
              stroke-dasharray: 1, 50;
              stroke-dashoffset: -40;
            }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .civic-full-spinner {
            animation: spinnerRotate 2s linear infinite;
          }
          .civic-full-spinner-circle {
            animation: spinnerDash 1.5s ease-in-out infinite;
          }
          .civic-pulse-ring {
            animation: pulse 1.5s ease-in-out infinite;
          }
        `}</style>

        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Outer pulsing ring */}
          <div className="civic-pulse-ring absolute inset-0 rounded-full border-2 border-blue-200"></div>

          {/* Spinner */}
          <svg
            className="civic-full-spinner"
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g>
              {/* Outer ring spinner */}
              <circle
                cx="32"
                cy="32"
                r="24"
                stroke="url(#gradientSpinner)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                className="civic-full-spinner-circle"
              />
              {/* Inner accent ring */}
              <circle
                cx="32"
                cy="32"
                r="18"
                stroke="#dbeafe"
                strokeWidth="1"
                fill="none"
                opacity="0.5"
              />
              {/* Gradient definition */}
              <defs>
                <linearGradient id="gradientSpinner" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
              </defs>
            </g>
          </svg>
        </div>

        {/* Message */}
        {message && (
          <div className="text-center">
            <p className="text-gray-900 font-semibold text-base">{message}</p>
            <p className="text-gray-500 text-sm mt-1">Please wait...</p>
          </div>
        )}

        {/* Loading dots animation */}
        <div className="flex gap-1 mt-2">
          <div
            className="w-2 h-2 bg-blue-400 rounded-full"
            style={{
              animation: 'pulse 1.4s ease-in-out infinite',
              animationDelay: '0s',
            }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-400 rounded-full"
            style={{
              animation: 'pulse 1.4s ease-in-out infinite',
              animationDelay: '0.2s',
            }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-400 rounded-full"
            style={{
              animation: 'pulse 1.4s ease-in-out infinite',
              animationDelay: '0.4s',
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default FullPageLoader;
