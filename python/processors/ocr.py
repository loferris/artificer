"""
OCR processing with OpenAI Vision API and Tesseract fallback
"""

import base64
import logging
from typing import Dict, Any, Optional
import time

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    import pytesseract
    from PIL import Image
    import io
except ImportError:
    pytesseract = None
    Image = None

logger = logging.getLogger(__name__)


class OCRProcessor:
    """OCR processing with multiple backends"""

    def __init__(
        self,
        openai_api_key: Optional[str] = None,
        model: str = "gpt-4o-mini",
        use_tesseract_fallback: bool = True,
    ):
        self.model = model
        self.use_tesseract_fallback = use_tesseract_fallback

        # Initialize OpenAI client if available
        if openai_api_key and OpenAI:
            self.openai_client = OpenAI(api_key=openai_api_key)
        else:
            self.openai_client = None

        # Check Tesseract availability
        self.tesseract_available = pytesseract is not None and Image is not None

        if not self.openai_client and not self.tesseract_available:
            logger.warning("No OCR backend available (neither OpenAI nor Tesseract)")

    def extract_text(self, image_data: bytes, content_type: str = "image/png") -> Dict[str, Any]:
        """
        Extract text from image using available OCR backend.

        Args:
            image_data: Raw image bytes
            content_type: MIME type of image

        Returns:
            Dictionary with extracted text and metadata
        """
        start = time.time()

        # Try OpenAI Vision first (best quality)
        if self.openai_client:
            try:
                return self._extract_with_openai(image_data, content_type, start)
            except Exception as e:
                logger.warning(f"OpenAI Vision failed: {e}, trying Tesseract fallback")

        # Fall back to Tesseract (free, local)
        if self.use_tesseract_fallback and self.tesseract_available:
            try:
                return self._extract_with_tesseract(image_data, start)
            except Exception as e:
                logger.error(f"Tesseract OCR failed: {e}")
                raise ValueError(f"All OCR methods failed")

        raise ValueError("No OCR backend available")

    def _extract_with_openai(
        self, image_data: bytes, content_type: str, start_time: float
    ) -> Dict[str, Any]:
        """Extract text using OpenAI Vision API"""
        # Encode image to base64
        base64_image = base64.b64encode(image_data).decode("utf-8")
        data_url = f"data:{content_type};base64,{base64_image}"

        # Call OpenAI Vision API
        response = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all text from this image verbatim. Preserve formatting, line breaks, and structure. If there is no text, respond with '[No text found]'.",
                        },
                        {"type": "image_url", "image_url": {"url": data_url, "detail": "high"}},
                    ],
                }
            ],
            max_tokens=4096,
        )

        text = response.choices[0].message.content or ""
        processing_time = int((time.time() - start_time) * 1000)

        # Calculate cost
        tokens_used = response.usage.total_tokens if response.usage else 0
        cost = self._calculate_cost(tokens_used)

        logger.info(
            f"OpenAI Vision OCR: {len(text)} chars, {tokens_used} tokens, ${cost:.4f}, {processing_time}ms"
        )

        return {
            "text": text,
            "confidence": 0.95,  # OpenAI doesn't provide confidence scores
            "provider": "openai-vision",
            "model": self.model,
            "processing_time_ms": processing_time,
            "tokens_used": tokens_used,
            "cost": cost,
        }

    def _extract_with_tesseract(self, image_data: bytes, start_time: float) -> Dict[str, Any]:
        """Extract text using Tesseract OCR (free, local)"""
        # Open image
        image = Image.open(io.BytesIO(image_data))

        # Run Tesseract
        text = pytesseract.image_to_string(image)

        # Get confidence (if available)
        try:
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            confidences = [int(conf) for conf in data["conf"] if conf != "-1"]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        except:
            avg_confidence = 0

        processing_time = int((time.time() - start_time) * 1000)

        logger.info(
            f"Tesseract OCR: {len(text)} chars, {avg_confidence:.0f}% confidence, {processing_time}ms"
        )

        return {
            "text": text,
            "confidence": avg_confidence / 100,  # Convert to 0-1 scale
            "provider": "tesseract",
            "model": "tesseract",
            "processing_time_ms": processing_time,
            "tokens_used": 0,
            "cost": 0.0,  # Tesseract is free!
        }

    def _calculate_cost(self, total_tokens: int) -> float:
        """Calculate OpenAI Vision API cost"""
        tokens_in_millions = total_tokens / 1_000_000

        if self.model == "gpt-4o":
            # OCR workload: 90% input (image), 10% output (text)
            return tokens_in_millions * (0.9 * 2.5 + 0.1 * 10)
        elif self.model == "gpt-4o-mini":
            # OCR workload: 90% input (image), 10% output (text)
            return tokens_in_millions * (0.9 * 0.15 + 0.1 * 0.6)

        return 0.0
