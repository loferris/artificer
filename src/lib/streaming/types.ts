// Content types that can be detected and handled differently
export enum ContentType {
  TEXT = 'text',
  LIST = 'list',
  CODE_BLOCK = 'code',
  HEADER = 'header',
  UNKNOWN = 'unknown',
}

// Streaming strategies for different content types
export enum StreamingStrategy {
  WORD_BY_WORD = 'word-by-word', // Stream word by word for immediate feedback
  BUFFERED = 'buffered', // Buffer until complete, then display
  IMMEDIATE = 'immediate', // Display immediately when detected
}

// Configuration for how each content type should be streamed
export interface ContentTypeConfig {
  strategy: StreamingStrategy;
  bufferUntilComplete?: boolean;
  showLoadingPlaceholder?: boolean;
  customRenderer?: (content: string) => React.ReactNode;
}

// A parsed content segment with its type and content
export interface ContentSegment {
  type: ContentType;
  content: string;
  isComplete: boolean;
  metadata?: {
    language?: string; // For code blocks
    listType?: 'ordered' | 'unordered'; // For lists
    level?: number; // For headers
  };
}

// A streaming chunk that may contain multiple content segments
export interface ParsedStreamChunk {
  segments: ContentSegment[];
  buffer: string; // Unparsed content still in buffer
  isComplete: boolean;
}

// Configuration mapping content types to their streaming behavior
export const DEFAULT_CONTENT_CONFIG: Record<ContentType, ContentTypeConfig> = {
  [ContentType.TEXT]: {
    strategy: StreamingStrategy.WORD_BY_WORD,
    bufferUntilComplete: false,
    showLoadingPlaceholder: false,
  },
  [ContentType.LIST]: {
    strategy: StreamingStrategy.BUFFERED,
    bufferUntilComplete: true,
    showLoadingPlaceholder: true,
  },
  [ContentType.CODE_BLOCK]: {
    strategy: StreamingStrategy.BUFFERED,
    bufferUntilComplete: true,
    showLoadingPlaceholder: true,
  },
  [ContentType.HEADER]: {
    strategy: StreamingStrategy.IMMEDIATE,
    bufferUntilComplete: false,
    showLoadingPlaceholder: false,
  },
  [ContentType.UNKNOWN]: {
    strategy: StreamingStrategy.WORD_BY_WORD,
    bufferUntilComplete: false,
    showLoadingPlaceholder: false,
  },
};
