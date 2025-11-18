"""
Tests for Markdown and HTML exporters

Tests the Python implementations of document exporters.
"""

import pytest
from processors.markdown_export import MarkdownExporter
from processors.html import HtmlExporter


@pytest.fixture
def sample_document():
    """Sample Portable Text document for testing"""
    return {
        "content": [
            {
                "_type": "block",
                "_key": "block1",
                "style": "h1",
                "children": [
                    {
                        "_type": "span",
                        "_key": "span1",
                        "text": "Test Document",
                        "marks": []
                    }
                ],
                "markDefs": []
            },
            {
                "_type": "block",
                "_key": "block2",
                "style": "normal",
                "children": [
                    {
                        "_type": "span",
                        "_key": "span2",
                        "text": "This is a ",
                        "marks": []
                    },
                    {
                        "_type": "span",
                        "_key": "span3",
                        "text": "bold",
                        "marks": ["strong"]
                    },
                    {
                        "_type": "span",
                        "_key": "span4",
                        "text": " and ",
                        "marks": []
                    },
                    {
                        "_type": "span",
                        "_key": "span5",
                        "text": "italic",
                        "marks": ["em"]
                    },
                    {
                        "_type": "span",
                        "_key": "span6",
                        "text": " text.",
                        "marks": []
                    }
                ],
                "markDefs": []
            },
            {
                "_type": "code",
                "_key": "code1",
                "language": "python",
                "code": "print('Hello, World!')"
            },
            {
                "_type": "block",
                "_key": "block3",
                "style": "normal",
                "listItem": "bullet",
                "level": 1,
                "children": [
                    {
                        "_type": "span",
                        "_key": "span7",
                        "text": "First item",
                        "marks": []
                    }
                ],
                "markDefs": []
            },
            {
                "_type": "block",
                "_key": "block4",
                "style": "normal",
                "listItem": "bullet",
                "level": 1,
                "children": [
                    {
                        "_type": "span",
                        "_key": "span8",
                        "text": "Second item",
                        "marks": []
                    }
                ],
                "markDefs": []
            },
            {
                "_type": "table",
                "_key": "table1",
                "rows": [
                    {
                        "cells": ["Header 1", "Header 2"],
                        "header": True
                    },
                    {
                        "cells": ["Cell 1", "Cell 2"]
                    }
                ]
            }
        ],
        "metadata": {
            "title": "Test Document",
            "tags": ["test", "sample"],
            "createdAt": "2025-01-01T00:00:00Z",
            "updatedAt": "2025-01-02T00:00:00Z"
        }
    }


@pytest.fixture
def markdown_exporter():
    """Create MarkdownExporter instance"""
    return MarkdownExporter()


@pytest.fixture
def html_exporter():
    """Create HtmlExporter instance"""
    return HtmlExporter()


class TestMarkdownExporter:
    """Tests for MarkdownExporter"""

    def test_basic_export(self, markdown_exporter, sample_document):
        """Test basic markdown export"""
        result = markdown_exporter.export_markdown(sample_document)

        assert isinstance(result, str)
        assert len(result) > 0
        assert "# Test Document" in result
        assert "**bold**" in result
        assert "*italic*" in result

    def test_frontmatter_generation(self, markdown_exporter, sample_document):
        """Test YAML frontmatter generation"""
        result = markdown_exporter.export_markdown(
            sample_document,
            {"include_metadata": True}
        )

        assert result.startswith("---")
        assert "title: Test Document" in result
        assert "tags: test, sample" in result
        assert "created: 2025-01-01T00:00:00Z" in result

    def test_no_frontmatter(self, markdown_exporter, sample_document):
        """Test export without frontmatter"""
        result = markdown_exporter.export_markdown(
            sample_document,
            {"include_metadata": False}
        )

        assert not result.startswith("---")
        assert "title:" not in result

    def test_code_block(self, markdown_exporter, sample_document):
        """Test code block formatting"""
        result = markdown_exporter.export_markdown(sample_document)

        assert "```python" in result
        assert "print('Hello, World!')" in result
        assert "```" in result

    def test_list_items(self, markdown_exporter, sample_document):
        """Test list formatting"""
        result = markdown_exporter.export_markdown(sample_document)

        assert "- First item" in result
        assert "- Second item" in result

    def test_table_formatting(self, markdown_exporter, sample_document):
        """Test table formatting"""
        result = markdown_exporter.export_markdown(sample_document)

        assert "| Header 1 | Header 2 |" in result
        assert "| --- | --- |" in result
        assert "| Cell 1 | Cell 2 |" in result

    def test_links(self, markdown_exporter):
        """Test link formatting"""
        doc = {
            "content": [
                {
                    "_type": "block",
                    "_key": "block1",
                    "style": "normal",
                    "children": [
                        {
                            "_type": "span",
                            "_key": "span1",
                            "text": "Click here",
                            "marks": ["link1"]
                        }
                    ],
                    "markDefs": [
                        {
                            "_type": "link",
                            "_key": "link1",
                            "href": "https://example.com",
                            "title": "Example"
                        }
                    ]
                }
            ],
            "metadata": {}
        }

        result = markdown_exporter.export_markdown(doc, {"include_metadata": False})
        assert '[Click here](https://example.com "Example")' in result

    def test_wiki_links(self, markdown_exporter):
        """Test wiki link formatting"""
        doc = {
            "content": [
                {
                    "_type": "block",
                    "_key": "block1",
                    "style": "normal",
                    "children": [
                        {
                            "_type": "span",
                            "_key": "span1",
                            "text": "Link text",
                            "marks": ["wiki1"]
                        }
                    ],
                    "markDefs": [
                        {
                            "_type": "wikiLink",
                            "_key": "wiki1",
                            "target": "Page Name"
                        }
                    ]
                }
            ],
            "metadata": {}
        }

        result = markdown_exporter.export_markdown(doc, {"include_metadata": False})
        assert "[[Page Name]]" in result

    def test_callout_block(self, markdown_exporter):
        """Test Obsidian-style callout"""
        doc = {
            "content": [
                {
                    "_type": "callout",
                    "_key": "callout1",
                    "calloutType": "warning",
                    "children": [
                        {
                            "_type": "span",
                            "_key": "span1",
                            "text": "Warning message",
                            "marks": []
                        }
                    ],
                    "markDefs": []
                }
            ],
            "metadata": {}
        }

        result = markdown_exporter.export_markdown(doc, {"include_metadata": False})
        assert "> [!warning]" in result
        assert "> Warning message" in result


class TestHtmlExporter:
    """Tests for HtmlExporter"""

    def test_basic_export(self, html_exporter, sample_document):
        """Test basic HTML export"""
        result = html_exporter.export_html(sample_document)

        assert isinstance(result, str)
        assert "<!DOCTYPE html>" in result
        assert "<html" in result
        assert "</html>" in result
        assert "<h1>Test Document</h1>" in result
        assert "<strong>bold</strong>" in result
        assert "<em>italic</em>" in result

    def test_metadata_section(self, html_exporter, sample_document):
        """Test metadata section generation"""
        result = html_exporter.export_html(
            sample_document,
            {"include_metadata": True}
        )

        assert 'class="document-metadata"' in result
        assert "<h1" in result and "Test Document</h1>" in result
        assert "test</span>" in result
        assert "sample</span>" in result

    def test_no_metadata(self, html_exporter, sample_document):
        """Test export without metadata"""
        result = html_exporter.export_html(
            sample_document,
            {"include_metadata": False}
        )

        assert 'class="document-metadata"' not in result

    def test_code_block(self, html_exporter, sample_document):
        """Test code block HTML"""
        result = html_exporter.export_html(sample_document)

        assert '<pre><code class="language-python">' in result
        assert "print(&#x27;Hello, World!&#x27;)" in result or "print('Hello, World!')" in result

    def test_list_items(self, html_exporter, sample_document):
        """Test list HTML"""
        result = html_exporter.export_html(sample_document)

        assert "<ul><li>First item</li></ul>" in result
        assert "<ul><li>Second item</li></ul>" in result

    def test_table_formatting(self, html_exporter, sample_document):
        """Test table HTML"""
        result = html_exporter.export_html(sample_document)

        assert "<table>" in result
        assert "<th>Header 1</th>" in result
        assert "<th>Header 2</th>" in result
        assert "<td>Cell 1</td>" in result
        assert "<td>Cell 2</td>" in result

    def test_html_escaping(self, html_exporter):
        """Test HTML special character escaping"""
        doc = {
            "content": [
                {
                    "_type": "block",
                    "_key": "block1",
                    "style": "normal",
                    "children": [
                        {
                            "_type": "span",
                            "_key": "span1",
                            "text": "<script>alert('XSS')</script>",
                            "marks": []
                        }
                    ],
                    "markDefs": []
                }
            ],
            "metadata": {}
        }

        result = html_exporter.export_html(doc, {"include_metadata": False})
        assert "&lt;script&gt;" in result
        assert "<script>" not in result

    def test_with_styles(self, html_exporter, sample_document):
        """Test export with CSS styles"""
        result = html_exporter.export_html(
            sample_document,
            {"include_styles": True}
        )

        assert "<style>" in result
        assert "</style>" in result
        assert "body {" in result

    def test_without_styles(self, html_exporter, sample_document):
        """Test export without CSS styles"""
        result = html_exporter.export_html(
            sample_document,
            {"include_styles": False}
        )

        assert "<style>" not in result

    def test_custom_class_name(self, html_exporter, sample_document):
        """Test custom class name"""
        result = html_exporter.export_html(
            sample_document,
            {"class_name": "custom-content"}
        )

        assert 'class="custom-content"' in result

    def test_custom_title(self, html_exporter, sample_document):
        """Test custom title"""
        result = html_exporter.export_html(
            sample_document,
            {"title": "Custom Title"}
        )

        assert "<title>Custom Title</title>" in result

    def test_callout_block(self, html_exporter):
        """Test callout block HTML"""
        doc = {
            "content": [
                {
                    "_type": "callout",
                    "_key": "callout1",
                    "calloutType": "warning",
                    "children": [
                        {
                            "_type": "span",
                            "_key": "span1",
                            "text": "Warning message",
                            "marks": []
                        }
                    ],
                    "markDefs": []
                }
            ],
            "metadata": {}
        }

        result = html_exporter.export_html(doc, {"include_metadata": False})
        assert 'class="callout callout-warning"' in result
        assert "Warning message" in result


class TestExporterPerformance:
    """Performance tests for exporters"""

    def test_large_document_markdown(self, markdown_exporter):
        """Test markdown export with large document"""
        # Create a large document
        blocks = []
        for i in range(1000):
            blocks.append({
                "_type": "block",
                "_key": f"block{i}",
                "style": "normal",
                "children": [
                    {
                        "_type": "span",
                        "_key": f"span{i}",
                        "text": f"Paragraph {i} with some text content.",
                        "marks": []
                    }
                ],
                "markDefs": []
            })

        doc = {"content": blocks, "metadata": {}}

        import time
        start = time.time()
        result = markdown_exporter.export_markdown(doc, {"include_metadata": False})
        elapsed = (time.time() - start) * 1000

        assert isinstance(result, str)
        assert len(result) > 0
        # Should complete in reasonable time (< 1 second for 1000 blocks)
        assert elapsed < 1000

    def test_large_document_html(self, html_exporter):
        """Test HTML export with large document"""
        # Create a large document
        blocks = []
        for i in range(1000):
            blocks.append({
                "_type": "block",
                "_key": f"block{i}",
                "style": "normal",
                "children": [
                    {
                        "_type": "span",
                        "_key": f"span{i}",
                        "text": f"Paragraph {i} with some text content.",
                        "marks": []
                    }
                ],
                "markDefs": []
            })

        doc = {"content": blocks, "metadata": {}}

        import time
        start = time.time()
        result = html_exporter.export_html(doc, {"include_metadata": False})
        elapsed = (time.time() - start) * 1000

        assert isinstance(result, str)
        assert "<!DOCTYPE html>" in result
        # Should complete in reasonable time (< 1 second for 1000 blocks)
        assert elapsed < 1000
