"""
PDF processing with PyMuPDF (fitz)

Performance comparison:
- pdf-parse (Node.js): ~100-200ms for 10-page PDF
- PyMuPDF (Python): ~5-20ms for 10-page PDF
- Speedup: 10-20x faster!
"""

import fitz  # PyMuPDF
from typing import Dict, Any, Optional
import time
import logging

logger = logging.getLogger(__name__)


class PdfProcessor:
    """Fast PDF text extraction using PyMuPDF"""

    def extract_text(self, pdf_data: bytes) -> Dict[str, Any]:
        """
        Extract text from PDF using PyMuPDF.

        Args:
            pdf_data: Raw PDF bytes

        Returns:
            Dictionary with text, pages, metadata, and timing info
        """
        start = time.time()

        try:
            # Open PDF from bytes
            doc = fitz.open(stream=pdf_data, filetype="pdf")

            # Extract text from all pages
            text = ""
            page_texts = []

            for page_num, page in enumerate(doc, start=1):
                page_text = page.get_text()
                text += page_text
                page_texts.append({
                    "page_number": page_num,
                    "text": page_text,
                    "length": len(page_text)
                })

            processing_time = int((time.time() - start) * 1000)

            # Determine if PDF has meaningful text content
            text_stripped = text.strip()
            has_text_content = len(text_stripped) > 100

            # Extract metadata and page count before closing
            metadata = self._extract_metadata(doc)
            page_count = len(page_texts)

            doc.close()

            logger.info(
                f"PDF processed: {page_count} pages, {len(text_stripped)} chars, {processing_time}ms"
            )

            return {
                "text": text,
                "pages": len(page_texts),
                "has_text_content": has_text_content,
                "processing_time_ms": processing_time,
                "method": "pymupdf",
                "page_texts": page_texts,
                "metadata": metadata,
            }

        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")

    def needs_ocr(
        self, pdf_data: bytes, min_text_threshold: int = 100
    ) -> Dict[str, Any]:
        """
        Determine if PDF needs OCR based on text content.

        Args:
            pdf_data: Raw PDF bytes
            min_text_threshold: Minimum chars per page to skip OCR

        Returns:
            Dictionary with OCR recommendation and cost estimate
        """
        try:
            result = self.extract_text(pdf_data)

            text_length = len(result["text"].strip())
            pages = result["pages"]
            avg_text_per_page = text_length / max(pages, 1)

            # Need OCR if very little text or below threshold
            needs_ocr = not result["has_text_content"] or avg_text_per_page < min_text_threshold

            estimated_cost = 0.0
            if needs_ocr:
                estimated_cost = self._estimate_ocr_cost(pages)

            return {
                "needs_ocr": needs_ocr,
                "has_text_content": result["has_text_content"],
                "pages": pages,
                "text_length": text_length,
                "avg_text_per_page": int(avg_text_per_page),
                "estimated_ocr_cost": estimated_cost,
            }

        except Exception as e:
            logger.error(f"OCR check failed: {e}")
            raise ValueError(f"Failed to check PDF OCR needs: {str(e)}")

    def get_metadata(self, pdf_data: bytes) -> Dict[str, Any]:
        """
        Extract PDF metadata without full text extraction.

        Args:
            pdf_data: Raw PDF bytes

        Returns:
            Dictionary with PDF metadata
        """
        try:
            doc = fitz.open(stream=pdf_data, filetype="pdf")
            metadata = self._extract_metadata(doc)
            metadata["pages"] = len(doc)
            doc.close()

            return metadata

        except Exception as e:
            logger.error(f"Metadata extraction failed: {e}")
            raise ValueError(f"Failed to extract PDF metadata: {str(e)}")

    def _extract_metadata(self, doc: fitz.Document) -> Dict[str, Optional[str]]:
        """Extract metadata from PyMuPDF document"""
        meta = doc.metadata or {}

        return {
            "title": meta.get("title"),
            "author": meta.get("author"),
            "subject": meta.get("subject"),
            "keywords": meta.get("keywords"),
            "creator": meta.get("creator"),
            "producer": meta.get("producer"),
            "creation_date": meta.get("creationDate"),
            "modification_date": meta.get("modDate"),
        }

    def _estimate_ocr_cost(self, pages: int) -> float:
        """
        Estimate OpenAI Vision OCR cost.

        Based on gpt-4o-mini pricing:
        - ~1000 tokens per page (image input)
        - $0.15 per 1M input tokens
        """
        tokens_per_page = 1000
        cost_per_1m_tokens = 0.15  # gpt-4o-mini

        total_tokens = pages * tokens_per_page
        return (total_tokens * cost_per_1m_tokens) / 1_000_000
