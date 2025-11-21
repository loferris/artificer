/**
 * Hook for managing document update proposals in the chat interface
 */

import { useState, useCallback } from 'react';
import { trpc } from '../lib/trpc/client';
import { clientLogger } from '../utils/clientLogger';

export interface DocumentUpdateProposal {
  documentId: string;
  documentName: string;
  originalContent: string;
  proposedContent: string;
  reason: string;
  changeSummary: string;
}

export function useDocumentUpdate() {
  const [currentProposal, setCurrentProposal] = useState<DocumentUpdateProposal | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const proposeUpdateMutation = trpc.projects.proposeDocumentUpdate.useMutation();
  const updateDocumentMutation = trpc.projects.updateDocument.useMutation();
  const utils = trpc.useUtils();

  /**
   * Generate a document update proposal
   */
  const proposeUpdate = useCallback(
    async (
      documentId: string,
      conversationContext: string,
      userRequest: string
    ): Promise<DocumentUpdateProposal | null> => {
      setIsGenerating(true);

      try {
        clientLogger.info('Proposing document update', {
          documentId,
          requestLength: userRequest.length,
        });

        const result = await proposeUpdateMutation.mutateAsync({
          documentId,
          conversationContext,
          userRequest,
        });

        if (result.success && result.proposal) {
          const proposal: DocumentUpdateProposal = {
            documentId: result.proposal.documentId,
            documentName: result.proposal.documentName,
            originalContent: result.proposal.originalContent,
            proposedContent: result.proposal.proposedContent,
            reason: result.proposal.reason,
            changeSummary: result.proposal.changeSummary,
          };

          setCurrentProposal(proposal);
          clientLogger.info('Document update proposal created', { documentId });
          return proposal;
        } else {
          clientLogger.error('Failed to create proposal', new Error(result.error || 'Unknown error'));
          return null;
        }
      } catch (error) {
        clientLogger.error('Error proposing document update', error as Error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [proposeUpdateMutation]
  );

  /**
   * Apply the current proposal
   */
  const applyProposal = useCallback(async (): Promise<boolean> => {
    if (!currentProposal) {
      clientLogger.warn('No proposal to apply');
      return false;
    }

    setIsApplying(true);

    try {
      clientLogger.info('Applying document update', {
        documentId: currentProposal.documentId,
      });

      const result = await updateDocumentMutation.mutateAsync({
        documentId: currentProposal.documentId,
        content: currentProposal.proposedContent,
        reason: currentProposal.reason,
      });

      if (result.success) {
        clientLogger.info('Document updated successfully', {
          documentId: currentProposal.documentId,
        });

        // Invalidate queries to refresh document list
        await utils.projects.getDocuments.invalidate();
        await utils.projects.getDocument.invalidate();

        // Clear the current proposal
        setCurrentProposal(null);

        return true;
      } else {
        clientLogger.error('Failed to apply update', new Error(result.error || 'Unknown error'));
        return false;
      }
    } catch (error) {
      clientLogger.error('Error applying document update', error as Error);
      return false;
    } finally {
      setIsApplying(false);
    }
  }, [currentProposal, updateDocumentMutation, utils]);

  /**
   * Reject the current proposal
   */
  const rejectProposal = useCallback(() => {
    clientLogger.info('Document update proposal rejected', {
      documentId: currentProposal?.documentId,
    });
    setCurrentProposal(null);
  }, [currentProposal]);

  /**
   * Check if a message suggests updating a document
   */
  const shouldSuggestUpdate = useCallback((message: string): boolean => {
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

    const lowerMessage = message.toLowerCase();

    const hasUpdateKeyword = updateKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    const hasDocumentKeyword = documentKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    return hasUpdateKeyword && hasDocumentKeyword;
  }, []);

  return {
    // State
    currentProposal,
    isGenerating,
    isApplying,

    // Actions
    proposeUpdate,
    applyProposal,
    rejectProposal,
    shouldSuggestUpdate,
  };
}
