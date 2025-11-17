"""
OpenAI Vision API Provider

Best for:
- General text extraction
- Image understanding (beyond just OCR)
- When you're already using OpenAI

Pricing (as of 2024):
- gpt-4o: $2.50/1M input tokens, $10/1M output tokens
- gpt-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
- More expensive than Google Vision for pure OCR
"""

import time
import logging
from typing import Optional
import base64
from .base import OCRProvider, OCRResult

logger = logging.getLogger(__name__)

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("openai not installed. Install with: pip install openai")


class OpenAIVisionProvider(OCRProvider):
    """OpenAI Vision API OCR Provider"""

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        **config
    ):
        """
        Initialize OpenAI Vision client.

        Args:
            api_key: OpenAI API key
            model: Model to use (gpt-4o or gpt-4o-mini)
            **config: Additional configuration
        """
        if not OPENAI_AVAILABLE:
            raise ImportError("openai not installed. Install with: pip install openai")

        self.api_key = api_key
        self.model = model
        self.config = config
        self.client = OpenAI(api_key=api_key)

        logger.info(f"OpenAI Vision API initialized with model: {model}")

    async def extract_text(
        self,
        image_data: bytes,
        content_type: str = "image/png",
        prompt: Optional[str] = None,
        **options
    ) -> OCRResult:
        """
        Extract text using OpenAI Vision API.

        Args:
            image_data: Raw image bytes
            content_type: MIME type
            prompt: Custom prompt (default: extract all text)
            **options: Additional options (max_tokens, etc.)

        Returns:
            OCRResult with extracted text
        """
        start = time.time()

        try:
            # Encode image to base64
            base64_image = base64.b64encode(image_data).decode("utf-8")
            data_url = f"data:{content_type};base64,{base64_image}"

            # Default OCR prompt
            if not prompt:
                prompt = (
                    "Extract all text from this image verbatim. "
                    "Preserve formatting, line breaks, and structure. "
                    "If there is no text, respond with '[No text found]'."
                )

            # Call OpenAI Vision API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": data_url,
                                    "detail": options.get("detail", "high")
                                }
                            }
                        ]
                    }
                ],
                max_tokens=options.get("max_tokens", 4096)
            )

            text = response.choices[0].message.content or ""
            processing_time = int((time.time() - start) * 1000)

            # Calculate cost
            tokens_used = response.usage.total_tokens if response.usage else 0
            cost = self._calculate_cost(tokens_used)

            logger.info(
                f"OpenAI Vision OCR: {len(text)} chars, {tokens_used} tokens, "
                f"${cost:.4f}, {processing_time}ms"
            )

            return OCRResult(
                text=text,
                confidence=0.95,  # OpenAI doesn't provide confidence
                provider="openai-vision",
                model=self.model,
                processing_time_ms=processing_time,
                tokens_used=tokens_used,
                cost=cost,
                metadata={
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                }
            )

        except Exception as e:
            logger.error(f"OpenAI Vision OCR failed: {e}")
            raise

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

    def is_available(self) -> bool:
        """Check if OpenAI Vision is configured"""
        return OPENAI_AVAILABLE and self.client is not None and bool(self.api_key)

    @property
    def name(self) -> str:
        return "openai-vision"

    @property
    def supports_languages(self) -> list[str]:
        """OpenAI Vision supports many languages"""
        return [
            "en", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko",
            "ar", "hi", "th", "vi", "id", "nl", "pl", "tr", "sv"
        ]

    @property
    def supports_batch(self) -> bool:
        """OpenAI doesn't have native batch support for Vision"""
        return False

    @property
    def is_free(self) -> bool:
        return False
