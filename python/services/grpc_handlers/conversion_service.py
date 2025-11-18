"""
gRPC ConversionService implementation.

Handles document import/export operations via gRPC.
"""

import sys
from pathlib import Path

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "generated"))

from typing import Iterator
import grpc
from generated.artificer import conversion_service_pb2
from generated.artificer import conversion_service_pb2_grpc
from generated.artificer import common_pb2
from processors.markdown import MarkdownConverter
from processors.html_import import HtmlImporter
from processors.html import HtmlExporter
from processors.markdown_export import MarkdownExporter
from processors.notion_export import NotionExporter
from processors.roam_export import RoamExporter
from processors.batch_export import BatchExportProcessor
import time


class ConversionServiceHandler(conversion_service_pb2_grpc.ConversionServiceServicer):
    """gRPC handler for document conversion operations."""

    def __init__(self):
        """Initialize conversion service with processors."""
        self.markdown_converter = MarkdownConverter()
        self.html_importer = HtmlImporter()
        self.html_exporter = HtmlExporter()
        self.markdown_exporter = MarkdownExporter()
        self.notion_exporter = NotionExporter()
        self.roam_exporter = RoamExporter()
        self.batch_processor = BatchExportProcessor()

    def _portable_text_to_dict(self, document: common_pb2.PortableTextDocument) -> dict:
        """Convert protobuf PortableTextDocument to dict."""
        content = []
        for block in document.content:
            block_dict = {
                "_type": block.type,
                "_key": block.key,
            }

            if block.type == "block":
                block_dict["style"] = block.style
                block_dict["children"] = [
                    {
                        "_type": span.type,
                        "_key": span.key,
                        "text": span.text,
                        "marks": list(span.marks),
                    }
                    for span in block.children
                ]
                block_dict["markDefs"] = [
                    {
                        "_key": mark.key,
                        "_type": mark.type,
                        "href": mark.href,
                    }
                    for mark in block.mark_defs
                ]
                if block.list_item:
                    block_dict["listItem"] = block.list_item
                    block_dict["level"] = block.level

            elif block.type == "code":
                block_dict["code"] = block.code
                block_dict["language"] = block.language

            elif block.type == "image":
                block_dict["url"] = block.url
                block_dict["alt"] = block.alt
                if block.caption:
                    block_dict["caption"] = block.caption

            content.append(block_dict)

        return {
            "content": content,
            "metadata": dict(document.metadata) if document.metadata else {},
        }

    def _dict_to_portable_text(self, data: dict) -> common_pb2.PortableTextDocument:
        """Convert dict to protobuf PortableTextDocument."""
        content = data.get("content", [])
        metadata = data.get("metadata", {})

        blocks = []
        for block_dict in content:
            block = common_pb2.PortableTextBlock(
                type=block_dict.get("_type", "block"),
                key=block_dict.get("_key", ""),
            )

            if block_dict.get("_type") == "block":
                block.style = block_dict.get("style", "normal")

                # Add children (spans)
                for child in block_dict.get("children", []):
                    span = common_pb2.PortableTextSpan(
                        type=child.get("_type", "span"),
                        key=child.get("_key", ""),
                        text=child.get("text", ""),
                        marks=child.get("marks", []),
                    )
                    block.children.append(span)

                # Add mark definitions
                for mark_def in block_dict.get("markDefs", []):
                    mark = common_pb2.MarkDefinition(
                        key=mark_def.get("_key", ""),
                        type=mark_def.get("_type", ""),
                        href=mark_def.get("href", ""),
                    )
                    block.mark_defs.append(mark)

                # List item
                if "listItem" in block_dict:
                    block.list_item = block_dict["listItem"]
                    block.level = block_dict.get("level", 1)

            elif block_dict.get("_type") == "code":
                block.code = block_dict.get("code", "")
                block.language = block_dict.get("language", "")

            elif block_dict.get("_type") == "image":
                block.url = block_dict.get("url", "")
                block.alt = block_dict.get("alt", "")
                block.caption = block_dict.get("caption", "")

            blocks.append(block)

        return common_pb2.PortableTextDocument(content=blocks, metadata=metadata)

    def ImportMarkdown(
        self, request: conversion_service_pb2.ImportMarkdownRequest, context
    ) -> conversion_service_pb2.ImportMarkdownResponse:
        """Import markdown to Portable Text."""
        try:
            start = time.time()

            result = self.markdown_converter.import_markdown(
                content=request.content,
                options={
                    "strict_mode": request.strict_mode,
                    "include_metadata": request.include_metadata,
                },
            )

            processing_time = int((time.time() - start) * 1000)

            # Convert dict result to protobuf
            document = self._dict_to_portable_text(result)

            return conversion_service_pb2.ImportMarkdownResponse(
                document=document,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Markdown import failed: {str(e)}")
            return conversion_service_pb2.ImportMarkdownResponse()

    def ImportHTML(
        self, request: conversion_service_pb2.ImportHTMLRequest, context
    ) -> conversion_service_pb2.ImportHTMLResponse:
        """Import HTML to Portable Text."""
        try:
            start = time.time()

            result = self.html_importer.import_html(html=request.content, options={})

            processing_time = int((time.time() - start) * 1000)

            # Convert dict result to protobuf
            document = self._dict_to_portable_text(result)

            return conversion_service_pb2.ImportHTMLResponse(
                document=document,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"HTML import failed: {str(e)}")
            return conversion_service_pb2.ImportHTMLResponse()

    def ExportHTML(
        self, request: conversion_service_pb2.ExportHTMLRequest, context
    ) -> conversion_service_pb2.ExportHTMLResponse:
        """Export Portable Text to HTML."""
        try:
            start = time.time()

            document = self._portable_text_to_dict(request.document)

            html = self.html_exporter.export_html(
                document=document,
                options={
                    "include_styles": request.include_styles,
                    "include_metadata": request.include_metadata,
                    "class_name": request.class_name,
                    "title": request.title if request.title else None,
                },
            )

            processing_time = int((time.time() - start) * 1000)

            return conversion_service_pb2.ExportHTMLResponse(
                html=html,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"HTML export failed: {str(e)}")
            return conversion_service_pb2.ExportHTMLResponse()

    def ExportMarkdown(
        self, request: conversion_service_pb2.ExportMarkdownRequest, context
    ) -> conversion_service_pb2.ExportMarkdownResponse:
        """Export Portable Text to Markdown."""
        try:
            start = time.time()

            document = self._portable_text_to_dict(request.document)

            markdown = self.markdown_exporter.export_markdown(
                document=document,
                options={
                    "include_metadata": request.include_metadata,
                },
            )

            processing_time = int((time.time() - start) * 1000)

            return conversion_service_pb2.ExportMarkdownResponse(
                markdown=markdown,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Markdown export failed: {str(e)}")
            return conversion_service_pb2.ExportMarkdownResponse()

    def ExportNotion(
        self, request: conversion_service_pb2.ExportNotionRequest, context
    ) -> conversion_service_pb2.ExportNotionResponse:
        """Export Portable Text to Notion JSON."""
        try:
            start = time.time()

            document = self._portable_text_to_dict(request.document)

            notion_json = self.notion_exporter.export_notion(
                document=document,
                options={
                    "pretty_print": request.pretty_print,
                },
            )

            processing_time = int((time.time() - start) * 1000)

            return conversion_service_pb2.ExportNotionResponse(
                json=notion_json,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Notion export failed: {str(e)}")
            return conversion_service_pb2.ExportNotionResponse()

    def ExportRoam(
        self, request: conversion_service_pb2.ExportRoamRequest, context
    ) -> conversion_service_pb2.ExportRoamResponse:
        """Export Portable Text to Roam JSON."""
        try:
            start = time.time()

            document = self._portable_text_to_dict(request.document)

            roam_json = self.roam_exporter.export_roam(
                document=document,
                options={
                    "pretty_print": request.pretty_print,
                },
            )

            processing_time = int((time.time() - start) * 1000)

            return conversion_service_pb2.ExportRoamResponse(
                json=roam_json,
                processing_time_ms=processing_time,
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Roam export failed: {str(e)}")
            return conversion_service_pb2.ExportRoamResponse()

    def BatchExport(
        self, request: conversion_service_pb2.BatchExportRequest, context
    ) -> Iterator[conversion_service_pb2.BatchExportResult]:
        """Export multiple documents in parallel (streaming response)."""
        try:
            # Convert protobuf documents to dicts
            documents = [self._portable_text_to_dict(doc) for doc in request.documents]

            # Map protobuf enum to string format
            format_map = {
                conversion_service_pb2.EXPORT_FORMAT_MARKDOWN: "markdown",
                conversion_service_pb2.EXPORT_FORMAT_HTML: "html",
                conversion_service_pb2.EXPORT_FORMAT_NOTION: "notion",
                conversion_service_pb2.EXPORT_FORMAT_ROAM: "roam",
            }
            format_str = format_map.get(
                request.format, "markdown"
            )  # Default to markdown

            # Execute batch export
            result = self.batch_processor.export_batch(
                documents=documents, format=format_str, options=dict(request.options)
            )

            # Stream individual results
            for idx, export_result in enumerate(result["results"]):
                yield conversion_service_pb2.BatchExportResult(
                    index=export_result["index"],
                    success=export_result["success"],
                    output=export_result.get("output", ""),
                    processing_time_ms=export_result["processingTime"],
                    error="",
                )

            # Stream errors
            for error in result["errors"]:
                yield conversion_service_pb2.BatchExportResult(
                    index=error["index"],
                    success=False,
                    output="",
                    processing_time_ms=0,
                    error=error["error"],
                )

            # Send final summary
            summary = conversion_service_pb2.BatchExportSummary(
                total_documents=result["totalDocuments"],
                successful=result["successful"],
                failed=result["failed"],
                total_processing_time_ms=result["totalProcessingTime"],
                average_processing_time_ms=result["averageProcessingTime"],
                parallel_speedup=result["parallelSpeedup"],
            )

            yield conversion_service_pb2.BatchExportResult(summary=summary)

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Batch export failed: {str(e)}")
            yield conversion_service_pb2.BatchExportResult(
                index=0, success=False, error=str(e)
            )
