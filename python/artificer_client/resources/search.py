"""
Search resource (semantic vector search)
"""

from typing import List, Optional
from .base import BaseResource
from ..types import SearchResponse


class Search(BaseResource):
    """Semantic search API resource."""

    def search_documents(
        self,
        project_id: str,
        query: str,
        limit: int = 10,
        min_score: float = 0.7,
        document_ids: Optional[List[str]] = None
    ) -> SearchResponse:
        """
        Search documents using semantic similarity.

        Uses OpenAI embeddings and Chroma vector database to find
        semantically similar content.

        Args:
            project_id: Project ID to search within
            query: Search query (1-1000 characters)
            limit: Maximum results to return (1-50, default 10)
            min_score: Minimum similarity score (0-1, default 0.7)
            document_ids: Optional list of document IDs to filter

        Returns:
            Search results with similarity scores

        Example:
            >>> results = client.search.search_documents(
            ...     project_id="proj_123",
            ...     query="machine learning applications",
            ...     limit=5,
            ...     min_score=0.8
            ... )
            >>> for result in results['results']:
            ...     print(f"{result['score']:.2f}: {result['content'][:50]}...")
        """
        input_data = {
            "projectId": project_id,
            "query": query,
            "limit": limit,
            "minScore": min_score
        }

        if document_ids:
            input_data["documentIds"] = document_ids

        return self._trpc_request("search.searchDocuments", input_data)

    def reindex_document(self, document_id: str) -> dict:
        """
        Re-index a document's embeddings.

        Forces regeneration of chunks and embeddings for a document.

        Args:
            document_id: Document ID to reindex

        Returns:
            Reindex result

        Example:
            >>> client.search.reindex_document("doc_123")
        """
        return self._trpc_request("search.reindexDocument", {"documentId": document_id})

    def get_stats(self, project_id: str) -> dict:
        """
        Get embedding statistics for a project.

        Args:
            project_id: Project ID

        Returns:
            Embedding statistics

        Example:
            >>> stats = client.search.get_stats("proj_123")
            >>> print(f"Total chunks: {stats['totalChunks']}")
        """
        return self._trpc_request("search.getEmbeddingStats", {"projectId": project_id})

    def health_check(self) -> dict:
        """
        Check vector database health.

        Returns:
            Health status

        Example:
            >>> health = client.search.health_check()
            >>> print(f"Status: {health['status']}")
        """
        return self._trpc_request("search.healthCheck", {})
