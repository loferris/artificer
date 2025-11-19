"""
LlamaIndex Enhanced Retrieval Examples - Phase 6

Demonstrates:
- Reranking for better results
- HyDE (Hypothetical Document Embeddings)
- Query Fusion
- Sub-question decomposition
- RAG evaluation (faithfulness, relevancy)
"""

from artificer_client import ArtificerClient


def example_search_with_reranking(client: ArtificerClient, project_id: str):
    """
    Example: Search with reranking for 20-40% better accuracy.
    """
    print("\n=== Example 1: Search with Reranking ===")

    # Method 1: One-step convenience method
    results = client.search.search_with_reranking(
        project_id,
        query="machine learning applications",
        top_k=20,  # Get 20 candidates
        top_n=5,   # Rerank to best 5
        model="ms-marco-mini"
    )

    print(f"✓ Got {results['count']} reranked results from {results['candidates_count']} candidates")
    for i, result in enumerate(results['results'][:3]):
        print(f"  {i+1}. Score: {result['score']:.4f}")
        print(f"     {result['content'][:100]}...")

    # Method 2: Manual two-step
    print("\nManual reranking:")
    candidates = client.search.search_documents(project_id, "AI in healthcare", limit=20)
    reranked = client.search.rerank_results(
        candidates['results'],
        "AI in healthcare",
        model="ms-marco-mini",
        top_n=5
    )
    print(f"✓ Reranked {len(reranked['results'])} results")


def example_query_decomposition(client: ArtificerClient):
    """
    Example: Break complex queries into sub-questions.
    """
    print("\n=== Example 2: Query Decomposition ===")

    result = client.search.decompose_query(
        "Compare AI benefits vs risks in healthcare"
    )

    print(f"Original query: {result['original_query']}")
    print(f"\nSub-questions ({result['count']}):")
    for i, subq in enumerate(result['subquestions']):
        print(f"  {i+1}. {subq}")

    # Now search for each sub-question
    print("\nSearching for each sub-question...")
    # for subq in result['subquestions']:
    #     results = client.search.search_documents(project_id, subq, limit=3)
    #     # Process results...


def example_query_variations(client: ArtificerClient):
    """
    Example: Generate query variations for query fusion.
    """
    print("\n=== Example 3: Query Variations ===")

    result = client.search.generate_query_variations(
        "benefits of renewable energy",
        num_variations=3
    )

    print(f"Original: {result['original_query']}")
    print(f"\nVariations ({result['count']}):")
    for i, var in enumerate(result['variations']):
        print(f"  {i+1}. {var}")

    # Use for query fusion: search each variation and combine results


def example_hypothetical_document(client: ArtificerClient):
    """
    Example: HyDE - Generate hypothetical document.
    """
    print("\n=== Example 4: HyDE (Hypothetical Document Embeddings) ===")

    result = client.search.generate_hypothetical_document(
        "What are the latest developments in quantum computing?"
    )

    print(f"Query: {result['query']}")
    print(f"\nHypothetical document:")
    print(result['hypothetical_document'][:200] + "...")
    print("\n(Now embed this hypothetical doc and search with it)")


def example_rag_evaluation(client: ArtificerClient):
    """
    Example: Evaluate RAG quality.
    """
    print("\n=== Example 5: RAG Evaluation ===")

    # Sample RAG interaction
    query = "What is machine learning?"
    contexts = [
        "Machine learning is a subset of AI that enables computers to learn from data.",
        "ML algorithms can identify patterns and make predictions without explicit programming."
    ]
    response = "Machine learning allows computers to learn from data and improve over time."

    # Comprehensive evaluation
    eval_result = client.search.evaluate_rag_pipeline(query, response, contexts)

    print(f"Overall score: {eval_result['overall_score']:.2f}")
    print(f"All passing: {eval_result['all_passing']}\n")

    for metric, result in eval_result['evaluations'].items():
        print(f"{metric}:")
        print(f"  Score: {result['score']}")
        print(f"  Passing: {result['passing']}")
        print(f"  Feedback: {result['feedback'][:100]}...")


def example_faithfulness_check(client: ArtificerClient):
    """
    Example: Check for hallucinations.
    """
    print("\n=== Example 6: Faithfulness Check (Hallucination Detection) ===")

    query = "What is AI?"
    contexts = ["AI stands for Artificial Intelligence."]
    
    # Good response (faithful)
    good_response = "AI stands for Artificial Intelligence."
    result = client.search.evaluate_faithfulness(query, good_response, contexts)
    print(f"Good response - Score: {result['score']}, Passing: {result['passing']}")

    # Hallucinated response
    bad_response = "AI was invented in ancient Greece by Aristotle."
    result = client.search.evaluate_faithfulness(query, bad_response, contexts)
    print(f"Hallucinated - Score: {result['score']}, Passing: {result['passing']}")
    print(f"Feedback: {result['feedback']}")


def example_batch_evaluation(client: ArtificerClient):
    """
    Example: Batch evaluate multiple test cases.
    """
    print("\n=== Example 7: Batch Evaluation ===")

    test_cases = [
        {
            'query': 'What is AI?',
            'response': 'AI is artificial intelligence.',
            'contexts': ['AI stands for Artificial Intelligence.']
        },
        {
            'query': 'What is ML?',
            'response': 'ML is machine learning.',
            'contexts': ['Machine learning is a subset of AI.']
        },
        {
            'query': 'What is DL?',
            'response': 'DL is deep learning.',
            'contexts': ['Deep learning uses neural networks.']
        }
    ]

    results = client.search.batch_evaluate_rag(test_cases)

    print(f"Evaluated {results['num_test_cases']} test cases\n")
    print("Metrics:")
    for metric, scores in results['metrics'].items():
        print(f"  {metric}:")
        print(f"    Average: {scores['average']:.2f}")
        print(f"    Passing rate: {scores['passing_rate']:.1%}")
    
    print(f"\nOverall:")
    print(f"  Average score: {results['overall']['average_score']:.2f}")
    print(f"  All passing rate: {results['overall']['all_passing_rate']:.1%}")


def list_llamaindex_capabilities():
    """Show all LlamaIndex capabilities."""
    print("\n=== LlamaIndex Capabilities ===")

    capabilities = {
        "Enhanced Retrieval": [
            "Reranking (20-40% improvement) - cross-encoder reranks results",
            "HyDE - search with hypothetical answers",
            "Query Fusion - search with multiple variations",
            "Sub-questions - decompose complex queries"
        ],
        "RAG Evaluation": [
            "Faithfulness - detect hallucinations",
            "Relevancy - measure retrieval quality",
            "Answer Relevancy - ensure answers address questions",
            "Batch evaluation - test multiple cases"
        ],
        "Reranker Models": [
            "ms-marco-mini - Fast, good quality (default)",
            "ms-marco-base - Better quality, slower",
            "bge-reranker - Good for multilingual",
            "cohere-rerank - Best quality (requires API key)"
        ],
        "Typical Improvements": [
            "Reranking: 20-40% accuracy gain",
            "HyDE: 15-30% for complex queries",
            "Query Fusion: Better coverage",
            "All have zero hosting cost (just Python library)"
        ]
    }

    for category, items in capabilities.items():
        print(f"\n{category}:")
        for item in items:
            print(f"  - {item}")


def main():
    """Run all LlamaIndex examples."""
    client = ArtificerClient(
        api_url="http://localhost:3000",
        api_key=None
    )

    print("=" * 60)
    print("LlamaIndex Enhanced Retrieval - Phase 6")
    print("=" * 60)

    # Check availability
    if client.search.llamaindex_available():
        print("✓ LlamaIndex is available")
    else:
        print("✗ LlamaIndex not available")
        print("Install with: pip install llama-index")
        return

    list_llamaindex_capabilities()

    # Examples (commented to avoid actual execution)
    # project_id = "your_project_id"
    
    # example_search_with_reranking(client, project_id)
    # example_query_decomposition(client)
    # example_query_variations(client)
    # example_hypothetical_document(client)
    # example_rag_evaluation(client)
    # example_faithfulness_check(client)
    # example_batch_evaluation(client)

    print("\n" + "=" * 60)
    print("Examples ready to run!")
    print("=" * 60)
    print("\nKey Takeaways:")
    print("  - Reranking improves results by 20-40%")
    print("  - Evaluation detects hallucinations")
    print("  - Zero hosting cost (just Python library)")
    print("  - Works alongside existing Artificer search")


if __name__ == "__main__":
    main()
