"""
Prefect task definitions for Artificer workflows.
"""

from flows.tasks.artificer_tasks import (
    extract_pdf_text,
    process_pdf,
    chunk_document,
    import_markdown,
    import_html,
    export_html,
    export_markdown,
    count_tokens,
    ocr_image,
    health_check,
)

from flows.tasks.webhook_tasks import (
    webhook_call,
    fableforge_refine,
    fableforge_tag,
    fableforge_select_best,
    parallel_webhook_calls,
)

__all__ = [
    # Artificer tasks
    "extract_pdf_text",
    "process_pdf",
    "chunk_document",
    "import_markdown",
    "import_html",
    "export_html",
    "export_markdown",
    "count_tokens",
    "ocr_image",
    "health_check",
    # Webhook tasks
    "webhook_call",
    "fableforge_refine",
    "fableforge_tag",
    "fableforge_select_best",
    "parallel_webhook_calls",
]
