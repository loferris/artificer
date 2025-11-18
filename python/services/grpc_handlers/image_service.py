"""
gRPC ImageService implementation.

Handles image processing and OCR operations via gRPC.
"""

import sys
from pathlib import Path

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "generated"))

import grpc
from generated.artificer import image_service_pb2
from generated.artificer import image_service_pb2_grpc
from processors.ocr import OCRProcessor
from processors.image import ImageProcessor
import os


class ImageServiceHandler(image_service_pb2_grpc.ImageServiceServicer):
    """gRPC handler for image processing operations."""

    def __init__(self):
        """Initialize image service with processors."""
        self.ocr_processor = OCRProcessor(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            model=os.getenv("OCR_MODEL", "gpt-4o-mini"),
            use_tesseract_fallback=True,
        )
        self.image_processor = ImageProcessor(
            default_dpi=200, default_format="png", max_width=2000, max_height=2000
        )

    def ExtractTextFromImage(
        self, request: image_service_pb2.ExtractTextFromImageRequest, context
    ) -> image_service_pb2.ExtractTextFromImageResponse:
        """Extract text from image using OCR."""
        try:
            # Extract text
            result = self.ocr_processor.extract_text(
                request.image_data, request.content_type
            )

            # Build OCR metadata
            metadata = image_service_pb2.OCRMetadata(
                processing_time_ms=result["processing_time_ms"],
                provider=result["provider"],
                model=result["model"],
                tokens_used=result["tokens_used"],
                cost=result["cost"],
            )

            return image_service_pb2.ExtractTextFromImageResponse(
                text=result["text"], confidence=result["confidence"], metadata=metadata
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Image OCR failed: {str(e)}")
            return image_service_pb2.ExtractTextFromImageResponse()

    def ConvertImage(
        self, request: image_service_pb2.ConvertImageRequest, context
    ) -> image_service_pb2.ConvertImageResponse:
        """Convert/resize image."""
        try:
            # Convert image
            result = self.image_processor.convert_image(
                request.image_data,
                output_format=request.output_format or "png",
                max_width=request.max_width if request.max_width > 0 else None,
                max_height=request.max_height if request.max_height > 0 else None,
                quality=request.quality if request.quality > 0 else 95,
            )

            return image_service_pb2.ConvertImageResponse(
                image_data=result["image_data"],
                content_type=result["content_type"],
                width=result["width"],
                height=result["height"],
                size_bytes=result["size_bytes"],
                format=result["format"],
                processing_time_ms=result["processing_time_ms"],
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Image conversion failed: {str(e)}")
            return image_service_pb2.ConvertImageResponse()
