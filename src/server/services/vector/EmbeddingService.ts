/**
 * EmbeddingService - Generates embeddings for text using OpenAI API
 *
 * Responsibilities:
 * - Generate embeddings for document chunks
 * - Batch embedding generation for efficiency
 * - Handle rate limiting and retries
 *
 * Note: Currently uses OpenAI, can be swapped for Vertex AI later
 */

import OpenAI from 'openai';

export interface EmbeddingServiceConfig {
  apiKey?: string;
  model?: string;
  dimensions?: number;
  batchSize?: number;
}

export class EmbeddingService {
  private client: OpenAI;
  private model: string;
  private dimensions: number;
  private batchSize: number;

  constructor(config: EmbeddingServiceConfig = {}) {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key is required for embedding generation');
    }

    this.client = new OpenAI({ apiKey });
    this.model = config.model || 'text-embedding-3-small';
    this.dimensions = config.dimensions || 1536;
    this.batchSize = config.batchSize || 100;
  }

  /**
   * Generate embeddings for a batch of texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const embeddings: number[][] = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchEmbeddings = await this.generateBatch(batch);
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }

  /**
   * Generate embeddings for a single batch (internal method)
   */
  private async generateBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
        dimensions: this.dimensions,
      });

      return response.data.map(item => item.embedding);
    } catch (error: any) {
      // Handle rate limiting with exponential backoff
      if (error?.status === 429) {
        const retryAfter = error?.headers?.['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000;

        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.generateBatch(texts); // Retry
      }

      throw new Error(`Failed to generate embeddings: ${error?.message || error}`);
    }
  }

  /**
   * Calculate token usage for embedding generation
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate estimated cost for embedding texts
   */
  estimateCost(texts: string[]): number {
    const totalTokens = texts.reduce((sum, text) => sum + this.estimateTokens(text), 0);

    // text-embedding-3-small pricing: $0.00002 per 1K tokens
    const costPer1kTokens = 0.00002;
    return (totalTokens / 1000) * costPer1kTokens;
  }

  /**
   * Get embedding model information
   */
  getModelInfo(): {
    model: string;
    dimensions: number;
    maxTokens: number;
    costPer1kTokens: number;
  } {
    return {
      model: this.model,
      dimensions: this.dimensions,
      maxTokens: 8191, // Max input tokens for text-embedding-3-small
      costPer1kTokens: 0.00002,
    };
  }

  /**
   * Validate that a text is suitable for embedding
   */
  validateText(text: string): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: 'Text cannot be empty' };
    }

    const tokens = this.estimateTokens(text);
    if (tokens > 8191) {
      return {
        valid: false,
        error: `Text too long (${tokens} tokens, max 8191)`
      };
    }

    return { valid: true };
  }

  /**
   * Health check - verify OpenAI API is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.generateEmbedding('health check test');
      return true;
    } catch {
      return false;
    }
  }
}
