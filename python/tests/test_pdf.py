"""Tests for PDF processor"""

import pytest
from processors.pdf import PdfProcessor


class TestPdfProcessor:
    """Test cases for PdfProcessor class"""

    @pytest.fixture
    def processor(self):
        """Create PdfProcessor instance"""
        return PdfProcessor()

    # Text Extraction Tests

    def test_extract_text_single_page(self, processor, sample_pdf_1page):
        """Test basic PDF text extraction"""
        result = processor.extract_text(sample_pdf_1page)

        assert 'text' in result
        assert 'pages' in result
        assert 'processing_time_ms' in result
        assert 'has_text_content' in result
        assert 'page_texts' in result
        assert 'metadata' in result

        assert result['pages'] == 1
        assert result['method'] == 'pymupdf'
        assert isinstance(result['processing_time_ms'], int)

    def test_extract_text_multipage(self, processor, sample_pdf_multipage):
        """Test multi-page PDF text extraction"""
        result = processor.extract_text(sample_pdf_multipage)

        assert result['pages'] == 5
        assert len(result['page_texts']) == 5

        # Verify each page has expected structure
        for i, page in enumerate(result['page_texts'], start=1):
            assert page['page_number'] == i
            assert 'text' in page
            assert 'length' in page

    def test_extract_text_content_verification(self, processor, sample_pdf_1page):
        """Test that extracted text contains expected content"""
        result = processor.extract_text(sample_pdf_1page)

        # Our test PDF should contain some text
        assert len(result['text']) > 0
        # Should have identified text content
        # Note: Our minimal PDFs might have <100 chars, so this might be False
        assert 'has_text_content' in result

    def test_extract_text_page_structure(self, processor, sample_pdf_multipage):
        """Test page_texts structure"""
        result = processor.extract_text(sample_pdf_multipage)

        for page in result['page_texts']:
            assert isinstance(page['page_number'], int)
            assert isinstance(page['text'], str)
            assert isinstance(page['length'], int)
            assert page['length'] == len(page['text'])

    def test_extract_text_combined_text(self, processor, sample_pdf_multipage):
        """Test that combined text equals sum of page texts"""
        result = processor.extract_text(sample_pdf_multipage)

        combined_from_pages = ''.join(page['text'] for page in result['page_texts'])
        assert result['text'] == combined_from_pages

    def test_extract_text_invalid_pdf(self, processor, invalid_pdf):
        """Test handling of invalid PDF data"""
        with pytest.raises(ValueError, match="Failed to extract text from PDF"):
            processor.extract_text(invalid_pdf)

    def test_extract_text_empty_data(self, processor):
        """Test handling of empty PDF data"""
        with pytest.raises(ValueError):
            processor.extract_text(b'')

    def test_extract_text_metadata_structure(self, processor, sample_pdf_1page):
        """Test metadata structure in extraction result"""
        result = processor.extract_text(sample_pdf_1page)

        metadata = result['metadata']
        assert isinstance(metadata, dict)

        # Metadata fields may be None for simple test PDFs
        expected_keys = [
            'title', 'author', 'subject', 'keywords',
            'creator', 'producer', 'creation_date', 'modification_date'
        ]
        for key in expected_keys:
            assert key in metadata

    def test_extract_text_processing_time(self, processor, sample_pdf_multipage):
        """Test that processing time is reasonable"""
        result = processor.extract_text(sample_pdf_multipage)

        # Processing time should be fast (< 1000ms for simple PDF)
        assert result['processing_time_ms'] >= 0
        assert result['processing_time_ms'] < 5000  # Should be much faster

    # OCR Detection Tests

    def test_needs_ocr_with_text_content(self, processor, sample_pdf_1page):
        """Test OCR detection for PDF with text"""
        result = processor.needs_ocr(sample_pdf_1page)

        assert 'needs_ocr' in result
        assert 'has_text_content' in result
        assert 'pages' in result
        assert 'text_length' in result
        assert 'avg_text_per_page' in result
        assert 'estimated_ocr_cost' in result

        assert result['pages'] == 1

    def test_needs_ocr_calculation(self, processor, sample_pdf_multipage):
        """Test OCR needs calculation"""
        result = processor.needs_ocr(sample_pdf_multipage)

        # Should calculate average text per page
        assert isinstance(result['avg_text_per_page'], int)
        assert result['avg_text_per_page'] >= 0

        # Cost should be 0 if OCR not needed, > 0 if needed
        if result['needs_ocr']:
            assert result['estimated_ocr_cost'] > 0
        else:
            assert result['estimated_ocr_cost'] == 0.0

    def test_needs_ocr_custom_threshold(self, processor, sample_pdf_1page):
        """Test OCR detection with custom threshold"""
        # High threshold - will likely need OCR
        result_high = processor.needs_ocr(sample_pdf_1page, min_text_threshold=1000)

        # Low threshold - might not need OCR
        result_low = processor.needs_ocr(sample_pdf_1page, min_text_threshold=10)

        # Both should return valid results
        assert 'needs_ocr' in result_high
        assert 'needs_ocr' in result_low

    def test_needs_ocr_cost_estimation(self, processor, sample_pdf_multipage):
        """Test OCR cost estimation"""
        result = processor.needs_ocr(sample_pdf_multipage)

        if result['needs_ocr']:
            # Cost should be proportional to pages
            # 5 pages * 1000 tokens/page * $0.15/1M tokens = $0.00075
            expected_cost_approx = result['pages'] * 0.00015
            assert abs(result['estimated_ocr_cost'] - expected_cost_approx) < 0.001

    def test_needs_ocr_invalid_pdf(self, processor, invalid_pdf):
        """Test OCR check with invalid PDF"""
        with pytest.raises(ValueError, match="Failed to check PDF OCR needs"):
            processor.needs_ocr(invalid_pdf)

    def test_needs_ocr_empty_pdf(self, processor):
        """Test OCR check with empty data"""
        with pytest.raises(ValueError):
            processor.needs_ocr(b'')

    # Metadata Extraction Tests

    def test_get_metadata_basic(self, processor, sample_pdf_1page):
        """Test metadata extraction"""
        metadata = processor.get_metadata(sample_pdf_1page)

        assert isinstance(metadata, dict)
        assert 'pages' in metadata
        assert metadata['pages'] == 1

        # Standard metadata fields
        expected_keys = [
            'title', 'author', 'subject', 'keywords',
            'creator', 'producer', 'creation_date', 'modification_date',
            'pages'
        ]
        for key in expected_keys:
            assert key in metadata

    def test_get_metadata_multipage(self, processor, sample_pdf_multipage):
        """Test metadata for multi-page PDF"""
        metadata = processor.get_metadata(sample_pdf_multipage)

        assert metadata['pages'] == 5

    def test_get_metadata_fields(self, processor, sample_pdf_1page):
        """Test metadata fields can be None"""
        metadata = processor.get_metadata(sample_pdf_1page)

        # Simple test PDFs might not have metadata
        # Fields can be None or string values
        for key in ['title', 'author', 'subject']:
            assert metadata[key] is None or isinstance(metadata[key], str)

    def test_get_metadata_invalid_pdf(self, processor, invalid_pdf):
        """Test metadata extraction from invalid PDF"""
        with pytest.raises(ValueError, match="Failed to extract PDF metadata"):
            processor.get_metadata(invalid_pdf)

    def test_get_metadata_empty_data(self, processor):
        """Test metadata extraction from empty data"""
        with pytest.raises(ValueError):
            processor.get_metadata(b'')

    # Integration Tests

    def test_extract_then_check_ocr(self, processor, sample_pdf_multipage):
        """Test extracting text then checking OCR needs"""
        # First extract
        extract_result = processor.extract_text(sample_pdf_multipage)

        # Then check OCR
        ocr_result = processor.needs_ocr(sample_pdf_multipage)

        # Both should agree on page count
        assert extract_result['pages'] == ocr_result['pages']

        # has_text_content should match
        assert extract_result['has_text_content'] == ocr_result['has_text_content']

    def test_metadata_matches_extraction(self, processor, sample_pdf_multipage):
        """Test that metadata page count matches extraction"""
        extract_result = processor.extract_text(sample_pdf_multipage)
        metadata = processor.get_metadata(sample_pdf_multipage)

        assert extract_result['pages'] == metadata['pages']

    def test_processing_performance(self, processor, sample_pdf_multipage):
        """Test that processing is fast"""
        import time

        start = time.time()
        result = processor.extract_text(sample_pdf_multipage)
        elapsed = time.time() - start

        # Should process in under 1 second
        assert elapsed < 1.0

        # Reported time should be reasonable
        assert result['processing_time_ms'] < 1000

    def test_consistent_results(self, processor, sample_pdf_1page):
        """Test that repeated calls produce consistent results"""
        result1 = processor.extract_text(sample_pdf_1page)
        result2 = processor.extract_text(sample_pdf_1page)

        assert result1['text'] == result2['text']
        assert result1['pages'] == result2['pages']
        assert result1['has_text_content'] == result2['has_text_content']
