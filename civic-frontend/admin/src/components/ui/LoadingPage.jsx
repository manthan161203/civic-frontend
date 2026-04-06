'use client';

export default function LoadingPage({ title = 'Loading', subtitle = 'Please wait...' }) {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50 overflow-hidden">
      <style>{`
        @keyframes slide-circle {
          0% { 
            left: -100px;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% { 
            left: 100vw;
            opacity: 0;
          }
        }
        
        @keyframes float-up {
          0% { 
            opacity: 0;
            transform: translateY(30px);
          }
          10% {
            opacity: 1;
            transform: translateY(0);
          }
          90% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px);
          }
        }
        
        @keyframes rotate-circle {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .slide-circle {
          animation: slide-circle 2s ease-in-out infinite;
        }
        
        .float-animate {
          animation: float-up 2s ease-in-out infinite;
        }
        
        .rotate-animate {
          animation: rotate-circle 2s ease-in-out infinite;
        }
        
        .pulse-soft {
          animation: pulse-soft 2s ease-in-out infinite;
        }
      `}</style>

      {/* Background decorative circles */}
      <div className="absolute top-10 right-10 w-20 h-20 bg-blue-100 rounded-full opacity-30" />
      <div className="absolute bottom-20 left-10 w-32 h-32 bg-blue-50 rounded-full opacity-40" />

      {/* Main content */}
      <div className="text-center z-10 relative px-6 max-w-md">
        
        {/* Icon Container */}
        <div className="mb-8 flex justify-center relative h-24">
          {/* Background circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 border-2 border-blue-200 rounded-full rotate-animate" />
          </div>
          
          {/* Inner animated circles */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-2 border-blue-400 rounded-full pulse-soft" />
          </div>
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        
        {/* Subtitle */}
        <p className="text-gray-500 text-sm mb-8">{subtitle}</p>

        {/* Loading bars */}
        <div className="flex justify-center items-end gap-1.5 h-8 mb-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1.5 bg-gradient-to-t from-blue-600 to-blue-400 rounded-full"
              style={{
                height: `${20 + i * 8}px`,
                animation: `pulse-soft 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* Status text */}
        <p className="text-xs text-gray-400 font-medium tracking-wide">
          loading civic platform
        </p>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-40" />
    </div>
  );
}


