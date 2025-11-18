"""
Export resource
"""

from typing import Optional
from .base import BaseResource
from ..types import ExportFormat, ExportOptions, ExportResult


class Export(BaseResource):
    """Export API resource."""

    def export_conversation(
        self,
        conversation_id: str,
        format: ExportFormat = "markdown",
        include_metadata: bool = True,
        include_timestamps: bool = False,
        include_costs: bool = False
    ) -> ExportResult:
        """
        Export a single conversation to various formats.

        Args:
            conversation_id: Conversation ID
            format: Export format (markdown, notion, roam, obsidian, html, json)
            include_metadata: Include metadata in export
            include_timestamps: Include timestamps
            include_costs: Include cost information

        Returns:
            Exported data

        Example:
            >>> export = client.export.export_conversation(
            ...     "conv_123",
            ...     format="notion",
            ...     include_metadata=True
            ... )
            >>> # Post to Notion API
            >>> notion_blocks = json.loads(export['data'])
        """
        return self._trpc_request("export.exportConversation", {
            "conversationId": conversation_id,
            "format": format,
            "includeMetadata": include_metadata,
            "includeTimestamps": include_timestamps,
            "includeCosts": include_costs
        })

    def export_all(
        self,
        format: ExportFormat = "markdown",
        include_metadata: bool = True,
        include_timestamps: bool = False,
        include_costs: bool = False,
        group_by_conversation: bool = True
    ) -> ExportResult:
        """
        Export all conversations.

        Args:
            format: Export format
            include_metadata: Include metadata
            include_timestamps: Include timestamps
            include_costs: Include cost information
            group_by_conversation: Group by conversation

        Returns:
            Exported data

        Example:
            >>> export = client.export.export_all(
            ...     format="obsidian",
            ...     group_by_conversation=True
            ... )
            >>> with open("conversations.md", "w") as f:
            ...     f.write(export['data'])
        """
        return self._trpc_request("export.exportAll", {
            "format": format,
            "includeMetadata": include_metadata,
            "includeTimestamps": include_timestamps,
            "includeCosts": include_costs,
            "groupByConversation": group_by_conversation
        })

    def get_formats(self) -> dict:
        """
        Get available export formats and their capabilities.

        Returns:
            Available export formats

        Example:
            >>> formats = client.export.get_formats()
            >>> for fmt in formats['formats']:
            ...     print(f"{fmt['name']}: {fmt['description']}")
        """
        return self._trpc_request("export.getFormats")
