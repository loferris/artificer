#!/usr/bin/env python3
"""
Generate PDF test fixtures
Run with: python3 scripts/generate-pdf-fixtures.py
"""

import sys
from pathlib import Path

# Add parent directory to path to import processors
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

import fitz  # PyMuPDF

def generate_pdfs():
    fixtures_dir = Path(__file__).parent.parent / 'python' / 'tests' / 'fixtures'
    fixtures_dir.mkdir(parents=True, exist_ok=True)

    print("Generating PDF test fixtures...")

    if HAS_REPORTLAB:
        # Method 1: Use reportlab (if available)
        generate_with_reportlab(fixtures_dir)
    else:
        # Method 2: Use PyMuPDF (already installed)
        generate_with_pymupdf(fixtures_dir)

    print("✅ PDF fixtures generated successfully!")
    print(f"  Location: {fixtures_dir}")

def generate_with_pymupdf(fixtures_dir):
    """Generate PDFs using PyMuPDF"""

    # 1. Single page PDF
    print("Creating sample-1page.pdf...")
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4 size

    # Add text
    text = """Test Document

This is a single-page PDF for testing purposes.

It contains simple text content that can be extracted.

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
"""

    page.insert_text((50, 50), text, fontsize=12)
    doc.save(str(fixtures_dir / 'sample-1page.pdf'))
    doc.close()

    # 2. Multi-page PDF
    print("Creating sample-multipage.pdf...")
    doc = fitz.open()

    for page_num in range(1, 6):
        page = doc.new_page(width=595, height=842)
        page.insert_text(
            (50, 50),
            f"Page {page_num}\n\nThis is page {page_num} of a multi-page test document.\n\nIt contains text content for testing PDF processing.",
            fontsize=12
        )

    doc.save(str(fixtures_dir / 'sample-multipage.pdf'))
    doc.close()

    # Also copy to TypeScript fixtures
    ts_fixtures_dir = Path(__file__).parent.parent / 'src' / 'server' / 'services' / 'image' / '__tests__' / 'fixtures'
    ts_fixtures_dir.mkdir(parents=True, exist_ok=True)

    # Copy 2-page version for TypeScript
    print("Creating sample-2page.pdf...")
    doc = fitz.open()
    for page_num in range(1, 3):
        page = doc.new_page(width=595, height=842)
        page.insert_text(
            (50, 50),
            f"Page {page_num}\n\nTest content for page {page_num}.",
            fontsize=12
        )
    doc.save(str(ts_fixtures_dir / 'sample-2page.pdf'))
    doc.close()

def generate_with_reportlab(fixtures_dir):
    """Generate PDFs using reportlab"""

    # 1. Single page PDF
    print("Creating sample-1page.pdf...")
    c = canvas.Canvas(str(fixtures_dir / 'sample-1page.pdf'), pagesize=letter)
    c.drawString(100, 750, "Test Document")
    c.drawString(100, 700, "This is a single-page PDF for testing purposes.")
    c.drawString(100, 650, "It contains simple text content that can be extracted.")
    c.save()

    # 2. Multi-page PDF
    print("Creating sample-multipage.pdf...")
    c = canvas.Canvas(str(fixtures_dir / 'sample-multipage.pdf'), pagesize=letter)
    for page_num in range(1, 6):
        c.drawString(100, 750, f"Page {page_num}")
        c.drawString(100, 700, f"This is page {page_num} of a multi-page test document.")
        c.showPage()
    c.save()

if __name__ == '__main__':
    generate_pdfs()
