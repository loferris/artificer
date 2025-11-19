"""
Pytest configuration and shared fixtures
"""

import pytest
from pathlib import Path


@pytest.fixture
def fixtures_dir():
    """Return path to test fixtures directory"""
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_pdf_1page(fixtures_dir):
    """Load single-page PDF fixture"""
    pdf_path = fixtures_dir / "sample-1page.pdf"
    with open(pdf_path, 'rb') as f:
        return f.read()


@pytest.fixture
def sample_pdf_multipage(fixtures_dir):
    """Load multi-page PDF fixture"""
    pdf_path = fixtures_dir / "sample-multipage.pdf"
    with open(pdf_path, 'rb') as f:
        return f.read()


@pytest.fixture
def sample_image_png(fixtures_dir):
    """Load PNG image fixture"""
    image_path = fixtures_dir / "sample-image.png"
    with open(image_path, 'rb') as f:
        return f.read()


@pytest.fixture
def sample_image_500x500(fixtures_dir):
    """Load 500x500 PNG image fixture"""
    image_path = fixtures_dir / "sample-500x500.png"
    with open(image_path, 'rb') as f:
        return f.read()


@pytest.fixture
def invalid_pdf(fixtures_dir):
    """Load invalid PDF fixture"""
    pdf_path = fixtures_dir / "invalid-pdf.bin"
    with open(pdf_path, 'rb') as f:
        return f.read()


@pytest.fixture
def invalid_image(fixtures_dir):
    """Load invalid image fixture"""
    image_path = fixtures_dir / "invalid-image.bin"
    with open(image_path, 'rb') as f:
        return f.read()


@pytest.fixture
def sample_text(fixtures_dir):
    """Load sample text file"""
    text_path = fixtures_dir / "sample-text.txt"
    with open(text_path, 'r', encoding='utf-8') as f:
        return f.read()


@pytest.fixture
def sample_markdown(fixtures_dir):
    """Load sample markdown file"""
    md_path = fixtures_dir / "sample.md"
    with open(md_path, 'r', encoding='utf-8') as f:
        return f.read()
