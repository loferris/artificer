"""
Search resource (semantic vector search)
"""

from typing import List, Optional, Dict, Any
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

    # ==================== LlamaIndex Enhanced Retrieval ====================

    def llamaindex_available(self) -> bool:
        """
        Check if LlamaIndex is available.

        Returns:
            bool: True if LlamaIndex is available

        Example:
            >>> if client.search.llamaindex_available():
            ...     print("LlamaIndex ready!")
        """
        result = self._trpc_request("search.llamaIndexAvailable", {})
        return result.get('available', False)

    def rerank_results(
        self,
        search_results: List[Dict[str, Any]],
        query: str,
        model: str = "ms-marco-mini",
        top_n: int = 5
    ) -> Dict[str, Any]:
        """
        Rerank search results using cross-encoder for better quality.

        This dramatically improves retrieval quality by using a cross-encoder
        to rerank initial vector search results. Typically improves accuracy by 20-40%.

        Args:
            search_results: Initial search results from search_documents()
            query: Original query
            model: Reranker model ('ms-marco-mini', 'ms-marco-base', 'bge-reranker')
            top_n: Number of results to return after reranking (1-20)

        Returns:
            Reranked search results

        Example:
            >>> # Get more candidates first
            >>> candidates = client.search.search_documents(proj_id, query, limit=20)
            >>> # Rerank to get best 5
            >>> reranked = client.search.rerank_results(
            ...     candidates['results'],
            ...     query,
            ...     model="ms-marco-mini",
            ...     top_n=5
            ... )
            >>> print(f"Best result: {reranked['results'][0]['content'][:100]}")
        """
        return self._trpc_request("search.rerankResults", {
            "searchResults": search_results,
            "query": query,
            "model": model,
            "topN": top_n
        })

    def search_with_reranking(
        self,
        project_id: str,
        query: str,
        top_k: int = 20,
        top_n: int = 5,
        model: str = "ms-marco-mini",
        min_score: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Search with automatic reranking (convenience method).

        Combines vector search + reranking in one call for best quality.

        Args:
            project_id: Project ID
            query: Search query
            top_k: Number of candidates to retrieve (10-100, default 20)
            top_n: Number of results after reranking (1-20, default 5)
            model: Reranker model
            min_score: Minimum similarity score for candidates

        Returns:
            Reranked search results

        Example:
            >>> # One-step search with reranking
            >>> results = client.search.search_with_reranking(
            ...     "proj_123",
            ...     "machine learning applications",
            ...     top_k=20,
            ...     top_n=5
            ... )
            >>> # Results are automatically reranked for best quality
        """
        return self._trpc_request("search.searchWithReranking", {
            "projectId": project_id,
            "query": query,
            "topK": top_k,
            "topN": top_n,
            "model": model,
            "minScore": min_score
        })

    def generate_hypothetical_document(
        self,
        query: str,
        llm_model: str = "gpt-4o-mini"
    ) -> Dict[str, Any]:
        """
        Generate hypothetical document for HyDE retrieval.

        HyDE (Hypothetical Document Embeddings) improves retrieval by generating
        a hypothetical answer, then searching with that. Often improves results by 15-30%.

        Args:
            query: User query
            llm_model: LLM for generation (default: gpt-4o-mini)

        Returns:
            dict with 'query' and 'hypothetical_document'

        Example:
            >>> hypo = client.search.generate_hypothetical_document(
            ...     "What are benefits of renewable energy?"
            ... )
            >>> print(f"Hypothetical doc: {hypo['hypothetical_document']}")
            >>> # Now embed and search with this hypothetical doc
        """
        return self._trpc_request("search.generateHypotheticalDocument", {
            "query": query,
            "llmModel": llm_model
        })

    def generate_query_variations(
        self,
        query: str,
        num_variations: int = 3,
        llm_model: str = "gpt-4o-mini"
    ) -> Dict[str, Any]:
        """
        Generate query variations for query fusion.

        Query fusion searches with multiple query variations and combines results
        for better coverage of relevant documents.

        Args:
            query: Original query
            num_variations: Number of variations to generate (1-5)
            llm_model: LLM for generation

        Returns:
            dict with 'original_query' and 'variations'

        Example:
            >>> variations = client.search.generate_query_variations(
            ...     "machine learning benefits",
            ...     num_variations=3
            ... )
            >>> for var in variations['variations']:
            ...     print(f"- {var}")
        """
        return self._trpc_request("search.generateQueryVariations", {
            "query": query,
            "numVariations": num_variations,
            "llmModel": llm_model
        })

    def decompose_query(
        self,
        query: str,
        llm_model: str = "gpt-4o-mini"
    ) -> Dict[str, Any]:
        """
        Decompose complex query into sub-questions.

        Useful for complex queries that require multiple pieces of information.
        Each sub-question can be answered separately, then synthesized.

        Args:
            query: Complex query
            llm_model: LLM for decomposition

        Returns:
            dict with 'original_query' and 'subquestions'

        Example:
            >>> decomp = client.search.decompose_query(
            ...     "Compare AI benefits vs risks in healthcare"
            ... )
            >>> for subq in decomp['subquestions']:
            ...     print(f"- {subq}")
            ...     # Search for each sub-question separately
        """
        return self._trpc_request("search.decomposeQuery", {
            "query": query,
            "llmModel": llm_model
        })

    # ==================== RAG Evaluation ====================

    def evaluate_faithfulness(
        self,
        query: str,
        response: str,
        contexts: List[str]
    ) -> Dict[str, Any]:
        """
        Evaluate if response is faithful to source contexts (no hallucination).

        Uses LLM to check if the generated response is supported by the
        retrieved contexts. Critical for detecting hallucinations.

        Args:
            query: User query
            response: Generated answer
            contexts: Source contexts used

        Returns:
            Evaluation with 'score', 'passing', 'feedback'

        Example:
            >>> eval_result = client.search.evaluate_faithfulness(
            ...     query="What is AI?",
            ...     response="AI is artificial intelligence...",
            ...     contexts=["AI stands for artificial intelligence..."]
            ... )
            >>> if eval_result['passing']:
            ...     print("Response is faithful!")
            >>> print(f"Score: {eval_result['score']}")
        """
        return self._trpc_request("search.evaluateFaithfulness", {
            "query": query,
            "response": response,
            "contexts": contexts
        })

    def evaluate_relevancy(
        self,
        query: str,
        contexts: List[str]
    ) -> Dict[str, Any]:
        """
        Evaluate if retrieved contexts are relevant to query.

        Checks if your retrieval system is finding relevant information.

        Args:
            query: User query
            contexts: Retrieved contexts

        Returns:
            Evaluation with 'score', 'passing', 'feedback'

        Example:
            >>> eval_result = client.search.evaluate_relevancy(
            ...     query="What is machine learning?",
            ...     contexts=[
            ...         "Machine learning is a type of AI...",
            ...         "Deep learning uses neural networks..."
            ...     ]
            ... )
            >>> print(f"Relevancy score: {eval_result['score']}")
        """
        return self._trpc_request("search.evaluateRelevancy", {
            "query": query,
            "contexts": contexts
        })

    def evaluate_answer_relevancy(
        self,
        query: str,
        response: str
    ) -> Dict[str, Any]:
        """
        Evaluate if answer is relevant to query.

        Checks if the generated answer actually addresses the question asked.

        Args:
            query: User query
            response: Generated answer

        Returns:
            Evaluation with 'score', 'passing', 'feedback'

        Example:
            >>> eval_result = client.search.evaluate_answer_relevancy(
            ...     query="What are the benefits of AI?",
            ...     response="AI can improve efficiency and accuracy..."
            ... )
            >>> print(f"Answer relevancy: {eval_result['score']}")
        """
        return self._trpc_request("search.evaluateAnswerRelevancy", {
            "query": query,
            "response": response
        })

    def evaluate_rag_pipeline(
        self,
        query: str,
        response: str,
        contexts: List[str]
    ) -> Dict[str, Any]:
        """
        Comprehensive RAG evaluation (all metrics).

        Evaluates:
        - Faithfulness (no hallucination)
        - Relevancy (good retrieval)
        - Answer relevancy (addresses question)

        Args:
            query: User query
            response: Generated answer
            contexts: Retrieved contexts

        Returns:
            Full evaluation with all metrics and overall score

        Example:
            >>> eval_result = client.search.evaluate_rag_pipeline(
            ...     query="What is AI?",
            ...     response="AI is...",
            ...     contexts=["AI stands for..."]
            ... )
            >>> print(f"Overall score: {eval_result['overall_score']}")
            >>> print(f"All passing: {eval_result['all_passing']}")
            >>> for metric, result in eval_result['evaluations'].items():
            ...     print(f"{metric}: {result['score']} ({result['feedback']})")
        """
        return self._trpc_request("search.evaluateRAGPipeline", {
            "query": query,
            "response": response,
            "contexts": contexts
        })

    def batch_evaluate_rag(
        self,
        test_cases: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Batch evaluate multiple RAG test cases.

        Useful for evaluating your RAG system's overall performance
        across multiple queries.

        Args:
            test_cases: List of dicts with 'query', 'response', 'contexts'

        Returns:
            Aggregated metrics across all test cases

        Example:
            >>> test_cases = [
            ...     {
            ...         'query': 'What is AI?',
            ...         'response': 'AI is...',
            ...         'contexts': ['AI stands for...']
            ...     },
            ...     {
            ...         'query': 'What is ML?',
            ...         'response': 'ML is...',
            ...         'contexts': ['Machine learning...']
            ...     }
            ... ]
            >>> results = client.search.batch_evaluate_rag(test_cases)
            >>> print(f"Average score: {results['overall']['average_score']}")
            >>> print(f"Faithfulness: {results['metrics']['faithfulness']['average']}")
            >>> print(f"Passing rate: {results['overall']['all_passing_rate']}")
        """
        return self._trpc_request("search.batchEvaluateRAG", {
            "testCases": test_cases
        })
