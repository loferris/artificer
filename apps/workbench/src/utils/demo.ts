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

/**
 * Generate a simple demo response for demo mode
 */
export const generateDemoResponse = (userMessage: string): { content: string; model: string; cost: number } => {
  const lowerMessage = userMessage.toLowerCase();

  // Simple keyword-based responses for demo mode
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return {
      content: "Hello! I'm running in demo mode. This is a simulated conversation to showcase the AI Workflow Engine interface. Try asking me questions or exploring the features!",
      model: 'demo-assistant-v1',
      cost: 0.001,
    };
  }

  if (lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('?')) {
    return {
      content: `That's a great question! In demo mode, I provide simulated responses to help you explore the interface. The AI Workflow Engine supports RAG-powered conversations, project organization, and conversation export. Deploy with a database and API keys to unlock full AI capabilities.`,
      model: 'demo-assistant-v1',
      cost: 0.001,
    };
  }

  // Default response
  return {
    content: `I hear you! This is a demo response to "${userMessage}". To experience real AI-powered conversations with RAG support, deploy the application with your own API keys and database. Explore the UI to see project management, conversation history, and export features!`,
    model: 'demo-assistant-v1',
    cost: 0.001,
  };
};
