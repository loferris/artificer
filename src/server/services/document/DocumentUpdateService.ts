/**
 * Service for detecting and generating document updates based on LLM conversations
 */

import { z } from 'zod';
import { logger } from '../../utils/logger';
import { models } from '../../config/models';
import {
  buildDocumentUpdatePrompt,
  buildDocumentUpdateDecisionPrompt,
  buildChangeSummaryPrompt,
  type DocumentUpdateContext,
} from '../../../lib/prompts/document-update';

// Zod schema for validating LLM JSON responses
const DocumentUpdateDecisionSchema = z.object({
  shouldUpdate: z.boolean(),
  documentId: z.string().nullable().optional(),
  reason: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export interface DocumentUpdateDecision {
  shouldUpdate: boolean;
  documentId: string | null;
  reason: string;
  confidence: number;
}

export interface DocumentUpdateProposal {
  documentId: string;
  originalContent: string;
  proposedContent: string;
  reason: string;
  changeSummary: string;
}

export class DocumentUpdateService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY or OPENAI_API_KEY is required for DocumentUpdateService');
    }

    this.apiKey = apiKey;
    this.baseUrl = 'https://openrouter.ai/api/v1';
  }

  /**
   * Make a request to OpenRouter API
   */
  private async makeRequest(
    messages: Array<{ role: string; content: string }>,
    model: string,
    options: {
      temperature?: number;
      max_tokens?: number;
      response_format?: { type: string };
    } = {}
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Workflow Engine',
      },
      body: JSON.stringify({
        model,
        messages,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Analyze a user message to determine if any documents should be updated
   */
  async analyzeUpdateIntent(
    userMessage: string,
    projectDocuments: Array<{ id: string; filename: string; content: string }>
  ): Promise<DocumentUpdateDecision> {
    try {
      logger.info('Analyzing document update intent', {
        messageLength: userMessage.length,
        documentCount: projectDocuments.length,
      });

      const prompt = buildDocumentUpdateDecisionPrompt(userMessage, projectDocuments);

      const content = await this.makeRequest(
        [
          {
            role: 'system',
            content: 'You are an assistant that analyzes user messages to determine if project documents should be updated.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        models.documentUpdateDecision, // Fast and cheap for decision making
        {
          response_format: { type: 'json_object' },
          temperature: 0.3, // Low temperature for consistent decisions
        }
      );

      // Safely parse and validate JSON response with zod
      if (!content || content.trim().length === 0) {
        throw new Error('Empty response from LLM');
      }

      let decision: DocumentUpdateDecision;
      try {
        const parsed = JSON.parse(content);
        const validated = DocumentUpdateDecisionSchema.parse(parsed);

        decision = {
          shouldUpdate: validated.shouldUpdate,
          documentId: validated.documentId ?? null,
          reason: validated.reason ?? 'No reason provided',
          confidence: validated.confidence ?? 0,
        };
      } catch (parseError) {
        logger.error('Failed to parse LLM decision', { content, parseError });
        throw new Error('Invalid JSON response from LLM');
      }

      logger.info('Update intent analysis complete', { ...decision } as Record<string, unknown>);

      return decision;
    } catch (error) {
      logger.error('Failed to analyze update intent', error);
      return {
        shouldUpdate: false,
        documentId: null,
        reason: error instanceof Error ? error.message : 'Analysis failed',
        confidence: 0,
      };
    }
  }

  /**
   * Generate an updated version of a document based on conversation context
   */
  async generateDocumentUpdate(
    context: DocumentUpdateContext
  ): Promise<string> {
    try {
      logger.info('Generating document update', {
        documentName: context.documentName,
        contentLength: context.documentContent.length,
      });

      const prompt = buildDocumentUpdatePrompt(context);

      const updatedContent = await this.makeRequest(
        [
          {
            role: 'system',
            content: 'You are a technical writer helping to update project documentation. Preserve formatting, structure, and tone.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        models.documentUpdateGeneration, // High-quality model for content generation
        {
          temperature: 0.5, // Moderate creativity
          max_tokens: 4000,
        }
      );

      if (!updatedContent || updatedContent.trim().length === 0) {
        logger.warn('Empty content generated, returning original');
        return context.documentContent;
      }

      logger.info('Document update generated', {
        originalLength: context.documentContent.length,
        updatedLength: updatedContent.length,
      });

      return updatedContent;
    } catch (error) {
      logger.error('Failed to generate document update', error);
      throw new Error('Failed to generate document update');
    }
  }

  /**
   * Generate a summary of changes between two document versions
   */
  async generateChangeSummary(
    originalContent: string,
    updatedContent: string
  ): Promise<string> {
    try {
      const prompt = buildChangeSummaryPrompt(originalContent, updatedContent);

      const summary = await this.makeRequest(
        [
          {
            role: 'system',
            content: 'You are a technical writer summarizing document changes.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        models.documentUpdateSummary, // Fast and cheap for summaries
        {
          temperature: 0.3,
          max_tokens: 500,
        }
      );

      return summary || 'Unable to generate summary';
    } catch (error) {
      logger.error('Failed to generate change summary', error);
      return 'Summary generation failed';
    }
  }

  /**
   * Create a complete document update proposal
   */
  async createUpdateProposal(
    documentId: string,
    documentName: string,
    documentContent: string,
    conversationContext: string,
    userRequest: string
  ): Promise<DocumentUpdateProposal> {
    try {
      logger.info('Creating document update proposal', { documentId, documentName });

      // Generate the updated content
      const proposedContent = await this.generateDocumentUpdate({
        documentName,
        documentContent,
        conversationContext,
        userRequest,
      });

      // Generate a summary of changes
      const changeSummary = await this.generateChangeSummary(
        documentContent,
        proposedContent
      );

      return {
        documentId,
        originalContent: documentContent,
        proposedContent,
        reason: userRequest,
        changeSummary,
      };
    } catch (error) {
      logger.error('Failed to create update proposal', error);
      throw new Error('Failed to create update proposal');
    }
  }

  /**
   * Quick check if a message mentions document updates
   */
  quickUpdateCheck(message: string): boolean {
    const updateKeywords = [
      'update',
      'modify',
      'change',
      'edit',
      'fix',
      'add to',
      'remove from',
      'revise',
      'improve',
      'correct',
    ];

    const documentKeywords = [
      'readme',
      'documentation',
      'doc',
      'guide',
      'manual',
      'file',
      'document',
    ];

    const hasUpdateKeyword = updateKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );

    const hasDocumentKeyword = documentKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );

    return hasUpdateKeyword && hasDocumentKeyword;
  }
}
