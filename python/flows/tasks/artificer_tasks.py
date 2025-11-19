"""
Artificer SDK task wrappers for Prefect flows.

These tasks wrap Artificer SDK operations with Prefect task decorators
for retry logic, caching, and observability.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from prefect import task, get_run_logger
from artificer_sdk import ArtificerClient


# Global client configuration
ARTIFICER_HOST = "localhost:50051"


@task(
    retries=2,
    retry_delay_seconds=5,
    cache_key_fn=lambda context, params: f"pdf_extract_{hash(params['pdf_data'][:100])}",
    cache_expiration=3600,  # Cache for 1 hour
)
def extract_pdf_text(pdf_data: bytes) -> Dict[str, Any]:
    """
    Extract text from PDF using Artificer.

    Args:
        pdf_data: PDF file bytes

    Returns:
        Dict with 'text' and 'metadata'
    """
    logger = get_run_logger()
    logger.info(f"Extracting text from PDF ({len(pdf_data)} bytes)")

    with ArtificerClient(ARTIFICER_HOST) as client:
        result = client.pdf.extract_text(pdf_data)

    logger.info(
        f"Extracted {len(result['text'])} characters from {result['metadata']['pages']} pages"
    )
    return result


@task(retries=2, retry_delay_seconds=5)
def process_pdf(
    pdf_data: bytes, force_ocr: bool = False, min_text_threshold: int = 100
) -> Dict[str, Any]:
    """
    Process PDF with smart OCR fallback.

    Args:
        pdf_data: PDF file bytes
        force_ocr: Force OCR even if text present
        min_text_threshold: Minimum text length to avoid OCR

    Returns:
        Dict with 'text' and 'metadata'
    """
    logger = get_run_logger()
    logger.info(f"Processing PDF with OCR fallback ({len(pdf_data)} bytes)")

    with ArtificerClient(ARTIFICER_HOST) as client:
        result = client.pdf.process_pdf(pdf_data, force_ocr, min_text_threshold)

    logger.info(f"PDF processed using {result['metadata']['method']} method")
    return result


@task(retries=2, retry_delay_seconds=5)
def chunk_document(
    document_id: str,
    project_id: str,
    content: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> Dict[str, Any]:
    """
    Chunk document into overlapping segments.

    Args:
        document_id: Document ID
        project_id: Project ID
        content: Document content
        chunk_size: Target chunk size
        chunk_overlap: Overlap between chunks

    Returns:
        Dict with 'chunks' and 'total_chunks'
    """
    logger = get_run_logger()
    logger.info(f"Chunking document {document_id} ({len(content)} chars)")

    with ArtificerClient(ARTIFICER_HOST) as client:
        result = client.text.chunk_document(
            document_id=document_id,
            project_id=project_id,
            content=content,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

    logger.info(f"Created {result['total_chunks']} chunks")
    return result


@task(retries=2, retry_delay_seconds=5)
def import_markdown(
    content: str, strict_mode: bool = False, include_metadata: bool = True
) -> Dict[str, Any]:
    """
    Import markdown to Portable Text.

    Args:
        content: Markdown content
        strict_mode: Strict parsing mode
        include_metadata: Include metadata in output

    Returns:
        Dict with 'document' and 'processing_time_ms'
    """
    logger = get_run_logger()
    logger.info(f"Importing markdown ({len(content)} chars)")

    with ArtificerClient(ARTIFICER_HOST) as client:
        result = client.conversion.import_markdown(content, strict_mode, include_metadata)

    logger.info(f"Markdown imported in {result['processing_time_ms']}ms")
    return result


@task(retries=2, retry_delay_seconds=5)
def import_html(content: str) -> Dict[str, Any]:
    """
    Import HTML to Portable Text.

    Args:
        content: HTML content

    Returns:
        Dict with 'document' and 'processing_time_ms'
    """
    logger = get_run_logger()
    logger.info(f"Importing HTML ({len(content)} chars)")

    with ArtificerClient(ARTIFICER_HOST) as client:
        result = client.conversion.import_html(content)

    logger.info(f"HTML imported in {result['processing_time_ms']}ms")
    return result


@task(retries=2, retry_delay_seconds=5)
def export_html(
    document: Dict[str, Any],
    include_styles: bool = True,
    include_metadata: bool = False,
    class_name: str = "portable-text",
    title: str = "",
) -> Dict[str, Any]:
    """
    Export Portable Text to HTML.

    Args:
        document: Portable Text document
        include_styles: Include CSS styles
        include_metadata: Include metadata
        class_name: CSS class name
        title: Document title

    Returns:
        Dict with 'html' and 'processing_time_ms'
    """
    logger = get_run_logger()
    logger.info("Exporting to HTML")

    with ArtificerClient(ARTIFICER_HOST) as client:
        result = client.conversion.export_html(
            document, include_styles, include_metadata, class_name, title
        )

    logger.info(f"HTML exported in {result['processing_time_ms']}ms")
    return result


@task(retries=2, retry_delay_seconds=5)
def export_markdown(
    document: Dict[str, Any], include_metadata: bool = False
) -> Dict[str, Any]:
    """
    Export Portable Text to Markdown.

    Args:
        document: Portable Text document
        include_metadata: Include metadata

    Returns:
        Dict with 'markdown' and 'processing_time_ms'
    """
    logger = get_run_logger()
    logger.info("Exporting to Markdown")

    with ArtificerClient(ARTIFICER_HOST) as client:
        result = client.conversion.export_markdown(document, include_metadata)

    logger.info(f"Markdown exported in {result['processing_time_ms']}ms")
    return result


@task(retries=2, retry_delay_seconds=5)
def count_tokens(content: str, model: str = "gpt-4") -> Dict[str, Any]:
    """
    Count tokens in content.

    Args:
        content: Text content
        model: Model for tokenization

    Returns:
        Dict with 'token_count', 'model', 'processing_time_ms'
    """
    logger = get_run_logger()
    logger.info(f"Counting tokens for {len(content)} chars")

    with ArtificerClient(ARTIFICER_HOST) as client:
        result = client.text.count_tokens(content, model)

    logger.info(f"Token count: {result['token_count']}")
    return result


@task(retries=2, retry_delay_seconds=5)
def ocr_image(image_data: bytes, content_type: str = "image/png") -> Dict[str, Any]:
    """
    Extract text from image using OCR.

    Args:
        image_data: Image file bytes
        content_type: MIME type

    Returns:
        Dict with 'text', 'confidence', 'metadata'
    """
    logger = get_run_logger()
    logger.info(f"Running OCR on image ({len(image_data)} bytes)")

    with ArtificerClient(ARTIFICER_HOST) as client:
        result = client.image.extract_text_from_image(image_data, content_type)

    logger.info(
        f"OCR complete: {len(result['text'])} chars, "
        f"confidence={result['confidence']:.2f}, "
        f"provider={result['metadata']['provider']}"
    )
    return result


@task(retries=1, retry_delay_seconds=2)
def health_check() -> Dict[str, Any]:
    """
    Check Artificer service health.

    Returns:
        Dict with 'status', 'service', 'version', 'processors'
    """
    logger = get_run_logger()
    logger.info("Checking Artificer health")

    with ArtificerClient(ARTIFICER_HOST) as client:
        result = client.metrics.health_check()

    logger.info(f"Health check: {result['status']}")
    return result
