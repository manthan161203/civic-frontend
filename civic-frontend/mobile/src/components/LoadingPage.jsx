'use client';

export default function LoadingPage({ title = 'Loading', subtitle = 'Please wait...' }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-50 to-blue-100 flex items-center justify-center z-50">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6); }
          70% { box-shadow: 0 0 0 25px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .float-animation { animation: float 3s ease-in-out infinite; }
        .pulse-ring { animation: pulse-ring 2s infinite; }
        .spin-slow { animation: spin-slow 3s linear infinite; }
      `}</style>

      <div className="text-center px-6 max-w-sm">
        {/* Animated Icon Container */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-16 h-16">
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 rounded-full pulse-ring" />
            
            {/* Rotating border */}
            <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-blue-600 border-r-blue-500 spin-slow" />
            
            {/* Center icon */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center float-animation shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
        
        {/* Subtitle */}
        <p className="text-gray-600 text-sm mb-6">{subtitle}</p>

        {/* Animated dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-blue-600"
              style={{
                animation: `pulse 1.4s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* Status message */}
        <p className="text-xs text-gray-500 font-medium">Initializing application</p>
      </div>
    </div>
  );
}
