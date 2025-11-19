"""
Workflow Template Examples - Phase 3: Pre-built workflow patterns

Demonstrates using pre-built workflow templates for common use cases.
Templates provide ready-to-use patterns that can be customized with parameters.
"""

import base64
from artificer_client import ArtificerClient


def browse_templates(client: ArtificerClient):
    """Browse available workflow templates."""
    print("\n=== Browse Workflow Templates ===")

    # List all templates
    result = client.workflows.list_templates()
    templates = result['templates']
    categories = result['categories']

    print(f"\nFound {len(templates)} templates across {len(categories)} categories:")
    print(f"Categories: {', '.join(categories)}\n")

    # Group by category
    by_category = {}
    for tmpl in templates:
        cat = tmpl['category']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(tmpl)

    # Display templates by category
    for category, tmpls in sorted(by_category.items()):
        print(f"\n{category}:")
        for tmpl in tmpls:
            print(f"  {tmpl['id']}")
            print(f"    Name: {tmpl['name']}")
            print(f"    Description: {tmpl['description']}")
            print(f"    Version: {tmpl['version']}")
            if tmpl['parameters']:
                print(f"    Parameters:")
                for param, schema in tmpl['parameters'].items():
                    default = schema.get('default', 'N/A')
                    print(f"      - {param}: {schema.get('description')} (default: {default})")


def template_details_example(client: ArtificerClient):
    """Get detailed template information."""
    print("\n=== Template Details Example ===")

    # Get RAG ingestion template details
    template = client.workflows.get_template("rag-ingestion")

    print(f"\nTemplate: {template['name']}")
    print(f"Description: {template['description']}")
    print(f"Category: {template['category']}")
    print(f"Version: {template['version']}")

    print(f"\nParameters:")
    for param, schema in template['parameters'].items():
        print(f"  {param}:")
        print(f"    Type: {schema['type']}")
        print(f"    Default: {schema.get('default')}")
        print(f"    Description: {schema.get('description')}")

    print(f"\nWorkflow Definition:")
    print(f"  Tasks: {len(template['definition']['tasks'])}")
    for task in template['definition']['tasks']:
        deps = task.get('depends_on', [])
        dep_str = f" (depends on: {', '.join(deps)})" if deps else ""
        print(f"    - {task['id']}: {task['type']}{dep_str}")


def rag_ingestion_template_example(client: ArtificerClient):
    """
    Example: RAG Document Ingestion Template

    Use case: Building a knowledge base for vector search/RAG
    """
    print("\n=== RAG Ingestion Template Example ===")

    # Instantiate template with custom parameters
    result = client.workflows.instantiate_template(
        "rag-ingestion",
        {
            "chunk_size": 500,  # Smaller chunks for better granularity
            "chunk_overlap": 100,  # Overlap for context preservation
            "force_ocr": False
        },
        auto_register=True,
        workflow_id="my-rag-pipeline"
    )

    print(f"✓ Template instantiated")
    print(f"  Registered: {result['registered']}")
    print(f"  Workflow ID: {result.get('workflowId')}")

    # Now execute the workflow (example - commented out)
    # with open("knowledge_base.pdf", "rb") as f:
    #     pdf_data = base64.b64encode(f.read()).decode()
    #
    # execution_result = client.workflows.execute_custom_workflow(
    #     "my-rag-pipeline",
    #     {
    #         "pdf_data": pdf_data,
    #         "document_id": "kb_doc_001",
    #         "project_id": "knowledge_base",
    #         "chunk_size": 500,
    #         "chunk_overlap": 100,
    #         "force_ocr": False
    #     }
    # )
    #
    # chunks = execution_result['result']['chunks']
    # print(f"✓ Document processed: {len(chunks)} chunks ready for embedding")


def multi_format_conversion_example(client: ArtificerClient):
    """
    Example: Multi-Format Conversion Template

    Use case: Publishing content across multiple platforms
    """
    print("\n=== Multi-Format Conversion Template Example ===")

    # Instantiate with custom styling
    result = client.workflows.instantiate_template(
        "multi-format-conversion",
        {
            "include_styles": True,
            "title": "Published Article"
        },
        auto_register=True,
        workflow_id="publish-pipeline"
    )

    print(f"✓ Publishing pipeline created")
    print(f"  Workflow ID: {result.get('workflowId')}")
    print(f"  Outputs: HTML, Markdown, Portable Text")

    # Execute workflow (example)
    # with open("article.pdf", "rb") as f:
    #     pdf_data = base64.b64encode(f.read()).decode()
    #
    # result = client.workflows.execute_custom_workflow(
    #     "publish-pipeline",
    #     {
    #         "pdf_data": pdf_data,
    #         "include_styles": True,
    #         "title": "How to Build RAG Systems"
    #     }
    # )
    #
    # html = result['result']['html']
    # markdown = result['result']['markdown']
    # print(f"✓ Content converted")
    # print(f"  - HTML: {len(html)} characters")
    # print(f"  - Markdown: {len(markdown)} characters")


def document_analysis_example(client: ArtificerClient):
    """
    Example: Document Analysis Template

    Use case: Analyzing document metrics before processing
    """
    print("\n=== Document Analysis Template Example ===")

    # Instantiate with GPT-4 for token counting
    result = client.workflows.instantiate_template(
        "document-analysis",
        {"model": "gpt-4"},
        auto_register=True,
        workflow_id="doc-analyzer"
    )

    print(f"✓ Document analyzer created")
    print(f"  Analyzes: tokens, structure, metadata")

    # Execute analysis (example)
    # with open("report.pdf", "rb") as f:
    #     pdf_data = base64.b64encode(f.read()).decode()
    #
    # result = client.workflows.execute_custom_workflow(
    #     "doc-analyzer",
    #     {
    #         "pdf_data": pdf_data,
    #         "model": "gpt-4"
    #     }
    # )
    #
    # metadata = result['result']['metadata']
    # token_count = result['result']['token_count']
    # print(f"✓ Analysis complete")
    # print(f"  Pages: {metadata['pages']}")
    # print(f"  Tokens: {token_count}")
    # print(f"  Extraction method: {metadata['method']}")


def content_enhancement_example(client: ArtificerClient):
    """
    Example: Content Enhancement Template

    Use case: Cleaning and enhancing content for publication
    """
    print("\n=== Content Enhancement Template Example ===")

    # Instantiate with custom title
    result = client.workflows.instantiate_template(
        "content-enhancement",
        {
            "include_styles": True,
            "title": "Enhanced Document"
        },
        auto_register=True,
        workflow_id="enhance-content"
    )

    print(f"✓ Content enhancer created")
    print(f"  Pipeline: Extract → Clean → Export (HTML + Markdown)")


def metadata_extraction_example(client: ArtificerClient):
    """
    Example: Metadata Extraction Template

    Use case: Building document catalogs and search indices
    """
    print("\n=== Metadata Extraction Template Example ===")

    # Instantiate with custom token model
    result = client.workflows.instantiate_template(
        "metadata-extraction",
        {"token_model": "gpt-4"},
        auto_register=True,
        workflow_id="extract-metadata"
    )

    print(f"✓ Metadata extractor created")
    print(f"  Extracts: PDF metadata, token counts, document structure")


def template_workflow(client: ArtificerClient):
    """
    Complete workflow: Browse → Select → Instantiate → Execute
    """
    print("\n=== Complete Template Workflow ===")

    # Step 1: Browse templates
    print("\n1. Browse templates by category")
    templates = client.workflows.list_templates(category="Document Processing")
    print(f"   Found {len(templates['templates'])} document processing templates")

    # Step 2: Get template details
    print("\n2. Get template details")
    template = client.workflows.get_template("rag-ingestion")
    print(f"   Template: {template['name']}")
    print(f"   Parameters: {list(template['parameters'].keys())}")

    # Step 3: Instantiate with custom parameters
    print("\n3. Instantiate template")
    result = client.workflows.instantiate_template(
        "rag-ingestion",
        {
            "chunk_size": 800,
            "chunk_overlap": 150,
            "force_ocr": False
        },
        auto_register=False  # Just get the definition
    )
    print(f"   ✓ Definition generated")
    print(f"   Tasks: {len(result['definition']['tasks'])}")

    # Step 4: Register workflow (if we want to)
    # client.workflows.register_custom_workflow(
    #     "my-custom-rag",
    #     result['definition']
    # )

    # Step 5: Execute
    # result = client.workflows.execute_custom_workflow(
    #     "my-custom-rag",
    #     {...inputs...}
    # )


def compare_custom_vs_template():
    """Compare custom workflow vs template approach."""
    print("\n=== Custom vs Template Comparison ===")

    print("\n**Custom Workflow Approach** (Phase 2):")
    print("  - Define complete workflow JSON/dict")
    print("  - Specify all tasks, inputs, dependencies manually")
    print("  - Full control and flexibility")
    print("  - More verbose, requires understanding task types")

    print("\n**Template Approach** (Phase 3):")
    print("  - Pick a pre-built template for your use case")
    print("  - Provide just the parameters you want to customize")
    print("  - Quick to set up, best practices built-in")
    print("  - Less flexibility, but faster for common patterns")

    print("\n**When to use each:**")
    print("  Custom: Unique workflows, complex DAGs, specialized needs")
    print("  Template: Common patterns, quick setup, learning examples")


def main():
    """Run all template examples."""
    # Initialize client
    client = ArtificerClient(
        api_url="http://localhost:3000",
        api_key=None  # For local development
    )

    print("=" * 70)
    print("Workflow Template Examples - Phase 3")
    print("=" * 70)

    # Browse templates
    browse_templates(client)

    # Template details
    template_details_example(client)

    # Use case examples
    rag_ingestion_template_example(client)
    multi_format_conversion_example(client)
    document_analysis_example(client)
    content_enhancement_example(client)
    metadata_extraction_example(client)

    # Complete workflow
    template_workflow(client)

    # Comparison
    compare_custom_vs_template()

    print("\n" + "=" * 70)
    print("Examples complete!")
    print("=" * 70)

    print("\n**Available Templates:**")
    print("  - rag-ingestion: Extract PDF → Chunk for vector search")
    print("  - multi-format-conversion: PDF → HTML + Markdown + Portable Text")
    print("  - document-analysis: Extract → Count tokens → Analyze structure")
    print("  - content-enhancement: Extract → Clean → Export multiple formats")
    print("  - metadata-extraction: Extract comprehensive document metadata")

    print("\n**Template Workflow:**")
    print("  1. Browse templates (list_templates)")
    print("  2. Get template details (get_template)")
    print("  3. Instantiate with params (instantiate_template)")
    print("  4. Execute or register (optional auto_register)")


if __name__ == "__main__":
    main()
