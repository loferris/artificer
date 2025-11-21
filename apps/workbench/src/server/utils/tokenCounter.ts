/**
 * Token counting utilities for conversation context management
 * Uses tiktoken for accurate token counting across different models
 */

import { encoding_for_model, Tiktoken, TiktokenModel } from 'tiktoken';
import { logger } from './logger';

// Cache encodings to avoid repeated initialization
const encodingCache = new Map<string, Tiktoken>();

/**
 * Get or create cached encoding for a model
 */
function getEncoding(model: string): Tiktoken {
  if (encodingCache.has(model)) {
    return encodingCache.get(model)!;
  }

  try {
    // Map common model names to tiktoken models
    const tiktokenModel = mapToTiktokenModel(model);
    const encoding = encoding_for_model(tiktokenModel);
    encodingCache.set(model, encoding);
    return encoding;
  } catch (error) {
    // Fallback to cl100k_base (used by GPT-4, Claude, etc.)
    logger.warn(`Unknown model for tiktoken: ${model}, falling back to cl100k_base`);
    if (!encodingCache.has('fallback')) {
      const encoding = encoding_for_model('gpt-4');
      encodingCache.set('fallback', encoding);
    }
    return encodingCache.get('fallback')!;
  }
}

/**
 * Map model identifiers to tiktoken model names
 */
function mapToTiktokenModel(model: string): TiktokenModel {
  // Claude models use cl100k_base (same as GPT-4)
  if (model.includes('claude')) {
    return 'gpt-4';
  }

  // DeepSeek, Qwen, and other models typically use cl100k_base
  if (model.includes('deepseek') || model.includes('qwen')) {
    return 'gpt-4';
  }

  // GPT models
  if (model.includes('gpt-4')) {
    return 'gpt-4';
  }
  if (model.includes('gpt-3.5')) {
    return 'gpt-3.5-turbo';
  }

  // Default to GPT-4 encoding (cl100k_base)
  return 'gpt-4';
}

/**
 * Count tokens in a single message
 */
export function countMessageTokens(content: string, model: string = 'gpt-4'): number {
  const encoding = getEncoding(model);
  const tokens = encoding.encode(content);
  return tokens.length;
}

/**
 * Count tokens in a conversation history
 * Includes overhead for message formatting (role, separators, etc.)
 */
export function countConversationTokens(
  messages: Array<{ role: string; content: string }>,
  model: string = 'gpt-4',
): number {
  const encoding = getEncoding(model);

  let totalTokens = 0;

  // Message overhead varies by model, but typically ~4 tokens per message
  const messageOverhead = 4;

  for (const message of messages) {
    const contentTokens = encoding.encode(message.content).length;
    const roleTokens = encoding.encode(message.role).length;
    totalTokens += contentTokens + roleTokens + messageOverhead;
  }

  // Add overhead for conversation framing (typically ~3 tokens)
  totalTokens += 3;

  return totalTokens;
}

/**
 * Estimate how many messages fit within a token budget
 * Returns the number of messages from the end that fit
 */
export function estimateMessageFit(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  model: string = 'gpt-4',
): { count: number; totalTokens: number } {
  const encoding = getEncoding(model);
  const messageOverhead = 4;

  let totalTokens = 3; // Conversation framing overhead
  let count = 0;

  // Count from the end (most recent messages)
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const contentTokens = encoding.encode(message.content).length;
    const roleTokens = encoding.encode(message.role).length;
    const messageTokens = contentTokens + roleTokens + messageOverhead;

    if (totalTokens + messageTokens > maxTokens) {
      break;
    }

    totalTokens += messageTokens;
    count++;
  }

  return { count, totalTokens };
}

/**
 * Calculate optimal context window configuration
 * Returns token budgets for different parts of the context
 */
export interface ContextWindowConfig {
  modelContextWindow: number;
  reservedForOutput: number;
  reservedForSystem: number;
  availableForHistory: number;
  recentMessagesWindow: number;
  summaryWindow: number;
}

export function calculateContextWindow(
  modelContextWindow: number = 200000, // Claude default
  outputTokens: number = 4096,
): ContextWindowConfig {
  // Reserve tokens for various purposes
  const reservedForOutput = outputTokens;
  const reservedForSystem = 2000; // System prompt, RAG context, etc.
  const availableForHistory = modelContextWindow - reservedForOutput - reservedForSystem;

  // Split history into recent (verbatim) and old (summarized)
  // Keep last ~25% of available context as verbatim messages
  const recentMessagesWindow = Math.floor(availableForHistory * 0.25);
  const summaryWindow = availableForHistory - recentMessagesWindow;

  return {
    modelContextWindow,
    reservedForOutput,
    reservedForSystem,
    availableForHistory,
    recentMessagesWindow,
    summaryWindow,
  };
}

/**
 * Free cached encodings (useful for testing or memory management)
 */
export function clearEncodingCache(): void {
  for (const encoding of encodingCache.values()) {
    encoding.free();
  }
  encodingCache.clear();
}
