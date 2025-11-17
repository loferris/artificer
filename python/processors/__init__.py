"""
Document processing modules using native Python libraries.

Significantly faster than Node.js alternatives:
- PyMuPDF: 10-100x faster than pdf-parse
- Pillow/OpenCV: 2-3x faster than Sharp
"""

from .pdf import PdfProcessor
from .ocr import OCRProcessor

__all__ = ["PdfProcessor", "OCRProcessor"]
