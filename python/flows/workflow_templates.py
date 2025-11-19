"""
Workflow Templates - Pre-built workflow patterns

Phase 3: Pre-built workflow templates that users can instantiate
with their own parameters for common use cases.
"""

from typing import Dict, Any, List, Optional


class WorkflowTemplate:
    """Base class for workflow templates."""

    def __init__(
        self,
        template_id: str,
        name: str,
        description: str,
        category: str,
        version: str = "1.0.0",
    ):
        self.template_id = template_id
        self.name = name
        self.description = description
        self.category = category
        self.version = version
        self.parameters: Dict[str, Any] = {}
        self.definition: Dict[str, Any] = {}

    def get_parameters(self) -> Dict[str, Any]:
        """Get template parameters schema."""
        return self.parameters

    def get_definition(self) -> Dict[str, Any]:
        """Get template workflow definition."""
        return self.definition

    def instantiate(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Instantiate template with specific parameters.

        Args:
            params: Parameter values

        Returns:
            Workflow definition with parameters applied
        """
        # This is overridden by subclasses
        return self.definition


# ========================================
# DOCUMENT PROCESSING TEMPLATES
# ========================================


class RAGIngestionTemplate(WorkflowTemplate):
    """
    RAG Document Ingestion Pipeline

    Extract PDF → Chunk → Prepare for vector embedding

    Perfect for: Building knowledge bases, document search, RAG systems
    """

    def __init__(self):
        super().__init__(
            template_id="rag-ingestion",
            name="RAG Document Ingestion",
            description="Extract PDF, chunk, and prepare for vector embedding",
            category="Document Processing",
        )

        self.parameters = {
            "chunk_size": {
                "type": "integer",
                "default": 1000,
                "description": "Target chunk size in characters",
            },
            "chunk_overlap": {
                "type": "integer",
                "default": 200,
                "description": "Overlap between chunks",
            },
            "force_ocr": {
                "type": "boolean",
                "default": False,
                "description": "Force OCR even if text is present",
            },
        }

        self.definition = {
            "name": "rag-ingestion-pipeline",
            "description": "Extract and chunk PDF for RAG/vector search",
            "version": "1.0.0",
            "tasks": [
                {
                    "id": "process_pdf",
                    "type": "process_pdf",
                    "inputs": {
                        "pdf_data": "{{workflow.input.pdf_data}}",
                        "force_ocr": "{{workflow.input.force_ocr}}",
                        "min_text_threshold": 100,
                    },
                },
                {
                    "id": "chunk",
                    "type": "chunk_document",
                    "depends_on": ["process_pdf"],
                    "inputs": {
                        "document_id": "{{workflow.input.document_id}}",
                        "project_id": "{{workflow.input.project_id}}",
                        "content": "{{process_pdf.text}}",
                        "chunk_size": "{{workflow.input.chunk_size}}",
                        "chunk_overlap": "{{workflow.input.chunk_overlap}}",
                    },
                },
            ],
            "output": {
                "chunks": "{{chunk.chunks}}",
                "total_chunks": "{{chunk.total_chunks}}",
                "metadata": "{{process_pdf.metadata}}",
            },
            "options": {"parallel": False, "timeout": 300},
        }


class MultiFormatConversionTemplate(WorkflowTemplate):
    """
    Multi-Format Document Conversion

    PDF → Extract → Export to HTML, Markdown, and Portable Text

    Perfect for: Document publishing, content management, cross-platform distribution
    """

    def __init__(self):
        super().__init__(
            template_id="multi-format-conversion",
            name="Multi-Format Document Conversion",
            description="Convert PDF to HTML, Markdown, and Portable Text",
            category="Document Processing",
        )

        self.parameters = {
            "include_styles": {
                "type": "boolean",
                "default": True,
                "description": "Include CSS styles in HTML output",
            },
            "title": {
                "type": "string",
                "default": "Converted Document",
                "description": "Document title for HTML export",
            },
        }

        self.definition = {
            "name": "multi-format-conversion",
            "description": "Convert PDF to multiple output formats",
            "version": "1.0.0",
            "tasks": [
                {
                    "id": "extract",
                    "type": "extract_pdf_text",
                    "inputs": {"pdf_data": "{{workflow.input.pdf_data}}"},
                },
                {
                    "id": "import_md",
                    "type": "import_markdown",
                    "depends_on": ["extract"],
                    "inputs": {
                        "content": "{{extract.text}}",
                        "strict_mode": False,
                        "include_metadata": True,
                    },
                },
                {
                    "id": "export_html",
                    "type": "export_html",
                    "depends_on": ["import_md"],
                    "inputs": {
                        "document": "{{import_md.document}}",
                        "include_styles": "{{workflow.input.include_styles}}",
                        "include_metadata": True,
                        "class_name": "converted-doc",
                        "title": "{{workflow.input.title}}",
                    },
                },
                {
                    "id": "export_md",
                    "type": "export_markdown",
                    "depends_on": ["import_md"],
                    "inputs": {"document": "{{import_md.document}}", "include_metadata": False},
                },
            ],
            "output": {
                "html": "{{export_html.html}}",
                "markdown": "{{export_md.markdown}}",
                "portable_text": "{{import_md.document}}",
                "metadata": "{{extract.metadata}}",
            },
            "options": {"parallel": True, "timeout": 600},
        }


class DocumentAnalysisTemplate(WorkflowTemplate):
    """
    Document Analysis Pipeline

    Extract → Count tokens → Analyze structure → Export

    Perfect for: Document metrics, content auditing, cost estimation
    """

    def __init__(self):
        super().__init__(
            template_id="document-analysis",
            name="Document Analysis Pipeline",
            description="Extract and analyze document metrics (tokens, structure, etc.)",
            category="Document Processing",
        )

        self.parameters = {
            "model": {
                "type": "string",
                "default": "gpt-4",
                "description": "Model for token counting",
            }
        }

        self.definition = {
            "name": "document-analysis",
            "description": "Comprehensive document analysis",
            "version": "1.0.0",
            "tasks": [
                {
                    "id": "extract",
                    "type": "extract_pdf_text",
                    "inputs": {"pdf_data": "{{workflow.input.pdf_data}}"},
                },
                {
                    "id": "count_tokens",
                    "type": "count_tokens",
                    "depends_on": ["extract"],
                    "inputs": {
                        "content": "{{extract.text}}",
                        "model": "{{workflow.input.model}}",
                    },
                },
                {
                    "id": "import_structure",
                    "type": "import_markdown",
                    "depends_on": ["extract"],
                    "inputs": {
                        "content": "{{extract.text}}",
                        "strict_mode": False,
                        "include_metadata": True,
                    },
                },
            ],
            "output": {
                "text": "{{extract.text}}",
                "token_count": "{{count_tokens.token_count}}",
                "metadata": "{{extract.metadata}}",
                "structure": "{{import_structure.document}}",
            },
            "options": {"parallel": True, "timeout": 300},
        }


# ========================================
# BATCH PROCESSING TEMPLATES
# ========================================


class BatchRAGIngestionTemplate(WorkflowTemplate):
    """
    Batch RAG Document Ingestion

    Process multiple PDFs in parallel → Chunk each → Prepare for vector DB

    Perfect for: Bulk document imports, knowledge base construction
    """

    def __init__(self):
        super().__init__(
            template_id="batch-rag-ingestion",
            name="Batch RAG Document Ingestion",
            description="Process multiple PDFs in parallel for RAG/vector search",
            category="Batch Processing",
        )

        self.parameters = {
            "chunk_size": {
                "type": "integer",
                "default": 1000,
                "description": "Target chunk size",
            },
            "chunk_overlap": {
                "type": "integer",
                "default": 200,
                "description": "Chunk overlap",
            },
        }

        # Note: This template requires dynamic task generation based on input PDFs
        # The actual implementation would be in instantiate()
        self.definition = {
            "name": "batch-rag-ingestion",
            "description": "Batch process PDFs for RAG ingestion",
            "version": "1.0.0",
            "tasks": [],  # Generated dynamically
            "output": {"results": "{{workflow.input.results}}"},
            "options": {"parallel": True, "timeout": 900},
        }


# ========================================
# CONTENT PROCESSING TEMPLATES
# ========================================


class ContentEnhancementTemplate(WorkflowTemplate):
    """
    Content Enhancement Pipeline

    Extract → Clean → Enhance → Export to multiple formats

    Perfect for: Content publishing, blog migration, documentation generation
    """

    def __init__(self):
        super().__init__(
            template_id="content-enhancement",
            name="Content Enhancement Pipeline",
            description="Extract, clean, and export content to multiple formats",
            category="Content Processing",
        )

        self.parameters = {
            "include_styles": {"type": "boolean", "default": True},
            "title": {"type": "string", "default": "Enhanced Content"},
        }

        self.definition = {
            "name": "content-enhancement",
            "description": "Enhance and export content",
            "version": "1.0.0",
            "tasks": [
                {
                    "id": "extract",
                    "type": "extract_pdf_text",
                    "inputs": {"pdf_data": "{{workflow.input.pdf_data}}"},
                },
                {
                    "id": "import_clean",
                    "type": "import_markdown",
                    "depends_on": ["extract"],
                    "inputs": {
                        "content": "{{extract.text}}",
                        "strict_mode": False,
                        "include_metadata": True,
                    },
                },
                {
                    "id": "export_html",
                    "type": "export_html",
                    "depends_on": ["import_clean"],
                    "inputs": {
                        "document": "{{import_clean.document}}",
                        "include_styles": "{{workflow.input.include_styles}}",
                        "include_metadata": True,
                        "class_name": "enhanced-content",
                        "title": "{{workflow.input.title}}",
                    },
                },
                {
                    "id": "export_markdown",
                    "type": "export_markdown",
                    "depends_on": ["import_clean"],
                    "inputs": {
                        "document": "{{import_clean.document}}",
                        "include_metadata": False,
                    },
                },
            ],
            "output": {
                "html": "{{export_html.html}}",
                "markdown": "{{export_markdown.markdown}}",
                "portable_text": "{{import_clean.document}}",
            },
            "options": {"parallel": True, "timeout": 600},
        }


class MetadataExtractionTemplate(WorkflowTemplate):
    """
    Metadata Extraction Pipeline

    Extract → Analyze → Count tokens → Structure metadata

    Perfect for: Document cataloging, search indexing, content inventory
    """

    def __init__(self):
        super().__init__(
            template_id="metadata-extraction",
            name="Metadata Extraction Pipeline",
            description="Extract comprehensive metadata from documents",
            category="Content Processing",
        )

        self.parameters = {
            "token_model": {"type": "string", "default": "gpt-4"},
        }

        self.definition = {
            "name": "metadata-extraction",
            "description": "Extract document metadata",
            "version": "1.0.0",
            "tasks": [
                {
                    "id": "extract",
                    "type": "extract_pdf_text",
                    "inputs": {"pdf_data": "{{workflow.input.pdf_data}}"},
                },
                {
                    "id": "count_tokens",
                    "type": "count_tokens",
                    "depends_on": ["extract"],
                    "inputs": {
                        "content": "{{extract.text}}",
                        "model": "{{workflow.input.token_model}}",
                    },
                },
                {
                    "id": "parse_structure",
                    "type": "import_markdown",
                    "depends_on": ["extract"],
                    "inputs": {
                        "content": "{{extract.text}}",
                        "strict_mode": False,
                        "include_metadata": True,
                    },
                },
            ],
            "output": {
                "pdf_metadata": "{{extract.metadata}}",
                "token_count": "{{count_tokens.token_count}}",
                "token_model": "{{count_tokens.model}}",
                "document_structure": "{{parse_structure.document}}",
                "text_length": "{{workflow.input.text_length}}",
            },
            "options": {"parallel": True, "timeout": 300},
        }


# ========================================
# TEMPLATE REGISTRY
# ========================================

WORKFLOW_TEMPLATES: Dict[str, WorkflowTemplate] = {
    "rag-ingestion": RAGIngestionTemplate(),
    "multi-format-conversion": MultiFormatConversionTemplate(),
    "document-analysis": DocumentAnalysisTemplate(),
    "batch-rag-ingestion": BatchRAGIngestionTemplate(),
    "content-enhancement": ContentEnhancementTemplate(),
    "metadata-extraction": MetadataExtractionTemplate(),
}


def list_templates(category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    List all available workflow templates.

    Args:
        category: Optional category filter

    Returns:
        List of template metadata
    """
    templates = []
    for template_id, template in WORKFLOW_TEMPLATES.items():
        if category and template.category != category:
            continue

        templates.append(
            {
                "id": template.template_id,
                "name": template.name,
                "description": template.description,
                "category": template.category,
                "version": template.version,
                "parameters": template.get_parameters(),
            }
        )

    return templates


def get_template(template_id: str) -> Optional[WorkflowTemplate]:
    """
    Get a workflow template by ID.

    Args:
        template_id: Template ID

    Returns:
        WorkflowTemplate instance or None
    """
    return WORKFLOW_TEMPLATES.get(template_id)


def get_template_categories() -> List[str]:
    """
    Get all template categories.

    Returns:
        List of category names
    """
    categories = set()
    for template in WORKFLOW_TEMPLATES.values():
        categories.add(template.category)
    return sorted(list(categories))


def instantiate_template(template_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Instantiate a template with specific parameters.

    Args:
        template_id: Template ID
        params: Parameter values

    Returns:
        Workflow definition ready to register/execute

    Raises:
        ValueError: If template not found
    """
    template = get_template(template_id)
    if not template:
        raise ValueError(f"Template not found: {template_id}")

    # Get base definition
    definition = template.get_definition().copy()

    # Merge any custom params (templates can override instantiate for complex logic)
    if hasattr(template, "instantiate"):
        definition = template.instantiate(params)

    return definition


if __name__ == "__main__":
    # Example usage
    print("Available Workflow Templates:")
    print("=" * 60)

    categories = get_template_categories()
    for category in categories:
        print(f"\n{category}:")
        templates = list_templates(category=category)
        for tmpl in templates:
            print(f"  - {tmpl['id']}: {tmpl['name']}")
            print(f"    {tmpl['description']}")
