"""
ImageClient for image processing and OCR operations.
"""

import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "generated"))

import grpc
from generated.artificer import image_service_pb2
from generated.artificer import image_service_pb2_grpc


class ImageClient:
    """Client for image processing operations."""

    def __init__(self, channel: grpc.Channel):
        """
        Initialize image client.

        Args:
            channel: gRPC channel to use for requests
        """
        self.stub = image_service_pb2_grpc.ImageServiceStub(channel)

    def extract_text_from_image(
        self, image_data: bytes, content_type: str = "image/png"
    ) -> Dict[str, Any]:
        """
        Extract text from image using OCR.

        Uses OpenAI's GPT-4 Vision API for high-quality OCR with fallback
        to Tesseract if API is unavailable.

        Args:
            image_data: Image file data as bytes
            content_type: MIME type (e.g., 'image/png', 'image/jpeg')

        Returns:
            Dictionary with:
            - text: Extracted text content
            - confidence: OCR confidence score (0.0-1.0)
            - metadata: OCR metadata containing:
                - processing_time_ms: Processing time
                - provider: OCR provider used ('openai' or 'tesseract')
                - model: Model used (e.g., 'gpt-4o-mini')
                - tokens_used: Tokens consumed (if OpenAI)
                - cost: Cost in dollars (if OpenAI)
        """
        request = image_service_pb2.ExtractTextFromImageRequest(
            image_data=image_data, content_type=content_type
        )

        response = self.stub.ExtractTextFromImage(request)

        return {
            "text": response.text,
            "confidence": response.confidence,
            "metadata": {
                "processing_time_ms": response.metadata.processing_time_ms,
                "provider": response.metadata.provider,
                "model": response.metadata.model,
                "tokens_used": response.metadata.tokens_used,
                "cost": response.metadata.cost,
            },
        }

    def convert_image(
        self,
        image_data: bytes,
        output_format: str = "png",
        max_width: Optional[int] = None,
        max_height: Optional[int] = None,
        quality: int = 95,
    ) -> Dict[str, Any]:
        """
        Convert and/or resize image.

        Args:
            image_data: Image file data as bytes
            output_format: Output format - 'png', 'jpeg', 'webp' (default: 'png')
            max_width: Maximum width in pixels (maintains aspect ratio)
            max_height: Maximum height in pixels (maintains aspect ratio)
            quality: JPEG/WebP quality 1-100 (default: 95)

        Returns:
            Dictionary with:
            - image_data: Converted image bytes
            - content_type: MIME type of output
            - width: Image width in pixels
            - height: Image height in pixels
            - size_bytes: Image size in bytes
            - format: Image format
            - processing_time_ms: Processing time
        """
        request = image_service_pb2.ConvertImageRequest(
            image_data=image_data,
            output_format=output_format,
            max_width=max_width or 0,
            max_height=max_height or 0,
            quality=quality,
        )

        response = self.stub.ConvertImage(request)

        return {
            "image_data": response.image_data,
            "content_type": response.content_type,
            "width": response.width,
            "height": response.height,
            "size_bytes": response.size_bytes,
            "format": response.format,
            "processing_time_ms": response.processing_time_ms,
        }
