'use client';
import React from 'react';

const LoadingButton = ({
  children,
  isLoading = false,
  loading = false,
  disabled = false,
  onClick,
  className = '',
  variant = 'primary',
  size = 'md',
  loadingText = 'Loading...',
  type = 'button',
  ...props
}) => {
  isLoading = isLoading || loading;
  const baseStyles = 'font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 relative';

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed',
    outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading && (
        <div className="relative w-4 h-4 inline-flex items-center justify-center">
          {/* Custom spinner */}
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
            .civic-spinner {
              animation: spinnerRotate 2s linear infinite;
            }
            .civic-spinner-circle {
              animation: spinnerDash 1.5s ease-in-out infinite;
            }
          `}</style>
          <svg
            className="civic-spinner"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="civic-spinner-circle"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
      )}
      <span>{isLoading ? loadingText : children}</span>
    </button>
  );
};

export default LoadingButton;
