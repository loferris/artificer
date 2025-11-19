"""
Tesseract OCR Provider

Best for:
- Offline/local processing
- No API costs
- Privacy-sensitive documents
- High-volume processing on a budget

Limitations:
- Lower accuracy than cloud APIs
- Requires preprocessing for best results
- Limited handwriting support

FREE and OPEN SOURCE!
"""

import time
import logging
from typing import Optional
from .base import OCRProvider, OCRResult

logger = logging.getLogger(__name__)

try:
    import pytesseract
    from PIL import Image
    import io
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning(
        "pytesseract or Pillow not installed. "
        "Install with: pip install pytesseract pillow"
    )


class TesseractProvider(OCRProvider):
    """Tesseract OCR Provider (free, local)"""

    def __init__(
        self,
        tesseract_cmd: Optional[str] = None,
        language: str = "eng",
        **config
    ):
        """
        Initialize Tesseract.

        Args:
            tesseract_cmd: Path to tesseract executable (auto-detected if None)
            language: Language code (eng, spa, fra, etc.)
            **config: Additional Tesseract config
        """
        if not TESSERACT_AVAILABLE:
            raise ImportError(
                "pytesseract or Pillow not installed. "
                "Install with: pip install pytesseract pillow\n"
                "Also install tesseract: apt-get install tesseract-ocr"
            )

        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

        self.language = language
        self.config = config

        # Verify tesseract is installed
        try:
            version = pytesseract.get_tesseract_version()
            logger.info(f"Tesseract {version} initialized")
        except Exception as e:
            logger.error(f"Tesseract not found: {e}")
            raise

    async def extract_text(
        self,
        image_data: bytes,
        content_type: str = "image/png",
        language: Optional[str] = None,
        **options
    ) -> OCRResult:
        """
        Extract text using Tesseract.

        Args:
            image_data: Raw image bytes
            content_type: MIME type
            language: Language code (overrides default)
            **options: Tesseract config options

        Returns:
            OCRResult with extracted text
        """
        start = time.time()

        try:
            # Open image
            image = Image.open(io.BytesIO(image_data))

            # Use specified language or default
            lang = language or self.language

            # Extract text
            text = pytesseract.image_to_string(image, lang=lang, config=options.get("config", ""))

            # Get confidence data
            try:
                data = pytesseract.image_to_data(
                    image,
                    lang=lang,
                    output_type=pytesseract.Output.DICT
                )
                confidences = [int(conf) for conf in data["conf"] if conf != "-1"]
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            except:
                avg_confidence = 0

            processing_time = int((time.time() - start) * 1000)

            logger.info(
                f"Tesseract OCR: {len(text)} chars, {avg_confidence:.0f}% confidence, "
                f"{processing_time}ms [FREE]"
            )

            return OCRResult(
                text=text,
                confidence=avg_confidence / 100,  # Convert to 0-1 scale
                provider="tesseract",
                model=f"tesseract-{lang}",
                processing_time_ms=processing_time,
                tokens_used=0,
                cost=0.0,  # FREE!
                metadata={
                    "language": lang,
                    "version": str(pytesseract.get_tesseract_version())
                }
            )

        except Exception as e:
            logger.error(f"Tesseract OCR failed: {e}")
            raise

    def is_available(self) -> bool:
        """Check if Tesseract is available"""
        if not TESSERACT_AVAILABLE:
            return False

        try:
            pytesseract.get_tesseract_version()
            return True
        except:
            return False

    @property
    def name(self) -> str:
        return "tesseract"

    @property
    def supports_languages(self) -> list[str]:
        """Tesseract supports 100+ languages (with language packs)"""
        # Common languages (install with: apt-get install tesseract-ocr-<lang>)
        return [
            "eng", "spa", "fra", "deu", "ita", "por", "rus", "chi_sim", "chi_tra",
            "jpn", "kor", "ara", "hin", "tha", "vie", "nld", "pol", "tur", "swe"
        ]

    @property
    def supports_batch(self) -> bool:
        """Tesseract can process multiple images"""
        return True

    @property
    def is_free(self) -> bool:
        """Tesseract is completely free!"""
        return True

    def get_available_languages(self) -> list[str]:
        """Get list of installed Tesseract languages"""
        try:
            langs = pytesseract.get_languages()
            return [lang for lang in langs if lang != "osd"]  # Exclude orientation detection
        except:
            return []
