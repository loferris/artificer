"""
Tests for Notion and Roam exporters

Tests the Python implementations of Notion and Roam JSON exporters.
"""

import pytest
import json
from processors.notion_export import NotionExporter
from processors.roam_export import RoamExporter


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
                        "_key": "span5",
                        "text": "First item",
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
            "createdAt": "2025-01-01T00:00:00Z",
            "updatedAt": "2025-01-02T00:00:00Z"
        }
    }


@pytest.fixture
def notion_exporter():
    """Create NotionExporter instance"""
    return NotionExporter()


@pytest.fixture
def roam_exporter():
    """Create RoamExporter instance"""
    return RoamExporter()


class TestNotionExporter:
    """Tests for NotionExporter"""

    def test_basic_export(self, notion_exporter, sample_document):
        """Test basic Notion export"""
        result = notion_exporter.export_notion(sample_document)

        assert isinstance(result, str)
        assert len(result) > 0

        # Parse JSON to verify structure
        data = json.loads(result)
        assert data["object"] == "list"
        assert "results" in data
        assert isinstance(data["results"], list)
        assert len(data["results"]) > 0

    def test_heading_conversion(self, notion_exporter, sample_document):
        """Test heading conversion to Notion format"""
        result = notion_exporter.export_notion(sample_document)
        data = json.loads(result)

        # First block should be a heading_1
        first_block = data["results"][0]
        assert first_block["type"] == "heading_1"
        assert "heading_1" in first_block
        assert first_block["heading_1"]["rich_text"][0]["plain_text"] == "Test Document"

    def test_paragraph_with_marks(self, notion_exporter, sample_document):
        """Test paragraph with text marks"""
        result = notion_exporter.export_notion(sample_document)
        data = json.loads(result)

        # Second block should be a paragraph with bold text
        paragraph_block = data["results"][1]
        assert paragraph_block["type"] == "paragraph"

        rich_text = paragraph_block["paragraph"]["rich_text"]
        # Find the bold text span
        bold_span = next((span for span in rich_text if span["text"]["content"] == "bold"), None)
        assert bold_span is not None
        assert bold_span["annotations"]["bold"] is True

    def test_code_block(self, notion_exporter, sample_document):
        """Test code block conversion"""
        result = notion_exporter.export_notion(sample_document)
        data = json.loads(result)

        # Find code block
        code_block = next((b for b in data["results"] if b["type"] == "code"), None)
        assert code_block is not None
        assert code_block["code"]["language"] == "python"
        assert "Hello, World!" in code_block["code"]["rich_text"][0]["text"]["content"]

    def test_list_item(self, notion_exporter, sample_document):
        """Test list item conversion"""
        result = notion_exporter.export_notion(sample_document)
        data = json.loads(result)

        # Find bulleted list item
        list_block = next((b for b in data["results"] if b["type"] == "bulleted_list_item"), None)
        assert list_block is not None
        assert list_block["bulleted_list_item"]["rich_text"][0]["plain_text"] == "First item"

    def test_table_conversion(self, notion_exporter, sample_document):
        """Test table conversion"""
        result = notion_exporter.export_notion(sample_document)
        data = json.loads(result)

        # Find table block
        table_block = next((b for b in data["results"] if b["type"] == "table"), None)
        assert table_block is not None
        assert table_block["table"]["table_width"] == 2
        assert table_block["table"]["has_column_header"] is True
        assert len(table_block["table"]["children"]) == 2

    def test_pretty_print(self, notion_exporter, sample_document):
        """Test pretty print option"""
        result_compact = notion_exporter.export_notion(sample_document, {"pretty_print": False})
        result_pretty = notion_exporter.export_notion(sample_document, {"pretty_print": True})

        # Pretty print should have more characters due to indentation and newlines
        assert len(result_pretty) > len(result_compact)
        # Both should be valid JSON
        json.loads(result_compact)
        json.loads(result_pretty)

    def test_callout_conversion(self, notion_exporter):
        """Test callout block conversion"""
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

        result = notion_exporter.export_notion(doc)
        data = json.loads(result)

        callout = data["results"][0]
        assert callout["type"] == "callout"
        assert callout["callout"]["icon"]["emoji"] == "⚠️"
        assert callout["callout"]["color"] == "yellow"

    def test_nested_lists(self, notion_exporter):
        """Test nested list conversion"""
        doc = {
            "content": [
                {
                    "_type": "block",
                    "_key": "item1",
                    "style": "normal",
                    "listItem": "bullet",
                    "level": 1,
                    "children": [{"_type": "span", "_key": "s1", "text": "Parent", "marks": []}],
                    "markDefs": []
                },
                {
                    "_type": "block",
                    "_key": "item2",
                    "style": "normal",
                    "listItem": "bullet",
                    "level": 2,
                    "children": [{"_type": "span", "_key": "s2", "text": "Child", "marks": []}],
                    "markDefs": []
                }
            ],
            "metadata": {}
        }

        result = notion_exporter.export_notion(doc)
        data = json.loads(result)

        # Parent should have children
        parent = data["results"][0]
        assert "children" in parent["bulleted_list_item"]
        assert len(parent["bulleted_list_item"]["children"]) == 1


class TestRoamExporter:
    """Tests for RoamExporter"""

    def test_basic_export(self, roam_exporter, sample_document):
        """Test basic Roam export"""
        result = roam_exporter.export_roam(sample_document)

        assert isinstance(result, str)
        assert len(result) > 0

        # Parse JSON to verify structure
        data = json.loads(result)
        assert "title" in data
        assert "create-time" in data
        assert "edit-time" in data
        assert "children" in data
        assert isinstance(data["children"], list)

    def test_title_from_metadata(self, roam_exporter, sample_document):
        """Test title extraction from metadata"""
        result = roam_exporter.export_roam(sample_document)
        data = json.loads(result)

        assert data["title"] == "Test Document"

    def test_timestamps(self, roam_exporter, sample_document):
        """Test timestamp conversion"""
        result = roam_exporter.export_roam(sample_document)
        data = json.loads(result)

        # Should have timestamps as milliseconds
        assert isinstance(data["create-time"], int)
        assert isinstance(data["edit-time"], int)
        assert data["create-time"] > 0
        assert data["edit-time"] > 0

    def test_text_block_conversion(self, roam_exporter, sample_document):
        """Test text block conversion"""
        result = roam_exporter.export_roam(sample_document)
        data = json.loads(result)

        # Should skip H1 matching title, so first child is the paragraph
        first_child = data["children"][0]
        assert "string" in first_child
        assert "**bold**" in first_child["string"]  # Bold formatting
        assert "uid" in first_child
        assert len(first_child["uid"]) == 9  # Roam UIDs are 9 characters

    def test_code_block(self, roam_exporter, sample_document):
        """Test code block conversion"""
        result = roam_exporter.export_roam(sample_document)
        data = json.loads(result)

        # Find code block
        code_block = next((b for b in data["children"] if "```python" in b["string"]), None)
        assert code_block is not None
        assert "print('Hello, World!')" in code_block["string"]

    def test_markdown_marks(self, roam_exporter):
        """Test markdown-style marks conversion"""
        doc = {
            "content": [
                {
                    "_type": "block",
                    "_key": "block1",
                    "style": "normal",
                    "children": [
                        {"_type": "span", "_key": "s1", "text": "normal ", "marks": []},
                        {"_type": "span", "_key": "s2", "text": "bold", "marks": ["strong"]},
                        {"_type": "span", "_key": "s3", "text": " ", "marks": []},
                        {"_type": "span", "_key": "s4", "text": "italic", "marks": ["em"]},
                        {"_type": "span", "_key": "s5", "text": " ", "marks": []},
                        {"_type": "span", "_key": "s6", "text": "code", "marks": ["code"]},
                    ],
                    "markDefs": []
                }
            ],
            "metadata": {"title": "Test"}
        }

        result = roam_exporter.export_roam(doc)
        data = json.loads(result)

        text = data["children"][0]["string"]
        assert "**bold**" in text
        assert "*italic*" in text
        assert "`code`" in text

    def test_wiki_links(self, roam_exporter):
        """Test wiki link conversion"""
        doc = {
            "content": [
                {
                    "_type": "block",
                    "_key": "block1",
                    "style": "normal",
                    "children": [
                        {"_type": "span", "_key": "s1", "text": "Link to page", "marks": ["wiki1"]}
                    ],
                    "markDefs": [
                        {"_type": "wikiLink", "_key": "wiki1", "target": "Page Name"}
                    ]
                }
            ],
            "metadata": {"title": "Test"}
        }

        result = roam_exporter.export_roam(doc)
        data = json.loads(result)

        assert "[[Page Name]]" in data["children"][0]["string"]

    def test_table_conversion(self, roam_exporter, sample_document):
        """Test table conversion (as nested blocks)"""
        result = roam_exporter.export_roam(sample_document)
        data = json.loads(result)

        # Tables are converted to nested blocks with pipe separators
        table_blocks = [b for b in data["children"] if "|" in b["string"]]
        assert len(table_blocks) == 2  # Header and data row
        assert "Header 1 | Header 2" in table_blocks[0]["string"]
        assert "Cell 1 | Cell 2" in table_blocks[1]["string"]

    def test_uid_uniqueness(self, roam_exporter):
        """Test that UIDs are unique"""
        doc = {
            "content": [
                {"_type": "block", "_key": f"b{i}", "style": "normal",
                 "children": [{"_type": "span", "_key": f"s{i}", "text": f"Block {i}", "marks": []}],
                 "markDefs": []}
                for i in range(100)
            ],
            "metadata": {"title": "Test"}
        }

        result = roam_exporter.export_roam(doc)
        data = json.loads(result)

        uids = [block["uid"] for block in data["children"]]
        # All UIDs should be unique
        assert len(uids) == len(set(uids))

    def test_pretty_print(self, roam_exporter, sample_document):
        """Test pretty print option"""
        result_compact = roam_exporter.export_roam(sample_document, {"pretty_print": False})
        result_pretty = roam_exporter.export_roam(sample_document, {"pretty_print": True})

        # Pretty print should have more characters
        assert len(result_pretty) > len(result_compact)
        # Both should be valid JSON
        json.loads(result_compact)
        json.loads(result_pretty)


class TestExporterPerformance:
    """Performance tests for exporters"""

    def test_large_document_notion(self, notion_exporter):
        """Test Notion export with large document"""
        blocks = []
        for i in range(500):
            blocks.append({
                "_type": "block",
                "_key": f"block{i}",
                "style": "normal",
                "children": [
                    {"_type": "span", "_key": f"span{i}", "text": f"Paragraph {i}", "marks": []}
                ],
                "markDefs": []
            })

        doc = {"content": blocks, "metadata": {}}

        import time
        start = time.time()
        result = notion_exporter.export_notion(doc)
        elapsed = (time.time() - start) * 1000

        data = json.loads(result)
        assert len(data["results"]) == 500
        # Should complete in reasonable time (< 500ms for 500 blocks)
        assert elapsed < 500

    def test_large_document_roam(self, roam_exporter):
        """Test Roam export with large document"""
        blocks = []
        for i in range(500):
            blocks.append({
                "_type": "block",
                "_key": f"block{i}",
                "style": "normal",
                "children": [
                    {"_type": "span", "_key": f"span{i}", "text": f"Paragraph {i}", "marks": []}
                ],
                "markDefs": []
            })

        doc = {"content": blocks, "metadata": {"title": "Large Document"}}

        import time
        start = time.time()
        result = roam_exporter.export_roam(doc)
        elapsed = (time.time() - start) * 1000

        data = json.loads(result)
        assert len(data["children"]) == 500
        # Should complete in reasonable time (< 500ms for 500 blocks)
        assert elapsed < 500
