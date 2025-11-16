/**
 * Service for detecting and generating document updates based on LLM conversations
 */

import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import {
  buildDocumentUpdatePrompt,
  buildDocumentUpdateDecisionPrompt,
  buildChangeSummaryPrompt,
  type DocumentUpdateContext,
} from '../../../lib/prompts/document-update';

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
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for DocumentUpdateService');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
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

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Fast and cheap for decision making
        messages: [
          {
            role: 'system',
            content: 'You are an assistant that analyzes user messages to determine if project documents should be updated.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Low temperature for consistent decisions
      });

      const decision = JSON.parse(
        response.choices[0]?.message?.content || '{}'
      ) as DocumentUpdateDecision;

      logger.info('Update intent analysis complete', decision);

      return {
        shouldUpdate: decision.shouldUpdate || false,
        documentId: decision.documentId || null,
        reason: decision.reason || 'No reason provided',
        confidence: decision.confidence || 0,
      };
    } catch (error) {
      logger.error('Failed to analyze update intent', error);
      return {
        shouldUpdate: false,
        documentId: null,
        reason: 'Analysis failed',
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

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Use better model for content generation
        messages: [
          {
            role: 'system',
            content: 'You are a technical writer helping to update project documentation. Preserve formatting, structure, and tone.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5, // Moderate creativity
        max_tokens: 4000,
      });

      const updatedContent = response.choices[0]?.message?.content || context.documentContent;

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

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a technical writer summarizing document changes.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content || 'Unable to generate summary';
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
