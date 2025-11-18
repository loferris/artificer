"""
Document Processing Pipelines

Examples of using Artificer SDK with Prefect for document processing workflows:
- PDF extraction and conversion
- Batch document processing
- OCR pipelines
"""

import sys
from pathlib import Path
from typing import Dict, Any, List

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from prefect import flow, get_run_logger
from prefect.task_runners import ConcurrentTaskRunner
from flows.tasks.artificer_tasks import (
    extract_pdf_text,
    process_pdf,
    chunk_document,
    import_markdown,
    export_html,
    export_markdown,
    ocr_image,
    health_check,
)


@flow(
    name="pdf-to-html-pipeline",
    description="Extract PDF, convert to Portable Text, export as HTML",
)
def pdf_to_html_pipeline(
    pdf_data: bytes,
    include_styles: bool = True,
    title: str = "Converted Document",
) -> Dict[str, Any]:
    """
    Complete PDF to HTML conversion pipeline.

    Steps:
    1. Extract text from PDF
    2. Import text as markdown (Portable Text)
    3. Export to HTML with styling

    Args:
        pdf_data: PDF file bytes
        include_styles: Include CSS in HTML
        title: Document title

    Returns:
        Dict with 'html', 'metadata', 'processing_stats'
    """
    logger = get_run_logger()
    logger.info("Starting PDF to HTML pipeline")

    # Step 1: Extract text from PDF
    pdf_result = extract_pdf_text(pdf_data)
    text = pdf_result["text"]
    pdf_metadata = pdf_result["metadata"]

    logger.info(f"Extracted {len(text)} chars from {pdf_metadata['pages']} pages")

    # Step 2: Convert to Portable Text (using markdown import)
    import_result = import_markdown(text, strict_mode=False, include_metadata=True)
    document = import_result["document"]

    # Step 3: Export to HTML
    html_result = export_html(
        document=document,
        include_styles=include_styles,
        include_metadata=True,
        title=title or pdf_metadata.get("title", "Document"),
    )

    return {
        "html": html_result["html"],
        "metadata": {
            "source": "pdf",
            "pages": pdf_metadata["pages"],
            "extraction_method": pdf_metadata["method"],
        },
        "processing_stats": {
            "text_length": len(text),
            "pdf_processing_ms": pdf_metadata["processing_time_ms"],
            "markdown_import_ms": import_result["processing_time_ms"],
            "html_export_ms": html_result["processing_time_ms"],
            "total_ms": (
                pdf_metadata["processing_time_ms"]
                + import_result["processing_time_ms"]
                + html_result["processing_time_ms"]
            ),
        },
    }


@flow(
    name="pdf-with-ocr-pipeline",
    description="Process PDF with OCR fallback and chunking",
)
def pdf_with_ocr_pipeline(
    pdf_data: bytes, chunk_size: int = 1000, chunk_overlap: int = 200
) -> Dict[str, Any]:
    """
    Process PDF with smart OCR and chunk into segments.

    Steps:
    1. Process PDF (with OCR if needed)
    2. Chunk text into overlapping segments

    Args:
        pdf_data: PDF file bytes
        chunk_size: Target chunk size
        chunk_overlap: Overlap between chunks

    Returns:
        Dict with 'chunks', 'metadata'
    """
    logger = get_run_logger()
    logger.info("Starting PDF with OCR pipeline")

    # Process PDF with OCR fallback
    pdf_result = process_pdf(pdf_data, force_ocr=False, min_text_threshold=100)
    text = pdf_result["text"]
    metadata = pdf_result["metadata"]

    logger.info(f"PDF processed using {metadata['method']} method")

    # Chunk the text
    chunk_result = chunk_document(
        document_id="pdf_doc",
        project_id="pipeline",
        content=text,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    return {
        "chunks": chunk_result["chunks"],
        "total_chunks": chunk_result["total_chunks"],
        "metadata": {
            "pages": metadata["pages"],
            "method": metadata["method"],
            "has_text_content": metadata["has_text_content"],
        },
    }


@flow(
    name="batch-pdf-processing",
    description="Process multiple PDFs in parallel",
    task_runner=ConcurrentTaskRunner(),
)
def batch_pdf_processing(pdf_files: List[Dict[str, bytes]]) -> List[Dict[str, Any]]:
    """
    Process multiple PDF files in parallel.

    Args:
        pdf_files: List of dicts with 'filename' and 'data' keys

    Returns:
        List of processing results
    """
    logger = get_run_logger()
    logger.info(f"Processing {len(pdf_files)} PDFs in parallel")

    # Submit all PDFs for processing
    futures = [extract_pdf_text.submit(pdf["data"]) for pdf in pdf_files]

    # Collect results
    results = []
    for pdf_file, future in zip(pdf_files, futures):
        try:
            result = future.result()
            results.append(
                {
                    "filename": pdf_file["filename"],
                    "status": "success",
                    "text": result["text"],
                    "metadata": result["metadata"],
                }
            )
        except Exception as e:
            results.append(
                {"filename": pdf_file["filename"], "status": "failed", "error": str(e)}
            )

    successful = sum(1 for r in results if r["status"] == "success")
    logger.info(f"Batch processing complete: {successful}/{len(pdf_files)} succeeded")

    return results


@flow(
    name="image-ocr-pipeline",
    description="Extract text from images using OCR",
    task_runner=ConcurrentTaskRunner(),
)
def image_ocr_pipeline(
    images: List[Dict[str, Any]], min_confidence: float = 0.7
) -> Dict[str, Any]:
    """
    Extract text from multiple images in parallel.

    Args:
        images: List of dicts with 'data' (bytes) and 'content_type' (str)
        min_confidence: Minimum confidence threshold

    Returns:
        Dict with 'results', 'statistics'
    """
    logger = get_run_logger()
    logger.info(f"Processing {len(images)} images with OCR")

    # Submit all OCR tasks in parallel
    futures = [
        ocr_image.submit(img["data"], img.get("content_type", "image/png"))
        for img in images
    ]

    # Collect results
    results = []
    high_confidence_count = 0
    total_chars = 0

    for i, future in enumerate(futures):
        try:
            result = future.result()
            confidence = result["confidence"]

            results.append(
                {
                    "image_index": i,
                    "status": "success",
                    "text": result["text"],
                    "confidence": confidence,
                    "provider": result["metadata"]["provider"],
                    "high_confidence": confidence >= min_confidence,
                }
            )

            if confidence >= min_confidence:
                high_confidence_count += 1
            total_chars += len(result["text"])

        except Exception as e:
            results.append({"image_index": i, "status": "failed", "error": str(e)})

    return {
        "results": results,
        "statistics": {
            "total_images": len(images),
            "successful": sum(1 for r in results if r["status"] == "success"),
            "high_confidence_count": high_confidence_count,
            "total_chars_extracted": total_chars,
            "avg_chars_per_image": total_chars / len(images) if images else 0,
        },
    }


@flow(name="markdown-conversion-pipeline", description="Markdown to multiple formats")
def markdown_conversion_pipeline(markdown_content: str) -> Dict[str, Any]:
    """
    Convert markdown to multiple output formats.

    Steps:
    1. Import markdown to Portable Text
    2. Export to HTML
    3. Export back to Markdown (normalized)

    Args:
        markdown_content: Markdown text

    Returns:
        Dict with 'html' and 'markdown' outputs
    """
    logger = get_run_logger()
    logger.info("Starting markdown conversion pipeline")

    # Import markdown
    import_result = import_markdown(markdown_content, strict_mode=False)
    document = import_result["document"]

    # Export to HTML
    html_result = export_html(document, include_styles=True, title="Converted Document")

    # Export back to markdown (normalized)
    markdown_result = export_markdown(document, include_metadata=False)

    return {
        "html": html_result["html"],
        "markdown": markdown_result["markdown"],
        "document": document,
        "processing_times": {
            "import_ms": import_result["processing_time_ms"],
            "html_export_ms": html_result["processing_time_ms"],
            "markdown_export_ms": markdown_result["processing_time_ms"],
        },
    }


@flow(name="health-check-flow", description="Check Artificer service health")
def health_check_flow() -> Dict[str, Any]:
    """
    Run health check on Artificer service.

    Returns:
        Health check result
    """
    logger = get_run_logger()
    logger.info("Running health check")

    result = health_check()

    if result["status"] == "ok":
        logger.info("✓ Artificer service is healthy")
    else:
        logger.warning("✗ Artificer service is unhealthy")

    return result


if __name__ == "__main__":
    # Example: Run health check
    print("Running health check...")
    health_result = health_check_flow()
    print(f"Status: {health_result['status']}")
    print(f"Processors: {health_result['processors']}")
