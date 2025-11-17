"""
Base OCR Provider Interface

All OCR providers must implement this interface.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class OCRResult:
    """Standardized OCR result across all providers"""
    text: str
    confidence: float  # 0-1 scale
    provider: str
    model: Optional[str] = None
    processing_time_ms: int = 0
    tokens_used: int = 0
    cost: float = 0.0
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class OCRProvider(ABC):
    """Abstract base class for all OCR providers"""

    @abstractmethod
    def __init__(self, **config):
        """Initialize provider with configuration"""
        pass

    @abstractmethod
    async def extract_text(
        self,
        image_data: bytes,
        content_type: str = "image/png",
        **options
    ) -> OCRResult:
        """
        Extract text from image.

        Args:
            image_data: Raw image bytes
            content_type: MIME type of image
            **options: Provider-specific options

        Returns:
            OCRResult with extracted text and metadata
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is properly configured and available"""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name"""
        pass

    @property
    def supports_languages(self) -> list[str]:
        """List of supported language codes (ISO 639-1)"""
        return ["en"]  # Default to English

    @property
    def supports_batch(self) -> bool:
        """Whether provider supports batch processing"""
        return False

    @property
    def is_free(self) -> bool:
        """Whether provider is free (no API costs)"""
        return False
