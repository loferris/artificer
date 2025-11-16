/**
 * React hook for managing artifacts
 */

import { useCallback, useState } from 'react';
import { trpc } from '../lib/trpc/client';
import type { Artifact } from '../../lib/llm-artifacts/src/core/types';

export function useArtifacts(conversationId?: string) {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);

  // Query artifacts for the current conversation
  const { data: artifactsData, refetch: refetchArtifacts } = trpc.artifacts.listByConversation.useQuery(
    { conversationId: conversationId || '' },
    { enabled: !!conversationId }
  );

  // Mutations
  const createMutation = trpc.artifacts.create.useMutation();
  const updateMutation = trpc.artifacts.update.useMutation();
  const deleteMutation = trpc.artifacts.delete.useMutation();
  const extractMutation = trpc.artifacts.extract.useMutation();
  const promoteToProjectMutation = trpc.artifacts.promoteToProject.useMutation();

  const artifacts = artifactsData?.artifacts || [];
  const selectedArtifact = artifacts.find((a) => a.id === selectedArtifactId) || null;

  /**
   * Create a new artifact
   */
  const createArtifact = useCallback(
    async (input: {
      type: string;
      content: string;
      title?: string;
      description?: string;
      language?: string;
      filename?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const result = await createMutation.mutateAsync({
        ...input,
        conversationId,
      });

      if (result.success) {
        await refetchArtifacts();
        return result.artifact;
      }

      return null;
    },
    [createMutation, conversationId, refetchArtifacts]
  );

  /**
   * Update an existing artifact
   */
  const updateArtifact = useCallback(
    async (
      artifactId: string,
      updates: {
        content?: string;
        title?: string;
        description?: string;
        language?: string;
        filename?: string;
        metadata?: Record<string, unknown>;
        changeDescription?: string;
      }
    ) => {
      const result = await updateMutation.mutateAsync({
        artifactId,
        ...updates,
      });

      if (result.success) {
        await refetchArtifacts();
        return result.artifact;
      }

      return null;
    },
    [updateMutation, refetchArtifacts]
  );

  /**
   * Delete an artifact
   */
  const deleteArtifact = useCallback(
    async (artifactId: string) => {
      const result = await deleteMutation.mutateAsync({ artifactId });

      if (result.success) {
        await refetchArtifacts();
        // Clear selection if deleted artifact was selected
        if (selectedArtifactId === artifactId) {
          setSelectedArtifactId(null);
        }
      }

      return result.success;
    },
    [deleteMutation, refetchArtifacts, selectedArtifactId]
  );

  /**
   * Extract artifacts from text (typically an LLM response)
   */
  const extractArtifacts = useCallback(
    async (text: string, messageId?: string) => {
      const result = await extractMutation.mutateAsync({
        text,
        conversationId,
        messageId,
      });

      if (result.success) {
        await refetchArtifacts();
        return result.artifacts;
      }

      return [];
    },
    [extractMutation, conversationId, refetchArtifacts]
  );

  /**
   * Select an artifact for viewing/editing
   */
  const selectArtifact = useCallback((artifactId: string | null) => {
    setSelectedArtifactId(artifactId);
  }, []);

  /**
   * Promote artifact to project knowledge (make it searchable in RAG)
   */
  const promoteToProject = useCallback(
    async (artifactId: string, projectId: string) => {
      const result = await promoteToProjectMutation.mutateAsync({
        artifactId,
        projectId,
      });

      if (result.success) {
        await refetchArtifacts();
        return true;
      }

      return false;
    },
    [promoteToProjectMutation, refetchArtifacts]
  );

  return {
    artifacts,
    selectedArtifact,
    selectedArtifactId,
    isLoading: createMutation.isLoading || updateMutation.isLoading || deleteMutation.isLoading,
    isExtracting: extractMutation.isLoading,
    isPromoting: promoteToProjectMutation.isLoading,
    createArtifact,
    updateArtifact,
    deleteArtifact,
    extractArtifacts,
    selectArtifact,
    promoteToProject,
    refetchArtifacts,
  };
}
