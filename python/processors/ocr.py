"""
Modular OCR Processor with Multiple Provider Support

Supports:
- Google Vision API (recommended - cheap, accurate, 1000 free/month)
- OpenAI Vision API (good for general use)
- Tesseract (free, local, offline)

Automatically falls back through providers if one fails.
"""

import logging
from typing import Optional, List
import os
from .ocr_providers.base import OCRProvider, OCRResult
from .ocr_providers.google_vision import GoogleVisionProvider
from .ocr_providers.openai_vision import OpenAIVisionProvider
from .ocr_providers.tesseract import TesseractProvider

logger = logging.getLogger(__name__)


class OCRProcessor:
    """
    Multi-provider OCR processor with automatic fallback.

    Priority order (configurable):
    1. Google Vision (best accuracy, cheapest)
    2. OpenAI Vision (good, more expensive)
    3. Tesseract (free fallback)
    """

    def __init__(
        self,
        primary_provider: str = "google-vision",
        google_credentials_path: Optional[str] = None,
        google_credentials_json: Optional[dict] = None,
        openai_api_key: Optional[str] = None,
        openai_model: str = "gpt-4o-mini",
        tesseract_enabled: bool = True,
        auto_fallback: bool = True
    ):
        """
        Initialize OCR processor with multiple providers.

        Args:
            primary_provider: Primary provider to use ("google-vision", "openai-vision", "tesseract")
            google_credentials_path: Path to Google service account JSON
            google_credentials_json: Google credentials as dict
            openai_api_key: OpenAI API key
            openai_model: OpenAI model to use
            tesseract_enabled: Enable Tesseract fallback
            auto_fallback: Automatically try next provider if primary fails
        """
        self.primary_provider_name = primary_provider
        self.auto_fallback = auto_fallback
        self.providers: dict[str, OCRProvider] = {}

        # Initialize Google Vision
        try:
            # Try credentials from parameters first
            if google_credentials_path or google_credentials_json:
                self.providers["google-vision"] = GoogleVisionProvider(
                    credentials_path=google_credentials_path,
                    credentials_json=google_credentials_json
                )
            # Then try environment variable
            elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
                self.providers["google-vision"] = GoogleVisionProvider()

            if "google-vision" in self.providers:
                logger.info("Google Vision provider initialized")
        except Exception as e:
            logger.warning(f"Google Vision provider not available: {e}")

        # Initialize OpenAI Vision
        try:
            api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
            if api_key:
                self.providers["openai-vision"] = OpenAIVisionProvider(
                    api_key=api_key,
                    model=openai_model
                )
                logger.info(f"OpenAI Vision provider initialized ({openai_model})")
        except Exception as e:
            logger.warning(f"OpenAI Vision provider not available: {e}")

        # Initialize Tesseract
        if tesseract_enabled:
            try:
                self.providers["tesseract"] = TesseractProvider()
                logger.info("Tesseract provider initialized")
            except Exception as e:
                logger.warning(f"Tesseract provider not available: {e}")

        # Log available providers
        if not self.providers:
            logger.error("No OCR providers available!")
        else:
            logger.info(
                f"OCR providers initialized: {list(self.providers.keys())} "
                f"(primary: {primary_provider})"
            )

    def extract_text(
        self,
        image_data: bytes,
        content_type: str = "image/png",
        provider: Optional[str] = None,
        **options
    ) -> OCRResult:
        """
        Extract text from image using specified or primary provider.

        Args:
            image_data: Raw image bytes
            content_type: MIME type
            provider: Specific provider to use (None = use primary)
            **options: Provider-specific options

        Returns:
            OCRResult with extracted text
        """
        # Determine which provider to use
        provider_name = provider or self.primary_provider_name

        # Try primary provider
        if provider_name in self.providers:
            try:
                logger.info(f"Using {provider_name} for OCR")
                return self._extract_with_provider(
                    provider_name,
                    image_data,
                    content_type,
                    **options
                )
            except Exception as e:
                logger.error(f"{provider_name} failed: {e}")
                if not self.auto_fallback:
                    raise

        # Auto-fallback through available providers
        if self.auto_fallback:
            # Define fallback order
            fallback_order = [
                "google-vision",  # Try Google first (cheapest, most accurate)
                "openai-vision",  # Then OpenAI
                "tesseract"       # Finally free local OCR
            ]

            # Remove already-tried provider
            fallback_order = [p for p in fallback_order if p != provider_name]

            for fallback_provider in fallback_order:
                if fallback_provider in self.providers:
                    try:
                        logger.warning(
                            f"Falling back to {fallback_provider} for OCR"
                        )
                        return self._extract_with_provider(
                            fallback_provider,
                            image_data,
                            content_type,
                            **options
                        )
                    except Exception as e:
                        logger.error(f"{fallback_provider} failed: {e}")
                        continue

        raise RuntimeError("All OCR providers failed")

    def _extract_with_provider(
        self,
        provider_name: str,
        image_data: bytes,
        content_type: str,
        **options
    ) -> OCRResult:
        """Extract text using specific provider"""
        provider = self.providers[provider_name]

        # Call async method synchronously (for now)
        # TODO: Make the entire chain async
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        result = loop.run_until_complete(
            provider.extract_text(image_data, content_type, **options)
        )

        return result

    def get_available_providers(self) -> List[str]:
        """Get list of available provider names"""
        return list(self.providers.keys())

    def is_provider_available(self, provider: str) -> bool:
        """Check if specific provider is available"""
        return provider in self.providers and self.providers[provider].is_available()

    def get_provider_info(self, provider: str) -> dict:
        """Get information about a provider"""
        if provider not in self.providers:
            return {"available": False}

        p = self.providers[provider]
        return {
            "available": p.is_available(),
            "name": p.name,
            "is_free": p.is_free,
            "supports_batch": p.supports_batch,
            "supports_languages": p.supports_languages[:10],  # First 10 languages
        }

    def estimate_cost(
        self,
        num_images: int,
        provider: Optional[str] = None
    ) -> dict:
        """
        Estimate OCR cost for multiple images.

        Returns:
            Dictionary with cost breakdown by provider
        """
        provider_name = provider or self.primary_provider_name

        costs = {}

        # Google Vision: $1.50 per 1000 after free tier
        if provider_name == "google-vision" or not provider:
            free_images = max(0, 1000 - num_images)  # Assume monthly quota
            paid_images = max(0, num_images - 1000)
            costs["google-vision"] = (paid_images / 1000) * 1.50

        # OpenAI Vision: ~$0.0015 per image (token-based, varies)
        if provider_name == "openai-vision" or not provider:
            # Estimate: ~1000 tokens per image with gpt-4o-mini
            tokens_per_image = 1000
            cost_per_1m_tokens = 0.15  # gpt-4o-mini input
            costs["openai-vision"] = (num_images * tokens_per_image * cost_per_1m_tokens) / 1_000_000

        # Tesseract: Free!
        if provider_name == "tesseract" or not provider:
            costs["tesseract"] = 0.0

        return costs
