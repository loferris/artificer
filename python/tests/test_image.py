"""Tests for image processor"""

import pytest
from processors.image import ImageProcessor
import base64


class TestImageProcessor:
    """Test cases for ImageProcessor class"""

    @pytest.fixture
    def processor(self):
        """Create ImageProcessor instance"""
        return ImageProcessor()

    # PDF to Image Tests

    def test_extract_pdf_pages_to_images_basic(self, processor, sample_pdf_1page):
        """Test basic PDF to image conversion"""
        result = processor.extract_pdf_pages_to_images(
            sample_pdf_1page, dpi=150, format='png'
        )

        assert len(result) == 1
        assert result[0]['width'] > 0
        assert result[0]['height'] > 0
        assert result[0]['format'] == 'png'
        assert len(result[0]['image_data']) > 0
        # Verify image_data is base64
        try:
            base64.b64decode(result[0]['image_data'])
        except Exception:
            pytest.fail("image_data is not valid base64")

    def test_extract_pdf_pages_to_images_multipage(self, processor, sample_pdf_multipage):
        """Test multi-page PDF conversion"""
        result = processor.extract_pdf_pages_to_images(
            sample_pdf_multipage, dpi=150, format='png'
        )

        assert len(result) == 5
        for page in result:
            assert page['width'] > 0
            assert page['height'] > 0
            assert page['format'] == 'png'

    def test_extract_pdf_pages_custom_dpi(self, processor, sample_pdf_1page):
        """Test PDF conversion with custom DPI"""
        low_dpi = processor.extract_pdf_pages_to_images(
            sample_pdf_1page, dpi=72, format='png'
        )
        high_dpi = processor.extract_pdf_pages_to_images(
            sample_pdf_1page, dpi=300, format='png'
        )

        # Higher DPI should result in larger image
        assert high_dpi[0]['width'] > low_dpi[0]['width']
        assert high_dpi[0]['height'] > low_dpi[0]['height']

    def test_extract_pdf_pages_format_png_vs_jpeg(self, processor, sample_pdf_1page):
        """Test different output formats"""
        png_result = processor.extract_pdf_pages_to_images(
            sample_pdf_1page, dpi=150, format='png'
        )
        jpeg_result = processor.extract_pdf_pages_to_images(
            sample_pdf_1page, dpi=150, format='jpeg'
        )

        assert png_result[0]['format'] == 'png'
        assert jpeg_result[0]['format'] == 'jpeg'

    def test_extract_pdf_pages_max_dimensions(self, processor, sample_pdf_1page):
        """Test max width/height constraints"""
        result = processor.extract_pdf_pages_to_images(
            sample_pdf_1page, dpi=300, format='png', max_width=500, max_height=500
        )

        assert result[0]['width'] <= 500
        assert result[0]['height'] <= 500

    def test_extract_pdf_pages_invalid_pdf(self, processor, invalid_pdf):
        """Test handling of invalid PDF data"""
        with pytest.raises(Exception):
            processor.extract_pdf_pages_to_images(
                invalid_pdf, dpi=150, format='png'
            )

    def test_extract_pdf_pages_empty_data(self, processor):
        """Test handling of empty PDF data"""
        with pytest.raises(Exception):
            processor.extract_pdf_pages_to_images(
                b'', dpi=150, format='png'
            )

    # Image Conversion Tests

    def test_convert_image_basic(self, processor, sample_image_png):
        """Test basic image conversion"""
        result = processor.convert_image(
            sample_image_png, output_format='jpeg', quality=85
        )

        assert result['format'] == 'jpeg'
        assert result['width'] > 0
        assert result['height'] > 0
        assert result['size_bytes'] > 0
        assert len(result['image_data']) > 0

    def test_convert_image_format_conversion(self, processor, sample_image_png):
        """Test format conversion PNG to JPEG"""
        result = processor.convert_image(
            sample_image_png, output_format='jpeg', quality=90
        )

        assert result['format'] == 'jpeg'
        # Verify image_data is base64
        try:
            decoded = base64.b64decode(result['image_data'])
            assert len(decoded) > 0
        except Exception:
            pytest.fail("image_data is not valid base64")

    def test_convert_image_quality_settings(self, processor, sample_image_500x500):
        """Test quality settings affect file size"""
        high_quality = processor.convert_image(
            sample_image_500x500, output_format='jpeg', quality=95
        )
        low_quality = processor.convert_image(
            sample_image_500x500, output_format='jpeg', quality=50
        )

        # Lower quality should result in smaller file size
        assert low_quality['size_bytes'] < high_quality['size_bytes']

    def test_convert_image_resize(self, processor, sample_image_500x500):
        """Test image resizing during conversion"""
        result = processor.convert_image(
            sample_image_500x500, output_format='png', max_width=250, max_height=250
        )

        assert result['width'] <= 250
        assert result['height'] <= 250

    def test_convert_image_maintain_aspect_ratio(self, processor, sample_image_500x500):
        """Test aspect ratio is maintained during resize"""
        result = processor.convert_image(
            sample_image_500x500, output_format='png', max_width=300, max_height=200
        )

        # Original is square, so should be 200x200 (limited by max_height)
        assert result['width'] == 200
        assert result['height'] == 200

    def test_convert_image_invalid_data(self, processor, invalid_image):
        """Test handling of invalid image data"""
        with pytest.raises(Exception):
            processor.convert_image(
                invalid_image, output_format='png'
            )

    def test_convert_image_unsupported_format(self, processor, sample_image_png):
        """Test handling of unsupported output format"""
        # Most libraries will handle this gracefully or raise error
        with pytest.raises(Exception):
            processor.convert_image(
                sample_image_png, output_format='invalid_format'
            )

    def test_convert_image_empty_data(self, processor):
        """Test handling of empty image data"""
        with pytest.raises(Exception):
            processor.convert_image(
                b'', output_format='png'
            )

    def test_convert_image_png_format(self, processor, sample_image_png):
        """Test PNG output format"""
        result = processor.convert_image(
            sample_image_png, output_format='png'
        )

        assert result['format'] == 'png'
        assert result['width'] == 100
        assert result['height'] == 100

    def test_convert_image_with_resize_only(self, processor, sample_image_500x500):
        """Test resize without format conversion"""
        result = processor.convert_image(
            sample_image_500x500, output_format='png', max_width=100, max_height=100
        )

        assert result['width'] == 100
        assert result['height'] == 100
        assert result['format'] == 'png'

    # Integration Tests

    def test_pdf_to_images_to_conversion_flow(self, processor, sample_pdf_1page):
        """Test complete flow: PDF -> Image -> Convert"""
        # Step 1: Extract PDF to image
        pdf_result = processor.extract_pdf_pages_to_images(
            sample_pdf_1page, dpi=150, format='png'
        )

        # Step 2: Convert the resulting image
        image_data = base64.b64decode(pdf_result[0]['image_data'])
        convert_result = processor.convert_image(
            image_data, output_format='jpeg', quality=85, max_width=500
        )

        assert convert_result['format'] == 'jpeg'
        assert convert_result['width'] <= 500

    def test_multiple_format_conversions(self, processor, sample_image_png):
        """Test chaining format conversions"""
        # PNG -> JPEG
        jpeg = processor.convert_image(
            sample_image_png, output_format='jpeg', quality=90
        )
        jpeg_data = base64.b64decode(jpeg['image_data'])

        # JPEG -> PNG
        png = processor.convert_image(
            jpeg_data, output_format='png'
        )

        assert png['format'] == 'png'
        assert png['width'] == 100
        assert png['height'] == 100
