"""
ConversionClient for document import/export operations.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List, Iterator, Optional

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "generated"))

import grpc
from generated.artificer import conversion_service_pb2
from generated.artificer import conversion_service_pb2_grpc
from generated.artificer import common_pb2


class ConversionClient:
    """Client for document conversion operations (import/export)."""

    def __init__(self, channel: grpc.Channel):
        """
        Initialize conversion client.

        Args:
            channel: gRPC channel to use for requests
        """
        self.stub = conversion_service_pb2_grpc.ConversionServiceStub(channel)

    def import_markdown(
        self,
        content: str,
        strict_mode: bool = False,
        include_metadata: bool = True,
    ) -> Dict[str, Any]:
        """
        Import markdown to Portable Text.

        Args:
            content: Markdown content to import
            strict_mode: Enable strict parsing mode
            include_metadata: Include metadata in result

        Returns:
            Dictionary with 'document' and 'processing_time_ms'
        """
        request = conversion_service_pb2.ImportMarkdownRequest(
            content=content,
            strict_mode=strict_mode,
            include_metadata=include_metadata,
        )

        response = self.stub.ImportMarkdown(request)

        return {
            "document": self._portable_text_to_dict(response.document),
            "processing_time_ms": response.processing_time_ms,
        }

    def import_html(self, content: str) -> Dict[str, Any]:
        """
        Import HTML to Portable Text.

        Args:
            content: HTML content to import

        Returns:
            Dictionary with 'document' and 'processing_time_ms'
        """
        request = conversion_service_pb2.ImportHTMLRequest(content=content)

        response = self.stub.ImportHTML(request)

        return {
            "document": self._portable_text_to_dict(response.document),
            "processing_time_ms": response.processing_time_ms,
        }

    def export_html(
        self,
        document: Dict[str, Any],
        include_styles: bool = True,
        include_metadata: bool = True,
        class_name: str = "document-content",
        title: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Export Portable Text to HTML.

        Args:
            document: Portable Text document
            include_styles: Include CSS styles
            include_metadata: Include metadata
            class_name: CSS class name for document
            title: Document title

        Returns:
            Dictionary with 'html' and 'processing_time_ms'
        """
        pb_document = self._dict_to_portable_text(document)

        request = conversion_service_pb2.ExportHTMLRequest(
            document=pb_document,
            include_styles=include_styles,
            include_metadata=include_metadata,
            class_name=class_name,
            title=title or "",
        )

        response = self.stub.ExportHTML(request)

        return {
            "html": response.html,
            "processing_time_ms": response.processing_time_ms,
        }

    def export_markdown(
        self,
        document: Dict[str, Any],
        include_metadata: bool = True,
    ) -> Dict[str, Any]:
        """
        Export Portable Text to Markdown.

        Args:
            document: Portable Text document
            include_metadata: Include metadata

        Returns:
            Dictionary with 'markdown' and 'processing_time_ms'
        """
        pb_document = self._dict_to_portable_text(document)

        request = conversion_service_pb2.ExportMarkdownRequest(
            document=pb_document,
            include_metadata=include_metadata,
        )

        response = self.stub.ExportMarkdown(request)

        return {
            "markdown": response.markdown,
            "processing_time_ms": response.processing_time_ms,
        }

    def export_notion(
        self,
        document: Dict[str, Any],
        pretty_print: bool = False,
    ) -> Dict[str, Any]:
        """
        Export Portable Text to Notion JSON.

        Args:
            document: Portable Text document
            pretty_print: Format JSON with indentation

        Returns:
            Dictionary with 'json' and 'processing_time_ms'
        """
        pb_document = self._dict_to_portable_text(document)

        request = conversion_service_pb2.ExportNotionRequest(
            document=pb_document,
            pretty_print=pretty_print,
        )

        response = self.stub.ExportNotion(request)

        return {
            "json": response.json,
            "processing_time_ms": response.processing_time_ms,
        }

    def export_roam(
        self,
        document: Dict[str, Any],
        pretty_print: bool = False,
    ) -> Dict[str, Any]:
        """
        Export Portable Text to Roam JSON.

        Args:
            document: Portable Text document
            pretty_print: Format JSON with indentation

        Returns:
            Dictionary with 'json' and 'processing_time_ms'
        """
        pb_document = self._dict_to_portable_text(document)

        request = conversion_service_pb2.ExportRoamRequest(
            document=pb_document,
            pretty_print=pretty_print,
        )

        response = self.stub.ExportRoam(request)

        return {
            "json": response.json,
            "processing_time_ms": response.processing_time_ms,
        }

    def batch_export(
        self,
        documents: List[Dict[str, Any]],
        format: str,  # "markdown", "html", "notion", "roam"
        options: Optional[Dict[str, Any]] = None,
    ) -> Iterator[Dict[str, Any]]:
        """
        Export multiple documents in parallel (streaming).

        Args:
            documents: List of Portable Text documents
            format: Export format ("markdown", "html", "notion", "roam")
            options: Format-specific options

        Yields:
            Dictionary for each result with 'index', 'success', 'output', etc.
        """
        # Convert documents to protobuf
        pb_documents = [self._dict_to_portable_text(doc) for doc in documents]

        # Map format string to enum
        format_map = {
            "markdown": conversion_service_pb2.EXPORT_FORMAT_MARKDOWN,
            "html": conversion_service_pb2.EXPORT_FORMAT_HTML,
            "notion": conversion_service_pb2.EXPORT_FORMAT_NOTION,
            "roam": conversion_service_pb2.EXPORT_FORMAT_ROAM,
        }

        request = conversion_service_pb2.BatchExportRequest(
            documents=pb_documents,
            format=format_map.get(format, conversion_service_pb2.EXPORT_FORMAT_MARKDOWN),
            options=options or {},
        )

        # Stream results
        for response in self.stub.BatchExport(request):
            if response.HasField("summary"):
                # Final summary message
                yield {
                    "summary": {
                        "total_documents": response.summary.total_documents,
                        "successful": response.summary.successful,
                        "failed": response.summary.failed,
                        "total_processing_time_ms": response.summary.total_processing_time_ms,
                        "average_processing_time_ms": response.summary.average_processing_time_ms,
                        "parallel_speedup": response.summary.parallel_speedup,
                    }
                }
            else:
                # Individual result
                yield {
                    "index": response.index,
                    "success": response.success,
                    "output": response.output,
                    "processing_time_ms": response.processing_time_ms,
                    "error": response.error,
                }

    def _portable_text_to_dict(self, pb_doc: common_pb2.PortableTextDocument) -> Dict[str, Any]:
        """Convert protobuf PortableTextDocument to dict."""
        content = []

        for block in pb_doc.content:
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
            "metadata": dict(pb_doc.metadata) if pb_doc.metadata else {},
        }

    def _dict_to_portable_text(self, data: Dict[str, Any]) -> common_pb2.PortableTextDocument:
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

                for child in block_dict.get("children", []):
                    span = common_pb2.PortableTextSpan(
                        type=child.get("_type", "span"),
                        key=child.get("_key", ""),
                        text=child.get("text", ""),
                        marks=child.get("marks", []),
                    )
                    block.children.append(span)

                for mark_def in block_dict.get("markDefs", []):
                    mark = common_pb2.MarkDefinition(
                        key=mark_def.get("_key", ""),
                        type=mark_def.get("_type", ""),
                        href=mark_def.get("href", ""),
                    )
                    block.mark_defs.append(mark)

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
