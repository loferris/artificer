"""
Prefect workflows for document processing pipelines.

This module contains example Prefect flows that demonstrate how to use
Artificer SDK with Prefect for stateful, orchestrated workflows.
"""

from flows.translation_pipeline import translation_pipeline
from flows.tasks.artificer_tasks import (
    extract_pdf_text,
    chunk_document,
    import_markdown,
    export_html,
)
from flows.tasks.webhook_tasks import webhook_call, parallel_webhook_calls

__all__ = [
    "translation_pipeline",
    "extract_pdf_text",
    "chunk_document",
    "import_markdown",
    "export_html",
    "webhook_call",
    "parallel_webhook_calls",
]
