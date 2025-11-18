"""
Workflows resource
"""

from typing import Dict, Any, List, Optional
from .base import BaseResource


class Workflows(BaseResource):
    """Workflows API resource for Prefect orchestration."""

    def list(self) -> dict:
        """
        List all available Prefect workflows.

        Returns:
            Available workflows and Prefect service status

        Example:
            >>> workflows = client.workflows.list()
            >>> print(f"Available: {workflows['available']}")
            >>> for wf in workflows['workflows']:
            ...     print(f"{wf['id']}: {wf['description']}")
        """
        return self._trpc_request("workflows.list")

    def get(self, workflow_id: str) -> dict:
        """
        Get details for a specific workflow.

        Args:
            workflow_id: Workflow ID (e.g., 'pdf-to-html')

        Returns:
            Workflow details including inputs and description

        Example:
            >>> workflow = client.workflows.get("pdf-to-html")
            >>> print(f"Name: {workflow['name']}")
            >>> print(f"Inputs: {workflow['inputs']}")
        """
        return self._trpc_request("workflows.get", {"workflowId": workflow_id})

    def execute(
        self,
        workflow_id: str,
        inputs: Dict[str, Any]
    ) -> dict:
        """
        Execute any workflow by ID with custom inputs.

        Args:
            workflow_id: Workflow ID
            inputs: Workflow-specific inputs (see workflow.inputs for schema)

        Returns:
            Workflow execution result

        Example:
            >>> result = client.workflows.execute(
            ...     "pdf-to-html",
            ...     {
            ...         "pdf_data": base64_encoded_pdf,
            ...         "include_styles": True,
            ...         "title": "My Document"
            ...     }
            ... )
            >>> print(f"Success: {result['success']}")
            >>> print(f"Result: {result['result']}")
        """
        return self._trpc_request("workflows.execute", {
            "workflowId": workflow_id,
            "inputs": inputs
        })

    def execute_pdf_to_html(
        self,
        pdf_data: str,
        include_styles: bool = True,
        title: Optional[str] = None
    ) -> dict:
        """
        Execute PDF to HTML conversion pipeline.

        Workflow: Extract PDF → Convert to Portable Text → Export as HTML

        Args:
            pdf_data: Base64-encoded PDF file
            include_styles: Include CSS styles in HTML (default: True)
            title: Optional title for the HTML document

        Returns:
            Workflow result with HTML output

        Example:
            >>> import base64
            >>> with open("document.pdf", "rb") as f:
            ...     pdf_data = base64.b64encode(f.read()).decode()
            >>> result = client.workflows.execute_pdf_to_html(
            ...     pdf_data,
            ...     include_styles=True,
            ...     title="My Document"
            ... )
            >>> html = result['result']['html']
        """
        inputs = {
            "pdf_data": pdf_data,
            "include_styles": include_styles
        }
        if title:
            inputs["title"] = title

        return self._trpc_request("workflows.executePdfToHtml", inputs)

    def execute_pdf_with_ocr(
        self,
        pdf_data: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ) -> dict:
        """
        Execute PDF processing with OCR and chunking.

        Workflow: Extract PDF → OCR if needed → Chunk text → Process

        Args:
            pdf_data: Base64-encoded PDF file
            chunk_size: Size of text chunks (default: 1000 characters)
            chunk_overlap: Overlap between chunks (default: 200 characters)

        Returns:
            Workflow result with chunks and metadata

        Example:
            >>> result = client.workflows.execute_pdf_with_ocr(
            ...     pdf_data,
            ...     chunk_size=500,
            ...     chunk_overlap=100
            ... )
            >>> chunks = result['result']['chunks']
            >>> print(f"Extracted {len(chunks)} chunks")
        """
        return self._trpc_request("workflows.executePdfWithOcr", {
            "pdf_data": pdf_data,
            "chunk_size": chunk_size,
            "chunk_overlap": chunk_overlap
        })

    def execute_batch_pdf(
        self,
        pdf_files: List[Dict[str, str]],
        max_workers: int = 3
    ) -> dict:
        """
        Execute batch PDF processing in parallel.

        Workflow: Process multiple PDFs concurrently with progress tracking

        Args:
            pdf_files: List of PDFs, each with 'filename' and 'data' (base64)
            max_workers: Maximum parallel workers (default: 3)

        Returns:
            Workflow result with all processed PDFs

        Example:
            >>> pdf_files = [
            ...     {"filename": "doc1.pdf", "data": base64_pdf1},
            ...     {"filename": "doc2.pdf", "data": base64_pdf2}
            ... ]
            >>> result = client.workflows.execute_batch_pdf(
            ...     pdf_files,
            ...     max_workers=5
            ... )
            >>> for item in result['result']['results']:
            ...     print(f"{item['filename']}: {item['status']}")
        """
        return self._trpc_request("workflows.executeBatchPdf", {
            "pdf_files": pdf_files,
            "max_workers": max_workers
        })

    def execute_image_ocr(
        self,
        image_data: str,
        language: str = "eng"
    ) -> dict:
        """
        Execute OCR on an image.

        Workflow: Preprocess image → Run OCR → Extract structured text

        Args:
            image_data: Base64-encoded image file
            language: OCR language code (default: 'eng')

        Returns:
            Workflow result with extracted text and confidence

        Example:
            >>> import base64
            >>> with open("receipt.jpg", "rb") as f:
            ...     image_data = base64.b64encode(f.read()).decode()
            >>> result = client.workflows.execute_image_ocr(
            ...     image_data,
            ...     language="eng"
            ... )
            >>> print(f"Text: {result['result']['text']}")
            >>> print(f"Confidence: {result['result']['confidence']}")
        """
        return self._trpc_request("workflows.executeImageOcr", {
            "image_data": image_data,
            "language": language
        })

    def execute_markdown_conversion(
        self,
        source_format: str,
        content: str,
        target_format: str = "markdown"
    ) -> dict:
        """
        Execute format conversion to/from markdown.

        Workflow: Parse source → Convert to AST → Export to target format

        Args:
            source_format: Source format ('html', 'docx', 'pdf', 'markdown')
            content: Content to convert
            target_format: Target format (default: 'markdown')

        Returns:
            Workflow result with converted content

        Example:
            >>> result = client.workflows.execute_markdown_conversion(
            ...     source_format="html",
            ...     content="<h1>Title</h1><p>Content</p>",
            ...     target_format="markdown"
            ... )
            >>> markdown = result['result']['content']
        """
        return self._trpc_request("workflows.executeMarkdownConversion", {
            "source_format": source_format,
            "content": content,
            "target_format": target_format
        })

    def execute_translation(
        self,
        text: str,
        target_language: str,
        source_language: str = "auto",
        use_specialists: bool = True,
        min_specialists_required: int = 3
    ) -> dict:
        """
        Execute translation with multiple specialist models.

        Workflow: Parallel translation by specialists → Consensus selection

        Args:
            text: Text to translate
            target_language: Target language code (e.g., 'es', 'fr', 'de')
            source_language: Source language (default: 'auto' for auto-detect)
            use_specialists: Use multiple models for consensus (default: True)
            min_specialists_required: Min successful translations (default: 3)

        Returns:
            Workflow result with translation and metadata

        Example:
            >>> result = client.workflows.execute_translation(
            ...     text="Hello, world!",
            ...     target_language="es",
            ...     use_specialists=True
            ... )
            >>> translation = result['result']['translation']
            >>> print(f"Confidence: {result['result']['confidence']}")
            >>> print(f"Models used: {result['result']['models_used']}")
        """
        return self._trpc_request("workflows.executeTranslation", {
            "text": text,
            "target_language": target_language,
            "source_language": source_language,
            "use_specialists": use_specialists,
            "min_specialists_required": min_specialists_required
        })

    def execute_batch_translation(
        self,
        texts: List[str],
        target_language: str,
        source_language: str = "auto",
        max_workers: int = 3
    ) -> dict:
        """
        Execute batch translation in parallel.

        Workflow: Process multiple texts concurrently with progress tracking

        Args:
            texts: List of texts to translate
            target_language: Target language code
            source_language: Source language (default: 'auto')
            max_workers: Maximum parallel workers (default: 3)

        Returns:
            Workflow result with all translations

        Example:
            >>> texts = [
            ...     "Hello, world!",
            ...     "How are you?",
            ...     "Good morning"
            ... ]
            >>> result = client.workflows.execute_batch_translation(
            ...     texts,
            ...     target_language="es",
            ...     max_workers=5
            ... )
            >>> for i, item in enumerate(result['result']['translations']):
            ...     print(f"{texts[i]} → {item['translation']}")
        """
        return self._trpc_request("workflows.executeBatchTranslation", {
            "texts": texts,
            "target_language": target_language,
            "source_language": source_language,
            "max_workers": max_workers
        })

    def health_check(self) -> dict:
        """
        Check Prefect service availability.

        Returns:
            Health check result

        Example:
            >>> health = client.workflows.health_check()
            >>> print(f"Available: {health['available']}")
            >>> print(f"Version: {health.get('version', 'unknown')}")
        """
        return self._trpc_request("workflows.healthCheck")
