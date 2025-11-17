"""
Google Cloud Vision API Provider

Best for:
- High accuracy text detection
- Multi-language support (100+ languages)
- Handwriting recognition
- Table detection
- Better than OpenAI for complex documents

Pricing (as of 2024):
- First 1,000 requests/month: FREE
- $1.50 per 1,000 requests after
- Much cheaper than OpenAI Vision!
"""

import time
import logging
from typing import Optional
from .base import OCRProvider, OCRResult

logger = logging.getLogger(__name__)

try:
    from google.cloud import vision
    from google.oauth2 import service_account
    GOOGLE_VISION_AVAILABLE = True
except ImportError:
    GOOGLE_VISION_AVAILABLE = False
    logger.warning("google-cloud-vision not installed. Install with: pip install google-cloud-vision")


class GoogleVisionProvider(OCRProvider):
    """Google Cloud Vision API OCR Provider"""

    def __init__(
        self,
        credentials_path: Optional[str] = None,
        credentials_json: Optional[dict] = None,
        **config
    ):
        """
        Initialize Google Vision client.

        Args:
            credentials_path: Path to service account JSON file
            credentials_json: Service account credentials as dict
            **config: Additional configuration
        """
        if not GOOGLE_VISION_AVAILABLE:
            raise ImportError(
                "google-cloud-vision not installed. "
                "Install with: pip install google-cloud-vision"
            )

        self.config = config

        # Initialize client
        if credentials_path:
            credentials = service_account.Credentials.from_service_account_file(
                credentials_path
            )
            self.client = vision.ImageAnnotatorClient(credentials=credentials)
        elif credentials_json:
            credentials = service_account.Credentials.from_service_account_info(
                credentials_json
            )
            self.client = vision.ImageAnnotatorClient(credentials=credentials)
        else:
            # Use default credentials (from GOOGLE_APPLICATION_CREDENTIALS env var)
            self.client = vision.ImageAnnotatorClient()

        logger.info("Google Vision API initialized")

    async def extract_text(
        self,
        image_data: bytes,
        content_type: str = "image/png",
        language_hints: Optional[list[str]] = None,
        **options
    ) -> OCRResult:
        """
        Extract text using Google Vision API.

        Args:
            image_data: Raw image bytes
            content_type: MIME type
            language_hints: List of language codes (e.g., ['en', 'es'])
            **options: Additional options

        Returns:
            OCRResult with extracted text
        """
        start = time.time()

        try:
            # Prepare image
            image = vision.Image(content=image_data)

            # Prepare context with language hints
            image_context = None
            if language_hints:
                image_context = vision.ImageContext(language_hints=language_hints)

            # Detect text
            response = self.client.text_detection(
                image=image,
                image_context=image_context
            )

            # Check for errors
            if response.error.message:
                raise Exception(f"Google Vision API error: {response.error.message}")

            # Extract full text
            texts = response.text_annotations
            if not texts:
                text = ""
                confidence = 0.0
            else:
                # First annotation contains full text
                text = texts[0].description
                # Average confidence of all words (if available)
                if hasattr(texts[0], 'confidence'):
                    confidence = texts[0].confidence
                else:
                    # Google Vision doesn't always provide confidence
                    # Use high value since it's generally accurate
                    confidence = 0.95

            processing_time = int((time.time() - start) * 1000)

            # Calculate cost (very cheap!)
            # First 1000 requests/month are free
            # After that: $1.50 per 1000 requests = $0.0015 per request
            cost = 0.0015

            logger.info(
                f"Google Vision OCR: {len(text)} chars, {confidence:.2f} confidence, "
                f"{processing_time}ms, ${cost:.6f}"
            )

            return OCRResult(
                text=text,
                confidence=confidence,
                provider="google-vision",
                model="text-detection",
                processing_time_ms=processing_time,
                tokens_used=0,  # Google Vision doesn't use token-based pricing
                cost=cost,
                metadata={
                    "full_response": len(texts),  # Number of text annotations
                    "language_hints": language_hints or [],
                }
            )

        except Exception as e:
            logger.error(f"Google Vision OCR failed: {e}")
            raise

    def is_available(self) -> bool:
        """Check if Google Vision is configured"""
        return GOOGLE_VISION_AVAILABLE and self.client is not None

    @property
    def name(self) -> str:
        return "google-vision"

    @property
    def supports_languages(self) -> list[str]:
        """Google Vision supports 100+ languages"""
        return [
            "en", "es", "fr", "de", "it", "pt", "ru", "zh", "ja", "ko",
            "ar", "hi", "th", "vi", "id", "nl", "pl", "tr", "sv", "da",
            # ... and many more
        ]

    @property
    def supports_batch(self) -> bool:
        """Google Vision supports batch requests"""
        return True

    @property
    def is_free(self) -> bool:
        """First 1000 requests/month are free"""
        return False  # Has free tier but not completely free

    async def detect_document_text(
        self,
        image_data: bytes,
        **options
    ) -> OCRResult:
        """
        Advanced document text detection.

        Better for dense text, tables, and structured documents.
        """
        start = time.time()

        try:
            image = vision.Image(content=image_data)

            # Use document_text_detection for better results on documents
            response = self.client.document_text_detection(image=image)

            if response.error.message:
                raise Exception(f"Google Vision API error: {response.error.message}")

            # Extract full text from document
            if response.full_text_annotation:
                text = response.full_text_annotation.text
                # Calculate average confidence
                pages = response.full_text_annotation.pages
                if pages and pages[0].confidence:
                    confidence = pages[0].confidence
                else:
                    confidence = 0.95
            else:
                text = ""
                confidence = 0.0

            processing_time = int((time.time() - start) * 1000)
            cost = 0.0015

            logger.info(
                f"Google Vision Document OCR: {len(text)} chars, "
                f"{confidence:.2f} confidence, {processing_time}ms"
            )

            return OCRResult(
                text=text,
                confidence=confidence,
                provider="google-vision",
                model="document-text-detection",
                processing_time_ms=processing_time,
                tokens_used=0,
                cost=cost,
                metadata={"mode": "document"}
            )

        except Exception as e:
            logger.error(f"Google Vision document OCR failed: {e}")
            raise
