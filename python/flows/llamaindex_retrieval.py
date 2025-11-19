"""
LlamaIndex Enhanced Retrieval - Phase 6

Provides advanced retrieval strategies on top of Artificer's vector search:
- Reranking (cross-encoder for better results)
- HyDE (Hypothetical Document Embeddings)
- Query Fusion (multiple query variations)
- Sub-question decomposition
- Evaluation framework

Integrates with existing Artificer infrastructure without replacing it.
"""

from typing import List, Dict, Any, Optional, Tuple
import json

try:
    from llama_index.core import VectorStoreIndex, Document
    from llama_index.core.schema import NodeWithScore, TextNode, QueryBundle
    from llama_index.core.postprocessor import SentenceTransformerRerank
    from llama_index.core.retrievers import BaseRetriever
    from llama_index.core.evaluation import (
        FaithfulnessEvaluator,
        RelevancyEvaluator,
        AnswerRelevancyEvaluator,
    )
    from llama_index.llms.openai import OpenAI as LlamaOpenAI
    LLAMAINDEX_AVAILABLE = True
except ImportError:
    LLAMAINDEX_AVAILABLE = False
    SentenceTransformerRerank = None
    FaithfulnessEvaluator = None
    RelevancyEvaluator = None
    AnswerRelevancyEvaluator = None


def check_availability() -> bool:
    """Check if LlamaIndex is available."""
    return LLAMAINDEX_AVAILABLE


# ==================== Reranking ====================

class RerankerConfig:
    """Configuration for reranking."""

    # Available reranker models
    MODELS = {
        "ms-marco-mini": "cross-encoder/ms-marco-MiniLM-L-6-v2",  # Fast, decent quality
        "ms-marco-base": "cross-encoder/ms-marco-MiniLM-L-12-v2",  # Better quality
        "bge-reranker": "BAAI/bge-reranker-base",  # Good multilingual
        "cohere-rerank": "cohere-rerank",  # Requires API key, best quality
    }

    DEFAULT_MODEL = "ms-marco-mini"
    DEFAULT_TOP_N = 5
    DEFAULT_TOP_K = 20  # Retrieve more candidates before reranking


def rerank_search_results(
    search_results: List[Dict[str, Any]],
    query: str,
    top_n: int = RerankerConfig.DEFAULT_TOP_N,
    model: str = RerankerConfig.DEFAULT_MODEL
) -> List[Dict[str, Any]]:
    """
    Rerank search results using cross-encoder.

    Args:
        search_results: List of search results from Artificer
        query: Original query
        top_n: Number of results to return after reranking
        model: Reranker model name

    Returns:
        Reranked search results (top_n)

    Example:
        >>> results = artificer_search(query, limit=20)
        >>> reranked = rerank_search_results(results, query, top_n=5)
    """
    if not LLAMAINDEX_AVAILABLE:
        raise ImportError("LlamaIndex not installed. Run: pip install llama-index")

    # Convert search results to LlamaIndex nodes
    nodes = []
    for result in search_results:
        node = TextNode(
            text=result.get('content', ''),
            metadata=result.get('metadata', {}),
            score=result.get('score', 0.0)
        )
        nodes.append(NodeWithScore(node=node, score=result.get('score', 0.0)))

    # Get reranker model path
    model_path = RerankerConfig.MODELS.get(model, model)

    # Create reranker
    reranker = SentenceTransformerRerank(
        model=model_path,
        top_n=top_n
    )

    # Rerank
    query_bundle = QueryBundle(query_str=query)
    reranked_nodes = reranker.postprocess_nodes(nodes, query_bundle=query_bundle)

    # Convert back to search result format
    reranked_results = []
    for node_with_score in reranked_nodes:
        result = {
            'content': node_with_score.node.text,
            'score': node_with_score.score,
            'metadata': node_with_score.node.metadata,
            'reranked': True,
            'reranker_model': model
        }
        reranked_results.append(result)

    return reranked_results


# ==================== HyDE (Hypothetical Document Embeddings) ====================

def hyde_generate_hypothetical_document(
    query: str,
    llm_model: str = "gpt-4o-mini"
) -> str:
    """
    Generate hypothetical document that would answer the query.

    This document is then embedded and used for retrieval, which often
    improves results by 15-30% for complex queries.

    Args:
        query: User query
        llm_model: LLM to use for generation

    Returns:
        Hypothetical document text

    Example:
        >>> query = "What are the benefits of renewable energy?"
        >>> hypothetical = hyde_generate_hypothetical_document(query)
        >>> # Now embed hypothetical doc and search with it
    """
    if not LLAMAINDEX_AVAILABLE:
        raise ImportError("LlamaIndex not installed. Run: pip install llama-index")

    llm = LlamaOpenAI(model=llm_model, temperature=0.3)

    prompt = f"""Generate a detailed paragraph that would directly answer this question:

Question: {query}

Write a comprehensive answer as if you were an expert. Include specific details and examples.
Do not say "I don't know" - write what a good answer would contain.

Answer:"""

    response = llm.complete(prompt)
    return response.text.strip()


def hyde_search_workflow(
    query: str,
    embedding_function: callable,
    search_function: callable,
    llm_model: str = "gpt-4o-mini",
    alpha: float = 0.5
) -> List[Dict[str, Any]]:
    """
    Complete HyDE search workflow.

    Args:
        query: Original query
        embedding_function: Function to embed text (query_text) -> embedding
        search_function: Function to search (embedding, limit) -> results
        llm_model: LLM for generating hypothetical doc
        alpha: Blending factor (0 = all original, 1 = all hypothetical)

    Returns:
        Search results

    Example:
        >>> def embed(text):
        ...     return client.embeddings.create(text)
        >>> def search(emb, limit):
        ...     return client.search.vector_search(emb, limit)
        >>> results = hyde_search_workflow(query, embed, search)
    """
    # Generate hypothetical document
    hypothetical_doc = hyde_generate_hypothetical_document(query, llm_model)

    # Embed both query and hypothetical doc
    query_embedding = embedding_function(query)
    hypo_embedding = embedding_function(hypothetical_doc)

    # Blend embeddings (weighted average)
    blended_embedding = [
        alpha * h + (1 - alpha) * q
        for q, h in zip(query_embedding, hypo_embedding)
    ]

    # Search with blended embedding
    results = search_function(blended_embedding, limit=20)

    # Add metadata
    for result in results:
        result['hyde_used'] = True
        result['hypothetical_doc'] = hypothetical_doc[:200] + '...'

    return results


# ==================== Query Fusion ====================

def generate_query_variations(
    query: str,
    num_variations: int = 3,
    llm_model: str = "gpt-4o-mini"
) -> List[str]:
    """
    Generate query variations for query fusion.

    Args:
        query: Original query
        num_variations: Number of variations to generate
        llm_model: LLM model

    Returns:
        List of query variations (including original)

    Example:
        >>> variations = generate_query_variations("machine learning benefits")
        >>> # ['machine learning benefits',
        >>> #  'advantages of ML algorithms',
        >>> #  'why use machine learning']
    """
    if not LLAMAINDEX_AVAILABLE:
        raise ImportError("LlamaIndex not installed. Run: pip install llama-index")

    llm = LlamaOpenAI(model=llm_model, temperature=0.7)

    prompt = f"""Generate {num_variations} alternative ways to phrase this query. Each variation should:
- Ask for the same information
- Use different wording
- Maintain the same intent

Original query: {query}

Provide {num_variations} variations, one per line, without numbering:"""

    response = llm.complete(prompt)
    variations = [line.strip() for line in response.text.strip().split('\n') if line.strip()]

    # Ensure we have the original query
    all_queries = [query] + variations[:num_variations]
    return all_queries


def fusion_search(
    query: str,
    search_function: callable,
    num_variations: int = 3,
    fusion_method: str = "reciprocal_rank",
    top_k: int = 20
) -> List[Dict[str, Any]]:
    """
    Query fusion: generate variations, search each, combine results.

    Args:
        query: Original query
        search_function: Function (query_text, limit) -> results
        num_variations: Number of query variations
        fusion_method: 'reciprocal_rank' or 'score_average'
        top_k: Results to return

    Returns:
        Fused search results

    Example:
        >>> def search(q, limit):
        ...     return client.search.search_documents(proj_id, q, limit)
        >>> results = fusion_search(query, search, num_variations=3)
    """
    # Generate query variations
    queries = generate_query_variations(query, num_variations)

    # Search with each variation
    all_results: Dict[str, Dict] = {}  # chunk_id -> result

    for q_idx, q in enumerate(queries):
        results = search_function(q, top_k * 2)

        for rank, result in enumerate(results):
            chunk_id = result.get('id') or result.get('content')[:100]

            if chunk_id not in all_results:
                all_results[chunk_id] = {
                    'content': result.get('content'),
                    'metadata': result.get('metadata', {}),
                    'scores': [],
                    'ranks': [],
                    'query_variations': []
                }

            all_results[chunk_id]['scores'].append(result.get('score', 0))
            all_results[chunk_id]['ranks'].append(rank + 1)
            all_results[chunk_id]['query_variations'].append(q)

    # Fusion scoring
    fused_results = []
    for chunk_id, data in all_results.items():
        if fusion_method == "reciprocal_rank":
            # Reciprocal Rank Fusion (RRF)
            # Score = sum(1 / (k + rank)) for each query
            k = 60  # Constant
            fusion_score = sum(1.0 / (k + rank) for rank in data['ranks'])
        else:
            # Average scores
            fusion_score = sum(data['scores']) / len(data['scores'])

        fused_results.append({
            'content': data['content'],
            'metadata': data['metadata'],
            'score': fusion_score,
            'fusion_method': fusion_method,
            'num_queries': len(data['ranks']),
            'query_variations': data['query_variations']
        })

    # Sort by fusion score
    fused_results.sort(key=lambda x: x['score'], reverse=True)

    return fused_results[:top_k]


# ==================== Sub-Question Decomposition ====================

def decompose_into_subquestions(
    query: str,
    llm_model: str = "gpt-4o-mini"
) -> List[str]:
    """
    Decompose complex query into sub-questions.

    Args:
        query: Complex query
        llm_model: LLM model

    Returns:
        List of sub-questions

    Example:
        >>> query = "Compare AI benefits vs risks in healthcare"
        >>> subqs = decompose_into_subquestions(query)
        >>> # ['What are AI benefits in healthcare?',
        >>> #  'What are AI risks in healthcare?',
        >>> #  'How do benefits and risks compare?']
    """
    if not LLAMAINDEX_AVAILABLE:
        raise ImportError("LlamaIndex not installed. Run: pip install llama-index")

    llm = LlamaOpenAI(model=llm_model, temperature=0.3)

    prompt = f"""Break down this complex question into simpler sub-questions that, when answered together, would fully address the original question.

Original question: {query}

Generate 2-4 sub-questions, one per line, without numbering. Each sub-question should:
- Be specific and focused
- Be independently answerable
- Contribute to answering the original question

Sub-questions:"""

    response = llm.complete(prompt)
    subquestions = [line.strip() for line in response.text.strip().split('\n') if line.strip()]

    return subquestions


def subquestion_search_and_synthesize(
    query: str,
    search_function: callable,
    llm_model: str = "gpt-4o",
    max_subquestions: int = 4
) -> Dict[str, Any]:
    """
    Decompose query, search for each sub-question, synthesize answer.

    Args:
        query: Complex query
        search_function: Function (query_text, limit) -> results
        llm_model: LLM for synthesis
        max_subquestions: Max sub-questions to generate

    Returns:
        Dict with subquestions, their results, and synthesized answer

    Example:
        >>> result = subquestion_search_and_synthesize(
        ...     "Compare AI in healthcare vs finance",
        ...     search_func
        ... )
        >>> print(result['synthesized_answer'])
    """
    # Decompose into sub-questions
    subquestions = decompose_into_subquestions(query, llm_model)[:max_subquestions]

    # Search for each sub-question
    subquestion_results = []
    for subq in subquestions:
        results = search_function(subq, limit=5)
        subquestion_results.append({
            'subquestion': subq,
            'results': results,
            'context': '\n\n'.join([r.get('content', '')[:500] for r in results[:3]])
        })

    # Synthesize answer
    llm = LlamaOpenAI(model=llm_model, temperature=0.3)

    context_parts = []
    for i, sq_result in enumerate(subquestion_results):
        context_parts.append(f"Sub-question {i+1}: {sq_result['subquestion']}")
        context_parts.append(f"Context: {sq_result['context']}")
        context_parts.append("")

    synthesis_prompt = f"""Answer the following question by synthesizing information from the sub-questions and their contexts:

Original Question: {query}

{chr(10).join(context_parts)}

Provide a comprehensive answer that addresses the original question by combining insights from all sub-questions:"""

    synthesized_answer = llm.complete(synthesis_prompt).text.strip()

    return {
        'query': query,
        'subquestions': subquestions,
        'subquestion_results': subquestion_results,
        'synthesized_answer': synthesized_answer
    }


# ==================== Evaluation Framework ====================

class RAGEvaluator:
    """Evaluate RAG quality using LlamaIndex evaluators."""

    def __init__(self, llm_model: str = "gpt-4o-mini"):
        """
        Initialize evaluator.

        Args:
            llm_model: LLM model for evaluation
        """
        if not LLAMAINDEX_AVAILABLE:
            raise ImportError("LlamaIndex not installed. Run: pip install llama-index")

        self.llm = LlamaOpenAI(model=llm_model, temperature=0.0)
        self.faithfulness_evaluator = FaithfulnessEvaluator(llm=self.llm)
        self.relevancy_evaluator = RelevancyEvaluator(llm=self.llm)
        self.answer_relevancy_evaluator = AnswerRelevancyEvaluator(llm=self.llm)

    def evaluate_faithfulness(
        self,
        query: str,
        response: str,
        contexts: List[str]
    ) -> Dict[str, Any]:
        """
        Evaluate if response is faithful to source contexts (no hallucination).

        Args:
            query: User query
            response: Generated answer
            contexts: Source contexts used

        Returns:
            Evaluation result with score and reasoning
        """
        result = self.faithfulness_evaluator.evaluate(
            query=query,
            response=response,
            contexts=contexts
        )

        return {
            'score': result.score,
            'passing': result.passing,
            'feedback': result.feedback,
            'metric': 'faithfulness'
        }

    def evaluate_relevancy(
        self,
        query: str,
        contexts: List[str]
    ) -> Dict[str, Any]:
        """
        Evaluate if retrieved contexts are relevant to query.

        Args:
            query: User query
            contexts: Retrieved contexts

        Returns:
            Evaluation result
        """
        result = self.relevancy_evaluator.evaluate(
            query=query,
            contexts=contexts
        )

        return {
            'score': result.score,
            'passing': result.passing,
            'feedback': result.feedback,
            'metric': 'relevancy'
        }

    def evaluate_answer_relevancy(
        self,
        query: str,
        response: str
    ) -> Dict[str, Any]:
        """
        Evaluate if answer is relevant to query.

        Args:
            query: User query
            response: Generated answer

        Returns:
            Evaluation result
        """
        result = self.answer_relevancy_evaluator.evaluate(
            query=query,
            response=response
        )

        return {
            'score': result.score,
            'passing': result.passing,
            'feedback': result.feedback,
            'metric': 'answer_relevancy'
        }

    def evaluate_full_rag_pipeline(
        self,
        query: str,
        response: str,
        contexts: List[str]
    ) -> Dict[str, Any]:
        """
        Comprehensive RAG evaluation.

        Args:
            query: User query
            response: Generated answer
            contexts: Retrieved contexts

        Returns:
            All evaluation metrics
        """
        results = {
            'query': query,
            'response': response,
            'num_contexts': len(contexts),
            'evaluations': {}
        }

        # Faithfulness
        results['evaluations']['faithfulness'] = self.evaluate_faithfulness(
            query, response, contexts
        )

        # Relevancy
        results['evaluations']['relevancy'] = self.evaluate_relevancy(
            query, contexts
        )

        # Answer relevancy
        results['evaluations']['answer_relevancy'] = self.evaluate_answer_relevancy(
            query, response
        )

        # Overall score (average)
        scores = [e['score'] for e in results['evaluations'].values() if e['score'] is not None]
        results['overall_score'] = sum(scores) / len(scores) if scores else None
        results['all_passing'] = all(e['passing'] for e in results['evaluations'].values())

        return results


# ==================== Batch Evaluation ====================

def batch_evaluate_rag(
    test_cases: List[Dict[str, Any]],
    llm_model: str = "gpt-4o-mini"
) -> Dict[str, Any]:
    """
    Evaluate multiple RAG test cases.

    Args:
        test_cases: List of dicts with 'query', 'response', 'contexts'
        llm_model: LLM for evaluation

    Returns:
        Aggregated evaluation results

    Example:
        >>> test_cases = [
        ...     {
        ...         'query': 'What is AI?',
        ...         'response': 'AI is...',
        ...         'contexts': ['AI stands for...']
        ...     }
        ... ]
        >>> results = batch_evaluate_rag(test_cases)
        >>> print(f"Average score: {results['average_score']}")
    """
    evaluator = RAGEvaluator(llm_model=llm_model)

    all_results = []
    for test_case in test_cases:
        result = evaluator.evaluate_full_rag_pipeline(
            query=test_case['query'],
            response=test_case['response'],
            contexts=test_case['contexts']
        )
        all_results.append(result)

    # Aggregate
    aggregate = {
        'num_test_cases': len(test_cases),
        'results': all_results,
        'metrics': {
            'faithfulness': {
                'average': sum(r['evaluations']['faithfulness']['score'] or 0 for r in all_results) / len(all_results),
                'passing_rate': sum(1 for r in all_results if r['evaluations']['faithfulness']['passing']) / len(all_results)
            },
            'relevancy': {
                'average': sum(r['evaluations']['relevancy']['score'] or 0 for r in all_results) / len(all_results),
                'passing_rate': sum(1 for r in all_results if r['evaluations']['relevancy']['passing']) / len(all_results)
            },
            'answer_relevancy': {
                'average': sum(r['evaluations']['answer_relevancy']['score'] or 0 for r in all_results) / len(all_results),
                'passing_rate': sum(1 for r in all_results if r['evaluations']['answer_relevancy']['passing']) / len(all_results)
            }
        },
        'overall': {
            'average_score': sum(r['overall_score'] or 0 for r in all_results) / len(all_results),
            'all_passing_rate': sum(1 for r in all_results if r['all_passing']) / len(all_results)
        }
    }

    return aggregate
