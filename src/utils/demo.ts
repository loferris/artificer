// Demo mode utilities
export const isDemoMode = (): boolean => {
  return (
    process.env.DEMO_MODE === 'true' ||
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    process.env.VERCEL_ENV === 'preview' ||
    (typeof window !== 'undefined' && window.location?.hostname
      ? (window.location.hostname.includes('vercel.app') ||
         window.location.hostname.includes('demo'))
      : false)
  );
};

export const isServerSideDemo = (): boolean => {
  return (
    process.env.DEMO_MODE === 'true' ||
    process.env.VERCEL_ENV === 'preview' ||
    (typeof window === 'undefined' && process.env.VERCEL_ENV === 'preview')
  );
};

export const isClientSideDemo = (): boolean => {
  return (
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
    (typeof window !== 'undefined' && window.location?.hostname
      ? (window.location.hostname.includes('vercel.app') ||
         window.location.hostname.includes('demo'))
      : false)
  );
};

export const shouldUseDemoFallback = (error: any): boolean => {
  if (!error) return false;

  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.data?.code || '';

  return (
    errorCode === 'INTERNAL_SERVER_ERROR' ||
    errorMessage.includes('json.parse') ||
    errorMessage.includes('405') ||
    errorMessage.includes('database') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('prisma') ||
    errorMessage.includes('enoent')
  );
};
