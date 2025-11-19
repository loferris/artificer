"""
Custom Workflow Examples - Phase 2: Declarative Config → Prefect Translation

Demonstrates how to define, register, and execute custom DAG workflows using
declarative configuration that gets translated into Prefect flows.
"""

import base64
from artificer_client import ArtificerClient


def example_pdf_extract_and_chunk(client: ArtificerClient):
    """
    Example: Custom workflow for PDF extraction and chunking.

    This workflow demonstrates:
    - Sequential task execution (extract → chunk)
    - Input referencing ({{workflow.input.key}})
    - Task output referencing ({{task_id.output_key}})
    """
    print("\n=== Example 1: PDF Extract and Chunk ===")

    # Define workflow
    workflow_def = {
        "name": "pdf-extract-and-chunk",
        "description": "Extract PDF and chunk into segments",
        "version": "1.0.0",
        "tasks": [
            {
                "id": "extract",
                "type": "extract_pdf_text",
                "inputs": {
                    "pdf_data": "{{workflow.input.pdf_data}}"
                },
                "outputs": ["text", "metadata"]
            },
            {
                "id": "chunk",
                "type": "chunk_document",
                "depends_on": ["extract"],
                "inputs": {
                    "document_id": "{{workflow.input.document_id}}",
                    "project_id": "{{workflow.input.project_id}}",
                    "content": "{{extract.text}}",
                    "chunk_size": "{{workflow.input.chunk_size}}",
                    "chunk_overlap": "{{workflow.input.chunk_overlap}}"
                },
                "outputs": ["chunks", "total_chunks"]
            }
        ],
        "output": {
            "chunks": "{{chunk.chunks}}",
            "total_chunks": "{{chunk.total_chunks}}",
            "metadata": "{{extract.metadata}}"
        },
        "options": {
            "parallel": False,
            "timeout": 300
        }
    }

    # Validate workflow
    print("Validating workflow definition...")
    validation = client.workflows.validate_workflow_definition(workflow_def)

    if not validation['valid']:
        print(f"✗ Validation failed: {validation['error']}")
        return

    print("✓ Workflow definition is valid")

    # Register workflow
    print("Registering workflow...")
    result = client.workflows.register_custom_workflow(
        "pdf-extract-chunk-v1",
        workflow_def
    )
    print(f"✓ Registered: {result['workflowId']}")

    # Execute workflow (example - commented out as it requires actual PDF data)
    # with open("sample.pdf", "rb") as f:
    #     pdf_data = base64.b64encode(f.read()).decode()
    #
    # execution_result = client.workflows.execute_custom_workflow(
    #     "pdf-extract-chunk-v1",
    #     {
    #         "pdf_data": pdf_data,
    #         "document_id": "doc_123",
    #         "project_id": "proj_456",
    #         "chunk_size": 1000,
    #         "chunk_overlap": 200
    #     }
    # )
    # print(f"✓ Workflow executed: {len(execution_result['result']['chunks'])} chunks")


def example_pdf_to_html_with_token_count(client: ArtificerClient):
    """
    Example: Custom PDF to HTML workflow with token counting.

    This workflow demonstrates:
    - Parallel task execution (count and import run in parallel after extract)
    - Multiple tasks depending on the same predecessor
    - Conditional paths in DAG
    """
    print("\n=== Example 2: PDF to HTML with Token Count ===")

    workflow_def = {
        "name": "pdf-to-html-custom",
        "description": "Convert PDF to HTML with token counting",
        "version": "1.0.0",
        "tasks": [
            {
                "id": "extract",
                "type": "extract_pdf_text",
                "inputs": {
                    "pdf_data": "{{workflow.input.pdf_data}}"
                }
            },
            {
                "id": "count",
                "type": "count_tokens",
                "depends_on": ["extract"],
                "inputs": {
                    "content": "{{extract.text}}",
                    "model": "{{workflow.input.model}}"
                }
            },
            {
                "id": "import_md",
                "type": "import_markdown",
                "depends_on": ["extract"],
                "inputs": {
                    "content": "{{extract.text}}",
                    "strict_mode": False,
                    "include_metadata": True
                }
            },
            {
                "id": "export",
                "type": "export_html",
                "depends_on": ["import_md"],
                "inputs": {
                    "document": "{{import_md.document}}",
                    "include_styles": "{{workflow.input.include_styles}}",
                    "include_metadata": True,
                    "class_name": "custom-doc",
                    "title": "{{workflow.input.title}}"
                }
            }
        ],
        "output": {
            "html": "{{export.html}}",
            "token_count": "{{count.token_count}}",
            "pages": "{{extract.metadata.pages}}"
        },
        "options": {
            "parallel": True,  # Enable parallel execution
            "timeout": 600
        }
    }

    # Register
    client.workflows.register_custom_workflow(
        "pdf-to-html-tokens",
        workflow_def
    )
    print("✓ Registered: pdf-to-html-tokens")

    # This workflow will run 'count' and 'import_md' in parallel after 'extract'
    # completes, then run 'export' after 'import_md' completes


def example_multi_format_export(client: ArtificerClient):
    """
    Example: Export document to multiple formats in parallel.

    This workflow demonstrates:
    - Fan-out pattern (import → multiple parallel exports)
    - Collecting multiple outputs
    """
    print("\n=== Example 3: Multi-Format Export ===")

    workflow_def = {
        "name": "multi-format-export",
        "description": "Export document to HTML and Markdown in parallel",
        "version": "1.0.0",
        "tasks": [
            {
                "id": "import_md",
                "type": "import_markdown",
                "inputs": {
                    "content": "{{workflow.input.content}}",
                    "strict_mode": False,
                    "include_metadata": True
                }
            },
            {
                "id": "export_html",
                "type": "export_html",
                "depends_on": ["import_md"],
                "inputs": {
                    "document": "{{import_md.document}}",
                    "include_styles": True,
                    "include_metadata": False,
                    "class_name": "exported-doc",
                    "title": "{{workflow.input.title}}"
                }
            },
            {
                "id": "export_markdown",
                "type": "export_markdown",
                "depends_on": ["import_md"],
                "inputs": {
                    "document": "{{import_md.document}}",
                    "include_metadata": False
                }
            }
        ],
        "output": {
            "html": "{{export_html.html}}",
            "markdown": "{{export_markdown.markdown}}"
        },
        "options": {
            "parallel": True
        }
    }

    client.workflows.register_custom_workflow(
        "multi-format-export",
        workflow_def
    )
    print("✓ Registered: multi-format-export")


def example_complex_dag(client: ArtificerClient):
    """
    Example: Complex DAG with multiple dependencies.

    This workflow demonstrates:
    - Complex dependency graph
    - Multiple levels of parallelism
    - Multiple inputs feeding into one task
    """
    print("\n=== Example 4: Complex DAG ===")

    workflow_def = {
        "name": "complex-document-processing",
        "description": "Complex multi-step document processing",
        "version": "1.0.0",
        "tasks": [
            {
                "id": "extract_pdf",
                "type": "extract_pdf_text",
                "inputs": {
                    "pdf_data": "{{workflow.input.pdf_data}}"
                }
            },
            {
                "id": "count_tokens",
                "type": "count_tokens",
                "depends_on": ["extract_pdf"],
                "inputs": {
                    "content": "{{extract_pdf.text}}",
                    "model": "gpt-4"
                }
            },
            {
                "id": "chunk_doc",
                "type": "chunk_document",
                "depends_on": ["extract_pdf"],
                "inputs": {
                    "document_id": "{{workflow.input.doc_id}}",
                    "project_id": "{{workflow.input.proj_id}}",
                    "content": "{{extract_pdf.text}}",
                    "chunk_size": 1000,
                    "chunk_overlap": 200
                }
            },
            {
                "id": "import_to_portable",
                "type": "import_markdown",
                "depends_on": ["extract_pdf"],
                "inputs": {
                    "content": "{{extract_pdf.text}}",
                    "strict_mode": False,
                    "include_metadata": True
                }
            },
            {
                "id": "export_html",
                "type": "export_html",
                "depends_on": ["import_to_portable"],
                "inputs": {
                    "document": "{{import_to_portable.document}}",
                    "include_styles": True,
                    "include_metadata": True,
                    "class_name": "processed-doc",
                    "title": "Processed Document"
                }
            }
        ],
        "output": {
            "html": "{{export_html.html}}",
            "chunks": "{{chunk_doc.chunks}}",
            "token_count": "{{count_tokens.token_count}}",
            "metadata": "{{extract_pdf.metadata}}"
        },
        "options": {
            "parallel": True,
            "retry_failed_tasks": True,
            "max_retries": 2,
            "timeout": 600
        }
    }

    client.workflows.register_custom_workflow(
        "complex-doc-processing",
        workflow_def
    )
    print("✓ Registered: complex-doc-processing")
    print("  This workflow will run count, chunk, and import in parallel,")
    print("  then export HTML after import completes")


def list_and_manage_workflows(client: ArtificerClient):
    """List and manage custom workflows."""
    print("\n=== List Custom Workflows ===")

    # List all custom workflows
    workflows = client.workflows.list_custom_workflows()

    if not workflows['workflows']:
        print("No custom workflows registered")
        return

    print(f"Found {len(workflows['workflows'])} custom workflows:\n")
    for wf in workflows['workflows']:
        print(f"  {wf['id']}")
        print(f"    Name: {wf['name']}")
        if 'description' in wf:
            print(f"    Description: {wf['description']}")
        if 'version' in wf:
            print(f"    Version: {wf['version']}")
        print(f"    Tasks: {wf['taskCount']}")
        print()

    # Get details for first workflow
    if workflows['workflows']:
        first_id = workflows['workflows'][0]['id']
        print(f"Getting details for: {first_id}")

        workflow = client.workflows.get_custom_workflow(first_id)
        print(f"  Tasks:")
        for task in workflow['tasks']:
            depends = task.get('depends_on', [])
            dep_str = f" (depends on: {', '.join(depends)})" if depends else ""
            print(f"    - {task['id']}: {task['type']}{dep_str}")


def delete_workflow_example(client: ArtificerClient):
    """Example of deleting a custom workflow."""
    print("\n=== Delete Custom Workflow ===")

    # Delete a workflow (example)
    # result = client.workflows.delete_custom_workflow("pdf-extract-chunk-v1")
    # print(f"✓ {result['message']}")

    print("To delete a workflow, use:")
    print("  client.workflows.delete_custom_workflow(workflow_id)")


def available_task_types():
    """Show all available task types for workflows."""
    print("\n=== Available Task Types ===")

    task_types = {
        "PDF Operations": [
            "extract_pdf_text - Extract text from PDF",
            "process_pdf - Process PDF with OCR fallback"
        ],
        "Document Processing": [
            "chunk_document - Chunk document into overlapping segments"
        ],
        "Format Conversion": [
            "import_markdown - Import markdown to Portable Text",
            "import_html - Import HTML to Portable Text",
            "export_html - Export Portable Text to HTML",
            "export_markdown - Export Portable Text to Markdown"
        ],
        "Text Operations": [
            "count_tokens - Count tokens in content"
        ],
        "OCR": [
            "ocr_image - Extract text from image using OCR"
        ],
        "Utility": [
            "health_check - Check Artificer service health"
        ]
    }

    for category, tasks in task_types.items():
        print(f"\n{category}:")
        for task in tasks:
            print(f"  - {task}")


def main():
    """Run all custom workflow examples."""
    # Initialize client
    client = ArtificerClient(
        api_url="http://localhost:3000",
        api_key=None  # For local development
    )

    print("=" * 60)
    print("Custom Workflow Examples - Phase 2")
    print("=" * 60)

    # Show available task types
    available_task_types()

    # Run examples
    example_pdf_extract_and_chunk(client)
    example_pdf_to_html_with_token_count(client)
    example_multi_format_export(client)
    example_complex_dag(client)

    # List and manage
    list_and_manage_workflows(client)
    delete_workflow_example(client)

    print("\n" + "=" * 60)
    print("Examples complete!")
    print("=" * 60)
    print("\nKey Concepts:")
    print("  - Tasks are executed based on 'depends_on' relationships")
    print("  - Input references: {{workflow.input.key}}")
    print("  - Task output references: {{task_id.output_key}}")
    print("  - Parallel execution: Set options.parallel = True")
    print("  - Custom DAGs: Define any dependency graph (must be acyclic)")


if __name__ == "__main__":
    main()
