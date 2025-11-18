"""
Hello World Workflow

Simple example demonstrating Prefect + Artificer SDK integration.
"""

import sys
from pathlib import Path

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from prefect import flow, task, get_run_logger
from artificer_sdk import ArtificerClient


@task(retries=2, retry_delay_seconds=5)
def convert_markdown_to_portable_text(markdown: str) -> dict:
    """
    Convert markdown to Portable Text using Artificer SDK.

    Args:
        markdown: Markdown content

    Returns:
        Portable Text document
    """
    logger = get_run_logger()
    logger.info(f"Converting {len(markdown)} chars of markdown")

    with ArtificerClient("localhost:50051") as client:
        result = client.conversion.import_markdown(
            content=markdown, strict_mode=False, include_metadata=True
        )

    logger.info(f"Conversion complete in {result['processing_time_ms']}ms")
    return result["document"]


@task(retries=2, retry_delay_seconds=5)
def export_to_html(document: dict, title: str = "Document") -> str:
    """
    Export Portable Text to HTML.

    Args:
        document: Portable Text document
        title: Document title

    Returns:
        HTML string
    """
    logger = get_run_logger()
    logger.info("Exporting to HTML")

    with ArtificerClient("localhost:50051") as client:
        result = client.conversion.export_html(
            document=document, include_styles=True, title=title
        )

    logger.info(f"Export complete in {result['processing_time_ms']}ms")
    return result["html"]


@task
def check_health() -> dict:
    """Check Artificer service health."""
    logger = get_run_logger()
    logger.info("Checking Artificer health")

    with ArtificerClient("localhost:50051") as client:
        health = client.metrics.health_check()

    logger.info(f"Health status: {health['status']}")
    return health


@flow(name="hello-workflow", log_prints=True)
def hello_workflow():
    """
    Simple workflow: Markdown → Portable Text → HTML

    Steps:
    1. Check service health
    2. Convert markdown to Portable Text
    3. Export to HTML
    """
    logger = get_run_logger()
    logger.info("🚀 Starting Hello Workflow")

    # Step 1: Health check
    health = check_health()
    if health["status"] != "ok":
        logger.error("❌ Artificer service is not healthy!")
        return

    # Step 2: Convert markdown
    markdown = """
# Hello Prefect + Artificer!

This is a **simple workflow** demonstrating:

- Prefect orchestration
- Artificer SDK integration
- Stateful execution
- Task retries

## Code Example

```python
from artificer_sdk import ArtificerClient

with ArtificerClient("localhost:50051") as client:
    result = client.conversion.import_markdown("# Hello!")
```

## Next Steps

1. Create more complex workflows
2. Add parallel task execution
3. Deploy to production
"""

    document = convert_markdown_to_portable_text(markdown)
    logger.info("✓ Markdown converted to Portable Text")

    # Step 3: Export to HTML
    html = export_to_html(document, title="Hello Workflow Output")
    logger.info("✓ Exported to HTML")

    print("\n" + "=" * 60)
    print("HTML Output:")
    print("=" * 60)
    print(html[:500])
    print("...")
    print("=" * 60)

    logger.info("✅ Workflow complete!")

    return {"document": document, "html": html, "html_length": len(html)}


if __name__ == "__main__":
    # Run the workflow
    result = hello_workflow()
    print(f"\n✅ Workflow completed successfully!")
    print(f"Generated {result['html_length']} bytes of HTML")
