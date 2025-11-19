"""
PDFClient for PDF processing operations.
"""

import sys
from pathlib import Path
from typing import Dict, Any, Iterator, Optional

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "generated"))

import grpc
from generated.artificer import pdf_service_pb2
from generated.artificer import pdf_service_pb2_grpc


class PDFClient:
    """Client for PDF processing operations."""

    def __init__(self, channel: grpc.Channel):
        """
        Initialize PDF client.

        Args:
            channel: gRPC channel to use for requests
        """
        self.stub = pdf_service_pb2_grpc.PDFServiceStub(channel)

    def extract_text(self, pdf_data: bytes) -> Dict[str, Any]:
        """
        Extract text from PDF (direct extraction, no OCR).

        Args:
            pdf_data: PDF file data as bytes

        Returns:
            Dictionary with 'text' and 'metadata' containing:
            - pages: Number of pages
            - method: Extraction method used
            - has_text_content: Whether PDF has embedded text
            - processing_time_ms: Processing time
            - title, author, creator: PDF metadata fields
        """
        request = pdf_service_pb2.ExtractTextRequest(pdf_data=pdf_data)

        response = self.stub.ExtractText(request)

        return {
            "text": response.text,
            "metadata": {
                "pages": response.metadata.pages,
                "method": response.metadata.method,
                "has_text_content": response.metadata.has_text_content,
                "processing_time_ms": response.metadata.processing_time_ms,
                "title": response.metadata.title,
                "author": response.metadata.author,
                "creator": response.metadata.creator,
            },
        }

    def process_pdf(
        self,
        pdf_data: bytes,
        force_ocr: bool = False,
        min_text_threshold: int = 100,
    ) -> Dict[str, Any]:
        """
        Process PDF with smart OCR fallback.

        Automatically uses OCR if the PDF doesn't have embedded text
        or if force_ocr is True.

        Args:
            pdf_data: PDF file data as bytes
            force_ocr: Force OCR even if text is present
            min_text_threshold: Minimum text length to consider PDF as having text

        Returns:
            Dictionary with 'text' and 'metadata' (same structure as extract_text)
        """
        request = pdf_service_pb2.ProcessPDFRequest(
            pdf_data=pdf_data,
            force_ocr=force_ocr,
            min_text_threshold=min_text_threshold,
        )

        response = self.stub.ProcessPDF(request)

        return {
            "text": response.text,
            "metadata": {
                "pages": response.metadata.pages,
                "method": response.metadata.method,
                "has_text_content": response.metadata.has_text_content,
                "processing_time_ms": response.metadata.processing_time_ms,
                "title": response.metadata.title,
                "author": response.metadata.author,
                "creator": response.metadata.creator,
            },
        }

    def check_needs_ocr(
        self, pdf_data: bytes, min_text_threshold: int = 100
    ) -> Dict[str, Any]:
        """
        Check if PDF needs OCR and estimate cost.

        Useful for cost estimation before processing large PDFs.

        Args:
            pdf_data: PDF file data as bytes
            min_text_threshold: Minimum text length to consider PDF as having text

        Returns:
            Dictionary with:
            - needs_ocr: Whether OCR is needed
            - has_text_content: Whether PDF has embedded text
            - pages: Number of pages
            - text_length: Length of extracted text
            - avg_text_per_page: Average text per page
            - estimated_ocr_cost: Estimated cost in dollars if OCR needed
        """
        request = pdf_service_pb2.CheckNeedsOCRRequest(
            pdf_data=pdf_data, min_text_threshold=min_text_threshold
        )

        response = self.stub.CheckNeedsOCR(request)

        return {
            "needs_ocr": response.needs_ocr,
            "has_text_content": response.has_text_content,
            "pages": response.pages,
            "text_length": response.text_length,
            "avg_text_per_page": response.avg_text_per_page,
            "estimated_ocr_cost": response.estimated_ocr_cost,
        }

    def extract_pages_to_images(
        self,
        pdf_data: bytes,
        dpi: int = 200,
        format: str = "png",
        max_width: Optional[int] = None,
        max_height: Optional[int] = None,
    ) -> Iterator[Dict[str, Any]]:
        """
        Extract PDF pages as images (streaming).

        Yields one image per page. Useful for OCR or preview generation.

        Args:
            pdf_data: PDF file data as bytes
            dpi: DPI for rendering (default: 200)
            format: Image format - 'png' or 'jpeg' (default: 'png')
            max_width: Maximum width in pixels (maintains aspect ratio)
            max_height: Maximum height in pixels (maintains aspect ratio)

        Yields:
            Dictionary for each page with:
            - page_number: Page number (1-indexed)
            - image_data: Image bytes
            - content_type: MIME type
            - width: Image width in pixels
            - height: Image height in pixels
            - size_bytes: Image size in bytes
            - format: Image format
        """
        request = pdf_service_pb2.ExtractPagesToImagesRequest(
            pdf_data=pdf_data,
            dpi=dpi,
            format=format,
            max_width=max_width or 0,
            max_height=max_height or 0,
        )

        # Stream images
        for response in self.stub.ExtractPagesToImages(request):
            yield {
                "page_number": response.page_number,
                "image_data": response.image_data,
                "content_type": response.content_type,
                "width": response.width,
                "height": response.height,
                "size_bytes": response.size_bytes,
                "format": response.format,
            }
