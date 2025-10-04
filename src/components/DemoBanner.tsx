import React, { useState, useEffect } from 'react';

export const DemoBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Check demo mode on client side only to avoid hydration mismatch
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
                       window.location.hostname.includes('vercel.app') || 
                       window.location.hostname.includes('demo');
    
    setShowBanner(isDemoMode);
  }, []);

  // Don't render anything on server side or if not demo mode
  if (!isClient || !showBanner) {
    return null;
  }

  return (
    <div className='bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-4 py-3 text-center text-sm shadow-lg'>
      <div className='flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-3'>
        <div className='flex items-center space-x-2'>
          <span className='animate-bounce'>🚀</span>
          <span className='font-bold text-base'>AI Workflow Engine Demo</span>
          <span className='animate-bounce'>✨</span>
        </div>
        <div className='hidden sm:block w-px h-4 bg-white/30'></div>
        <span className='font-medium text-xs sm:text-sm'>
          <span className='hidden lg:inline'>Try dual interfaces • </span>
          <span className='hidden md:inline'>Use /commands • </span>
          Switch themes • Export conversations
        </span>
        <div className='flex items-center space-x-1 text-xs bg-white/20 rounded-full px-2 py-1'>
          <span>⌘</span>
          <span>No API needed</span>
        </div>
      </div>
    </div>
  );
};
