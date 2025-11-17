"""
OCR Provider Abstraction Layer

Supports multiple OCR backends:
- Google Vision API
- OpenAI Vision API
- Tesseract (local, free)
- Azure Computer Vision (future)
- AWS Textract (future)
"""

from .base import OCRProvider, OCRResult
from .google_vision import GoogleVisionProvider
from .openai_vision import OpenAIVisionProvider
from .tesseract import TesseractProvider

__all__ = [
    "OCRProvider",
    "OCRResult",
    "GoogleVisionProvider",
    "OpenAIVisionProvider",
    "TesseractProvider",
]
