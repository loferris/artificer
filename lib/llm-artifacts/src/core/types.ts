/**
 * Core types for the LLM Artifacts library
 *
 * This library provides utilities for detecting, extracting, and managing
 * artifacts (code, documents, diagrams, etc.) created by LLMs during conversations.
 */

/**
 * Supported artifact types
 */
export type ArtifactType =
  | 'code'           // Source code files
  | 'markdown'       // Markdown documents
  | 'mermaid'        // Mermaid diagrams
  | 'html'           // HTML documents
  | 'svg'            // SVG graphics
  | 'json'           // JSON data
  | 'yaml'           // YAML configuration
  | 'text'           // Plain text
  | 'csv'            // CSV data
  | 'react-component'; // React components (advanced)

/**
 * Programming languages for code artifacts
 */
export type CodeLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'rust'
  | 'go'
  | 'cpp'
  | 'c'
  | 'csharp'
  | 'ruby'
  | 'php'
  | 'swift'
  | 'kotlin'
  | 'sql'
  | 'bash'
  | 'shell'
  | 'powershell'
  | 'other';

/**
 * Core artifact interface
 */
export interface Artifact {
  /** Unique identifier for the artifact */
  id: string;

  /** Type of artifact */
  type: ArtifactType;

  /** Artifact content */
  content: string;

  /** Optional title/name for the artifact */
  title?: string;

  /** Optional description */
  description?: string;

  /** Programming language (for code artifacts) */
  language?: CodeLanguage;

  /** File extension (e.g., 'ts', 'md', 'svg') */
  fileExtension?: string;

  /** Suggested filename */
  filename?: string;

  /** When the artifact was created */
  createdAt: Date;

  /** When the artifact was last updated */
  updatedAt: Date;

  /** Version number (increments with each update) */
  version: number;

  /** ID of the conversation this artifact belongs to */
  conversationId?: string;

  /** ID of the message that created/updated this artifact */
  messageId?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Artifact version for tracking changes
 */
export interface ArtifactVersion {
  /** Version number */
  version: number;

  /** Artifact content at this version */
  content: string;

  /** When this version was created */
  createdAt: Date;

  /** ID of the message that created this version */
  messageId?: string;

  /** Description of changes in this version */
  changeDescription?: string;
}

/**
 * Artifact detection result
 */
export interface ArtifactDetectionResult {
  /** Whether artifacts were detected */
  hasArtifacts: boolean;

  /** Number of artifacts detected */
  count: number;

  /** Types of artifacts detected */
  types: ArtifactType[];

  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Artifact extraction options
 */
export interface ArtifactExtractionOptions {
  /** Format of the artifact markers (xml, json, markdown) */
  format?: 'xml' | 'json' | 'markdown';

  /** Whether to auto-detect artifact types */
  autoDetectType?: boolean;

  /** Whether to generate IDs for extracted artifacts */
  generateIds?: boolean;

  /** Default conversation ID for extracted artifacts */
  conversationId?: string;

  /** Default message ID for extracted artifacts */
  messageId?: string;
}

/**
 * Artifact prompt configuration
 */
export interface ArtifactPromptConfig {
  /** Enabled artifact types */
  enabledTypes?: ArtifactType[];

  /** Format to use for artifact markers */
  format?: 'xml' | 'json' | 'markdown';

  /** Whether to require titles for artifacts */
  requireTitles?: boolean;

  /** Whether to encourage filename suggestions */
  suggestFilenames?: boolean;

  /** Custom instructions to add to the prompt */
  customInstructions?: string;
}

/**
 * Storage adapter interface for persisting artifacts
 */
export interface ArtifactStorageAdapter {
  /** Save an artifact */
  save(artifact: Artifact): Promise<Artifact>;

  /** Update an existing artifact */
  update(id: string, updates: Partial<Artifact>): Promise<Artifact>;

  /** Get an artifact by ID */
  get(id: string): Promise<Artifact | null>;

  /** Delete an artifact */
  delete(id: string): Promise<boolean>;

  /** List artifacts by conversation */
  listByConversation(conversationId: string): Promise<Artifact[]>;

  /** List artifacts by type */
  listByType(type: ArtifactType): Promise<Artifact[]>;

  /** Get all versions of an artifact */
  getVersions(id: string): Promise<ArtifactVersion[]>;

  /** Save a new version of an artifact */
  saveVersion(id: string, version: ArtifactVersion): Promise<void>;
}

/**
 * Artifact create input
 */
export interface ArtifactCreateInput {
  type: ArtifactType;
  content: string;
  title?: string;
  description?: string;
  language?: CodeLanguage;
  filename?: string;
  conversationId?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Artifact update input
 */
export interface ArtifactUpdateInput {
  content?: string;
  title?: string;
  description?: string;
  language?: CodeLanguage;
  filename?: string;
  metadata?: Record<string, unknown>;
  changeDescription?: string;
}
