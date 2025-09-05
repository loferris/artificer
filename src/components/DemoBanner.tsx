import React from 'react';

export const DemoBanner: React.FC = () => {
  // Only show in demo mode
  if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_DEMO_MODE) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 text-center text-sm">
      <div className="flex items-center justify-center space-x-2">
        <span className="animate-pulse">🎉</span>
        <span className="font-medium">
          Demo Mode: This showcases the chat interface with a smart mock assistant. 
          <span className="hidden sm:inline"> Try asking about features or exporting conversations!</span>
        </span>
        <span className="animate-pulse">✨</span>
      </div>
    </div>
  );
};
