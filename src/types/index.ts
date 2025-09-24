// Base message interface - canonical definition
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  cost?: number;
  tokens?: number | null;
  conversationId?: string;
  parentId?: string | null;
}

// Extended message for streaming scenarios
export interface StreamingMessage extends Message {
  isComplete?: boolean;
  isStreaming?: boolean;
}

// Database-compatible message (matches Prisma schema)
export interface DatabaseMessage extends Omit<Message, 'timestamp'> {
  createdAt: Date;
  conversationId: string;
  tokens: number;
}

// Base conversation interface - canonical definition  
export interface Conversation {
  id: string;
  title: string | null;
  messages?: Message[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

// Database-compatible conversation (matches Prisma schema)
export interface DatabaseConversation extends Omit<Conversation, 'messages' | 'tags'> {
  title: string | null;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface AssistantResponse {
  response: string;
  model: string;
  cost: number;
}

export interface AssistantService {
  getResponse(
    userMessage: string,
    conversationHistory?: Message[],
  ): Promise<string | AssistantResponse>;
  getModelUsageStats?: () => Array<{ model: string; count: number; percentage: number }>;
}

export type ModelType = 'claude' | 'deepseek' | 'qwen' | 'mock';

// Common UI types
export type ViewMode = 'terminal' | 'chat';
export type ThemeMode = 'purple-rich' | 'amber-forest' | 'cyan-light';
export type ExportFormat = 'markdown' | 'json';

// Component prop types - centralized to avoid duplication
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface MessageComponentProps extends BaseComponentProps {
  message: Message;
  isStreaming?: boolean;
  isComplete?: boolean;
}

export interface ConversationComponentProps extends BaseComponentProps {
  conversation: Conversation;
  messages?: Message[];
  onMessageSend?: (content: string) => void;
  onConversationSelect?: (id: string) => void;
}

export interface ChatInputProps extends BaseComponentProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

// Hook return types - standardize hook interfaces
export interface ChatState {
  currentConversationId: string | null;
  input: string;
  messages: Message[];
  loading: boolean;
  error: string | null;
}

export interface ChatActions {
  setCurrentConversation: (id: string | null) => void;
  updateInput: (input: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export interface StreamingState {
  isStreaming: boolean;
  currentMessage: StreamingMessage | null;
  streamingError: string | null;
}

// Event handler types
export type MessageHandler = (content: string) => void | Promise<void>;
export type ConversationHandler = (conversationId: string) => void;
export type ThemeHandler = (theme: ThemeMode) => void;
export type ViewModeHandler = (mode: ViewMode) => void;
