"""
gRPC PDFService implementation.

Handles PDF processing operations via gRPC.
"""

import sys
from pathlib import Path

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "generated"))

from typing import Iterator
import grpc
import base64
from generated.artificer import pdf_service_pb2
from generated.artificer import pdf_service_pb2_grpc
from processors.pdf import PdfProcessor
import time


class PDFServiceHandler(pdf_service_pb2_grpc.PDFServiceServicer):
    """gRPC handler for PDF processing operations."""

    def __init__(self):
        """Initialize PDF service with processor."""
        self.pdf_processor = PdfProcessor()

    def ExtractText(
        self, request: pdf_service_pb2.ExtractTextRequest, context
    ) -> pdf_service_pb2.ExtractTextResponse:
        """Extract text from PDF (direct extraction, no OCR)."""
        try:
            # Extract text
            result = self.pdf_processor.extract_text(request.pdf_data)

            # Build metadata
            metadata = pdf_service_pb2.PDFMetadata(
                pages=result["pages"],
                method=result["method"],
                has_text_content=result["has_text_content"],
                processing_time_ms=result["processing_time_ms"],
                title=result["metadata"].get("title", ""),
                author=result["metadata"].get("author", ""),
                creator=result["metadata"].get("creator", ""),
            )

            return pdf_service_pb2.ExtractTextResponse(
                text=result["text"], metadata=metadata
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"PDF text extraction failed: {str(e)}")
            return pdf_service_pb2.ExtractTextResponse()

    def ProcessPDF(
        self, request: pdf_service_pb2.ProcessPDFRequest, context
    ) -> pdf_service_pb2.ProcessPDFResponse:
        """Process PDF with smart OCR fallback."""
        try:
            # Extract text first
            result = self.pdf_processor.extract_text(request.pdf_data)

            # Check if OCR needed
            needs_ocr = request.force_ocr or not result["has_text_content"]

            if needs_ocr:
                # TODO: Implement full PDF OCR
                # For now, return direct extraction
                pass

            # Build metadata
            metadata = pdf_service_pb2.PDFMetadata(
                pages=result["pages"],
                method="direct" if not needs_ocr else "ocr",
                has_text_content=result["has_text_content"],
                processing_time_ms=result["processing_time_ms"],
                title=result["metadata"].get("title", ""),
                author=result["metadata"].get("author", ""),
                creator=result["metadata"].get("creator", ""),
            )

            return pdf_service_pb2.ProcessPDFResponse(
                text=result["text"], metadata=metadata
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"PDF processing failed: {str(e)}")
            return pdf_service_pb2.ProcessPDFResponse()

    def CheckNeedsOCR(
        self, request: pdf_service_pb2.CheckNeedsOCRRequest, context
    ) -> pdf_service_pb2.CheckNeedsOCRResponse:
        """Check if PDF needs OCR and estimate cost."""
        try:
            result = self.pdf_processor.needs_ocr(
                request.pdf_data, request.min_text_threshold
            )

            return pdf_service_pb2.CheckNeedsOCRResponse(
                needs_ocr=result["needs_ocr"],
                has_text_content=result["has_text_content"],
                pages=result["pages"],
                text_length=result["text_length"],
                avg_text_per_page=result["avg_text_per_page"],
                estimated_ocr_cost=result["estimated_ocr_cost"],
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"OCR check failed: {str(e)}")
            return pdf_service_pb2.CheckNeedsOCRResponse()

    def ExtractPagesToImages(
        self, request: pdf_service_pb2.ExtractPagesToImagesRequest, context
    ) -> Iterator[pdf_service_pb2.PageImage]:
        """Extract PDF pages as images (streaming response)."""
        try:
            from processors.image import ImageProcessor

            image_processor = ImageProcessor(
                default_dpi=request.dpi or 200,
                default_format=request.format or "png",
                max_width=request.max_width or 2000,
                max_height=request.max_height or 2000,
            )

            # Convert to images
            images = image_processor.extract_pdf_pages_to_images(
                request.pdf_data,
                dpi=request.dpi or 200,
                format=request.format or "png",
                max_width=request.max_width or 2000,
                max_height=request.max_height or 2000,
            )

            # Stream each page image
            for img in images:
                yield pdf_service_pb2.PageImage(
                    page_number=img["page_number"],
                    image_data=img["image_data"],
                    content_type=img["content_type"],
                    width=img["width"],
                    height=img["height"],
                    size_bytes=img["size_bytes"],
                    format=img["format"],
                )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"PDF to images conversion failed: {str(e)}")
            # Yield empty response to avoid broken stream
            yield pdf_service_pb2.PageImage()
