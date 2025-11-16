/**
 * LLM Artifacts Library
 *
 * A framework-agnostic library for detecting, extracting, and managing
 * artifacts (code, documents, diagrams, etc.) created by LLMs during conversations.
 *
 * @packageDocumentation
 */

// Core types
export type {
  Artifact,
  ArtifactType,
  CodeLanguage,
  ArtifactVersion,
  ArtifactDetectionResult,
  ArtifactExtractionOptions,
  ArtifactPromptConfig,
  ArtifactStorageAdapter,
  ArtifactCreateInput,
  ArtifactUpdateInput,
} from './core/types';

// Core functionality
export { ArtifactDetector } from './core/detector';
export { ArtifactExtractor } from './core/extractor';

// Prompt templates
export {
  buildArtifactSystemPrompt,
  buildArtifactCreationPrompt,
  buildArtifactUpdatePrompt,
} from './prompts/templates';
