"""
Images and OCR resource
"""

import base64
from typing import Optional
from .base import BaseResource
from ..types import OCRResult


class Images(BaseResource):
    """Images and OCR API resource."""

    def extract_text(
        self,
        image_data: bytes,
        content_type: str = "image/png"
    ) -> OCRResult:
        """
        Extract text from image using OCR.

        Uses Python OCR service for best performance.

        Args:
            image_data: Image bytes
            content_type: MIME type (e.g., "image/png", "image/jpeg")

        Returns:
            OCR result with text and confidence

        Example:
            >>> with open("receipt.jpg", "rb") as f:
            ...     result = client.images.extract_text(
            ...         f.read(),
            ...         "image/jpeg"
            ...     )
            >>> print(f"Text: {result['text']}")
            >>> print(f"Confidence: {result['confidence']}")
        """
        encoded = base64.b64encode(image_data).decode('utf-8')

        return self._trpc_request("images.extractTextFromImage", {
            "imageData": encoded,
            "contentType": content_type
        })

    def analyze(
        self,
        image_data: bytes,
        content_type: str = "image/png",
        prompt: str = "Describe this image in detail."
    ) -> dict:
        """
        Analyze image with AI vision.

        Args:
            image_data: Image bytes
            content_type: MIME type
            prompt: Analysis prompt

        Returns:
            AI analysis

        Example:
            >>> with open("chart.png", "rb") as f:
            ...     result = client.images.analyze(
            ...         f.read(),
            ...         prompt="What insights can you extract from this chart?"
            ...     )
        """
        encoded = base64.b64encode(image_data).decode('utf-8')

        return self._trpc_request("images.analyzeImage", {
            "imageData": encoded,
            "contentType": content_type,
            "prompt": prompt
        })

    def process_pdf(
        self,
        pdf_data: bytes,
        force_ocr: bool = False,
        min_text_threshold: int = 100
    ) -> dict:
        """
        Process PDF with smart OCR fallback.

        Uses Python service for 10-20x faster processing.

        Args:
            pdf_data: PDF bytes
            force_ocr: Always use OCR even if text exists
            min_text_threshold: Use OCR if extracted text < this many chars

        Returns:
            PDF text and metadata

        Example:
            >>> with open("document.pdf", "rb") as f:
            ...     result = client.images.process_pdf(f.read())
            >>> print(f"Pages: {result['result']['metadata']['pages']}")
            >>> print(f"Text: {result['result']['text'][:200]}")
        """
        encoded = base64.b64encode(pdf_data).decode('utf-8')

        return self._trpc_request("images.processPdf", {
            "pdfData": encoded,
            "options": {
                "forceOCR": force_ocr,
                "minTextThreshold": min_text_threshold
            }
        })

    def check_pdf_needs_ocr(
        self,
        pdf_data: bytes,
        min_text_threshold: int = 100
    ) -> dict:
        """
        Check if PDF needs OCR (cost estimation).

        Args:
            pdf_data: PDF bytes
            min_text_threshold: OCR threshold

        Returns:
            OCR requirement and cost estimate

        Example:
            >>> with open("scanned.pdf", "rb") as f:
            ...     check = client.images.check_pdf_needs_ocr(f.read())
            >>> if check['result']['needsOCR']:
            ...     print(f"Estimated cost: ${check['result']['estimatedCost']:.4f}")
        """
        encoded = base64.b64encode(pdf_data).decode('utf-8')

        return self._trpc_request("images.checkPdfNeedsOCR", {
            "pdfData": encoded,
            "minTextThreshold": min_text_threshold
        })
