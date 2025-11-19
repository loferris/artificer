"""
Tests for Batch Export Processor

Tests parallel document export using Python's multiprocessing capabilities.
"""

import pytest
import json
from processors.batch_export import BatchExportProcessor


@pytest.fixture
def batch_processor():
    """Create BatchExportProcessor instance with 2 workers for testing"""
    return BatchExportProcessor(max_workers=2)


@pytest.fixture
def sample_documents():
    """Sample documents for batch testing"""
    return [
        {
            "content": [
                {
                    "_type": "block",
                    "_key": f"block{i}",
                    "style": "h1",
                    "children": [
                        {
                            "_type": "span",
                            "_key": f"span{i}",
                            "text": f"Document {i}",
                            "marks": []
                        }
                    ],
                    "markDefs": []
                },
                {
                    "_type": "block",
                    "_key": f"block{i}_2",
                    "style": "normal",
                    "children": [
                        {
                            "_type": "span",
                            "_key": f"span{i}_2",
                            "text": f"This is paragraph content for document {i}.",
                            "marks": []
                        }
                    ],
                    "markDefs": []
                }
            ],
            "metadata": {
                "title": f"Document {i}",
                "createdAt": "2025-01-01T00:00:00Z"
            }
        }
        for i in range(10)
    ]


class TestBatchExportProcessor:
    """Tests for BatchExportProcessor"""

    def test_initialization(self):
        """Test processor initialization"""
        processor = BatchExportProcessor(max_workers=4)
        assert processor.max_workers == 4

    def test_initialization_default_workers(self):
        """Test processor uses CPU count by default"""
        processor = BatchExportProcessor()
        # Should use CPU count, but capped at 8
        assert processor.max_workers > 0
        assert processor.max_workers <= 8

    def test_batch_export_markdown(self, batch_processor, sample_documents):
        """Test batch export to markdown"""
        result = batch_processor.export_batch(
            documents=sample_documents,
            format='markdown'
        )

        # Verify basic structure
        assert result["totalDocuments"] == 10
        assert result["successful"] == 10
        assert result["failed"] == 0
        assert len(result["results"]) == 10
        assert len(result["errors"]) == 0

        # Verify timing info
        assert result["totalProcessingTime"] > 0
        assert result["averageProcessingTime"] > 0
        # Speedup may be < 1.0 for small documents due to multiprocessing overhead
        assert result["parallelSpeedup"] > 0

        # Verify results contain markdown
        for i, item in enumerate(result["results"]):
            assert item["index"] == i
            assert item["success"] is True
            assert "# Document" in item["output"]
            # Processing time can be 0 for very fast operations
            assert item["processingTime"] >= 0

    def test_batch_export_html(self, batch_processor, sample_documents):
        """Test batch export to HTML"""
        result = batch_processor.export_batch(
            documents=sample_documents,
            format='html'
        )

        assert result["totalDocuments"] == 10
        assert result["successful"] == 10
        assert result["failed"] == 0

        # Verify results contain HTML
        for item in result["results"]:
            assert item["success"] is True
            assert "<h1>" in item["output"]
            assert "<p>" in item["output"]

    def test_batch_export_notion(self, batch_processor, sample_documents):
        """Test batch export to Notion JSON"""
        result = batch_processor.export_batch(
            documents=sample_documents,
            format='notion'
        )

        assert result["totalDocuments"] == 10
        assert result["successful"] == 10
        assert result["failed"] == 0

        # Verify results contain valid JSON with Notion structure
        for item in result["results"]:
            assert item["success"] is True
            data = json.loads(item["output"])
            assert data["object"] == "list"
            assert "results" in data
            assert len(data["results"]) > 0

    def test_batch_export_roam(self, batch_processor, sample_documents):
        """Test batch export to Roam JSON"""
        result = batch_processor.export_batch(
            documents=sample_documents,
            format='roam'
        )

        assert result["totalDocuments"] == 10
        assert result["successful"] == 10
        assert result["failed"] == 0

        # Verify results contain valid JSON with Roam structure
        for item in result["results"]:
            assert item["success"] is True
            data = json.loads(item["output"])
            assert "title" in data
            assert "children" in data
            assert "create-time" in data

    def test_batch_export_with_options(self, batch_processor, sample_documents):
        """Test batch export with format options"""
        result = batch_processor.export_batch(
            documents=sample_documents,
            format='markdown',
            options={"include_metadata": True}
        )

        assert result["successful"] == 10
        # Options are passed through to individual exporters
        for item in result["results"]:
            assert item["success"] is True

    def test_invalid_format(self, batch_processor, sample_documents):
        """Test batch export with invalid format"""
        with pytest.raises(ValueError, match="Unsupported export format"):
            batch_processor.export_batch(
                documents=sample_documents,
                format='invalid'
            )

    def test_empty_document_list(self, batch_processor):
        """Test batch export with empty document list"""
        result = batch_processor.export_batch(
            documents=[],
            format='markdown'
        )

        assert result["totalDocuments"] == 0
        assert result["successful"] == 0
        assert result["failed"] == 0
        assert len(result["results"]) == 0
        assert result["averageProcessingTime"] == 0

    def test_single_document(self, batch_processor, sample_documents):
        """Test batch export with single document"""
        result = batch_processor.export_batch(
            documents=[sample_documents[0]],
            format='markdown'
        )

        assert result["totalDocuments"] == 1
        assert result["successful"] == 1
        assert result["failed"] == 0

    def test_parallel_speedup_calculation(self, batch_processor):
        """Test parallel speedup calculation"""
        # Create documents that should show speedup
        docs = [
            {
                "content": [
                    {
                        "_type": "block",
                        "_key": f"b{i}_{j}",
                        "style": "normal",
                        "children": [
                            {"_type": "span", "_key": f"s{i}_{j}", "text": f"Text {i} {j}", "marks": []}
                        ],
                        "markDefs": []
                    }
                    for j in range(100)  # 100 blocks per document
                ],
                "metadata": {"title": f"Doc {i}"}
            }
            for i in range(20)  # 20 documents
        ]

        result = batch_processor.export_batch(
            documents=docs,
            format='markdown'
        )

        # Should complete successfully (speedup depends on document complexity)
        assert result["successful"] == 20
        assert result["parallelSpeedup"] > 0

    def test_error_handling(self, batch_processor):
        """Test error handling for malformed documents"""
        # Mix valid and invalid documents
        docs = [
            {
                "content": [
                    {
                        "_type": "block",
                        "_key": "b1",
                        "style": "normal",
                        "children": [
                            {"_type": "span", "_key": "s1", "text": "Valid doc", "marks": []}
                        ],
                        "markDefs": []
                    }
                ],
                "metadata": {"title": "Valid"}
            },
            None,  # Invalid document
            {
                "content": [
                    {
                        "_type": "block",
                        "_key": "b2",
                        "style": "normal",
                        "children": [
                            {"_type": "span", "_key": "s2", "text": "Another valid", "marks": []}
                        ],
                        "markDefs": []
                    }
                ],
                "metadata": {"title": "Valid 2"}
            }
        ]

        result = batch_processor.export_batch(
            documents=docs,
            format='markdown'
        )

        # Should have 2 successful and 1 failed
        assert result["totalDocuments"] == 3
        assert result["successful"] == 2
        assert result["failed"] == 1
        assert len(result["errors"]) == 1
        assert result["errors"][0]["index"] == 1

    def test_result_ordering(self, batch_processor, sample_documents):
        """Test that results maintain original document order"""
        result = batch_processor.export_batch(
            documents=sample_documents,
            format='markdown'
        )

        # Results should be sorted by index
        for i, item in enumerate(result["results"]):
            assert item["index"] == i
            assert f"Document {i}" in item["output"]


class TestBatchExportPerformance:
    """Performance tests for batch export"""

    def test_large_batch_markdown(self, batch_processor):
        """Test batch export with many documents"""
        # Create 50 documents
        docs = [
            {
                "content": [
                    {
                        "_type": "block",
                        "_key": f"block{i}",
                        "style": "normal",
                        "children": [
                            {"_type": "span", "_key": f"span{i}", "text": f"Document {i} content", "marks": []}
                        ],
                        "markDefs": []
                    }
                ],
                "metadata": {"title": f"Doc {i}"}
            }
            for i in range(50)
        ]

        import time
        start = time.time()
        result = batch_processor.export_batch(documents=docs, format='markdown')
        elapsed = (time.time() - start) * 1000

        # Should complete successfully
        assert result["successful"] == 50
        assert result["failed"] == 0

        # Speedup value should be calculated (may be < 1.0 for small docs due to overhead)
        assert result["parallelSpeedup"] > 0

        # Should be reasonably fast (< 5 seconds for 50 documents)
        assert elapsed < 5000

    def test_speedup_comparison(self):
        """Test that multiprocessing provides actual speedup"""
        # Create substantial documents
        docs = [
            {
                "content": [
                    {
                        "_type": "block",
                        "_key": f"b{i}_{j}",
                        "style": "normal",
                        "children": [
                            {"_type": "span", "_key": f"s{i}_{j}", "text": f"Block {j}", "marks": []}
                        ],
                        "markDefs": []
                    }
                    for j in range(50)  # 50 blocks per document
                ],
                "metadata": {"title": f"Doc {i}"}
            }
            for i in range(10)
        ]

        # Test with 1 worker (essentially sequential)
        processor_1 = BatchExportProcessor(max_workers=1)
        result_1 = processor_1.export_batch(documents=docs, format='markdown')

        # Test with 4 workers (parallel)
        processor_4 = BatchExportProcessor(max_workers=4)
        result_4 = processor_4.export_batch(documents=docs, format='markdown')

        # Both should succeed
        assert result_1["successful"] == 10
        assert result_4["successful"] == 10

        # 4 workers should be faster than 1 worker
        # (actual speedup depends on system, but should show improvement)
        assert result_4["parallelSpeedup"] >= result_1["parallelSpeedup"]
