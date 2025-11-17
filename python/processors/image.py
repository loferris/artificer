"""
Image processing with PyMuPDF (fitz) and Pillow

Provides fast PDF-to-image conversion and image manipulation.
Performance: 2-10x faster than Node.js pdf2pic + GraphicsMagick
"""

import fitz  # PyMuPDF
from PIL import Image
import io
from typing import Dict, Any, List, Optional, Tuple
import time
import logging

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Fast image processing using PyMuPDF and Pillow"""

    def __init__(
        self,
        default_dpi: int = 200,
        default_format: str = "png",
        max_width: int = 2000,
        max_height: int = 2000,
    ):
        """
        Initialize image processor with default settings.

        Args:
            default_dpi: Default DPI for PDF rendering (higher = better quality)
            default_format: Default output format (png, jpeg, webp)
            max_width: Maximum width in pixels
            max_height: Maximum height in pixels
        """
        self.default_dpi = default_dpi
        self.default_format = default_format
        self.max_width = max_width
        self.max_height = max_height

    def extract_pdf_pages_to_images(
        self,
        pdf_data: bytes,
        dpi: Optional[int] = None,
        format: Optional[str] = None,
        max_width: Optional[int] = None,
        max_height: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Convert PDF pages to images.

        Args:
            pdf_data: Raw PDF bytes
            dpi: DPI for rendering (default: 200)
            format: Output format - png, jpeg, webp (default: png)
            max_width: Maximum width in pixels (default: 2000)
            max_height: Maximum height in pixels (default: 2000)

        Returns:
            List of dictionaries with image data:
            [
                {
                    "page_number": 1,
                    "image_data": bytes,  # Raw image bytes
                    "content_type": "image/png",
                    "width": 1200,
                    "height": 1600,
                    "size_bytes": 45000,
                    "format": "png"
                },
                ...
            ]
        """
        start = time.time()

        # Use defaults if not specified
        dpi = dpi or self.default_dpi
        format = format or self.default_format
        max_width = max_width or self.max_width
        max_height = max_height or self.max_height

        try:
            # Open PDF from bytes
            doc = fitz.open(stream=pdf_data, filetype="pdf")
            page_count = len(doc)

            logger.info(
                f"Starting PDF to image conversion: {page_count} pages at {dpi} DPI"
            )

            images = []

            # Convert each page
            for page_num in range(page_count):
                try:
                    page = doc[page_num]

                    # Calculate zoom factor from DPI
                    # PyMuPDF default is 72 DPI, so zoom = desired_dpi / 72
                    zoom = dpi / 72.0
                    mat = fitz.Matrix(zoom, zoom)

                    # Render page to pixmap (image)
                    pix = page.get_pixmap(matrix=mat, alpha=False)

                    # Get original dimensions
                    orig_width = pix.width
                    orig_height = pix.height

                    # Convert pixmap to PIL Image for resizing if needed
                    img_data = pix.tobytes(format.lower())

                    # Resize if exceeds max dimensions
                    if orig_width > max_width or orig_height > max_height:
                        # Convert to PIL Image
                        img = Image.open(io.BytesIO(img_data))

                        # Calculate new dimensions maintaining aspect ratio
                        ratio = min(max_width / orig_width, max_height / orig_height)
                        new_width = int(orig_width * ratio)
                        new_height = int(orig_height * ratio)

                        # Resize using high-quality Lanczos resampling
                        img = img.resize((new_width, new_height), Image.LANCZOS)

                        # Convert back to bytes
                        buffer = io.BytesIO()
                        img.save(buffer, format=format.upper())
                        img_data = buffer.getvalue()

                        final_width = new_width
                        final_height = new_height
                    else:
                        final_width = orig_width
                        final_height = orig_height

                    # Determine content type
                    content_type = self._get_content_type(format)

                    images.append(
                        {
                            "page_number": page_num + 1,
                            "image_data": img_data,
                            "content_type": content_type,
                            "width": final_width,
                            "height": final_height,
                            "size_bytes": len(img_data),
                            "format": format,
                        }
                    )

                    logger.debug(
                        f"Page {page_num + 1} converted: {final_width}x{final_height}, "
                        f"{len(img_data) / 1024:.1f}KB"
                    )

                except Exception as e:
                    logger.error(f"Failed to convert page {page_num + 1}: {e}")
                    # Add error placeholder
                    images.append(
                        {
                            "page_number": page_num + 1,
                            "image_data": b"[Failed to extract page image]",
                            "content_type": "text/plain",
                            "width": 0,
                            "height": 0,
                            "size_bytes": 0,
                            "format": "error",
                            "error": str(e),
                        }
                    )

            doc.close()

            processing_time = int((time.time() - start) * 1000)

            logger.info(
                f"PDF to image conversion completed: {page_count} pages in {processing_time}ms"
            )

            return images

        except Exception as e:
            logger.error(f"PDF to image conversion failed: {e}")
            raise ValueError(f"Failed to convert PDF to images: {str(e)}")

    def convert_image(
        self,
        image_data: bytes,
        output_format: str = "png",
        max_width: Optional[int] = None,
        max_height: Optional[int] = None,
        quality: int = 95,
    ) -> Dict[str, Any]:
        """
        Convert/resize an image.

        Args:
            image_data: Raw image bytes
            output_format: Output format (png, jpeg, webp)
            max_width: Maximum width (None = no limit)
            max_height: Maximum height (None = no limit)
            quality: JPEG/WebP quality (1-100)

        Returns:
            Dictionary with converted image data
        """
        start = time.time()

        try:
            # Open image
            img = Image.open(io.BytesIO(image_data))

            orig_width, orig_height = img.size
            final_width, final_height = orig_width, orig_height

            # Resize if needed
            if max_width or max_height:
                if max_width and orig_width > max_width:
                    ratio = max_width / orig_width
                    final_width = max_width
                    final_height = int(orig_height * ratio)

                if max_height and final_height > max_height:
                    ratio = max_height / final_height
                    final_height = max_height
                    final_width = int(final_width * ratio)

                if (final_width, final_height) != (orig_width, orig_height):
                    img = img.resize((final_width, final_height), Image.LANCZOS)
                    logger.debug(
                        f"Resized image: {orig_width}x{orig_height} -> {final_width}x{final_height}"
                    )

            # Convert to output format
            buffer = io.BytesIO()

            # Handle format-specific options
            save_kwargs = {"format": output_format.upper()}
            if output_format.lower() in ["jpeg", "jpg"]:
                save_kwargs["quality"] = quality
                save_kwargs["optimize"] = True
            elif output_format.lower() == "webp":
                save_kwargs["quality"] = quality
            elif output_format.lower() == "png":
                save_kwargs["optimize"] = True

            img.save(buffer, **save_kwargs)
            converted_data = buffer.getvalue()

            processing_time = int((time.time() - start) * 1000)

            return {
                "image_data": converted_data,
                "content_type": self._get_content_type(output_format),
                "width": final_width,
                "height": final_height,
                "size_bytes": len(converted_data),
                "format": output_format,
                "processing_time_ms": processing_time,
            }

        except Exception as e:
            logger.error(f"Image conversion failed: {e}")
            raise ValueError(f"Failed to convert image: {str(e)}")

    def get_image_info(self, image_data: bytes) -> Dict[str, Any]:
        """
        Get information about an image.

        Args:
            image_data: Raw image bytes

        Returns:
            Dictionary with image metadata
        """
        try:
            img = Image.open(io.BytesIO(image_data))

            return {
                "width": img.width,
                "height": img.height,
                "format": img.format,
                "mode": img.mode,
                "size_bytes": len(image_data),
            }

        except Exception as e:
            logger.error(f"Failed to get image info: {e}")
            raise ValueError(f"Failed to get image info: {str(e)}")

    def _get_content_type(self, format: str) -> str:
        """Get MIME type for image format"""
        format_map = {
            "png": "image/png",
            "jpeg": "image/jpeg",
            "jpg": "image/jpeg",
            "webp": "image/webp",
            "gif": "image/gif",
            "bmp": "image/bmp",
        }
        return format_map.get(format.lower(), "application/octet-stream")
