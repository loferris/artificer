"""
Conversations resource
"""

from typing import List, Optional
from .base import BaseResource
from ..types import Conversation


class Conversations(BaseResource):
    """Conversations API resource."""

    def create(
        self,
        title: str,
        model: str = "gpt-4o",
        project_id: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> dict:
        """
        Create a new conversation.

        Args:
            title: Conversation title
            model: AI model to use (default: gpt-4o)
            project_id: Optional project ID to link conversation
            system_prompt: Optional system prompt
            temperature: Sampling temperature (0-2, default 0.7)
            max_tokens: Maximum tokens per response (1-4000, default 1000)

        Returns:
            Created conversation data

        Example:
            >>> conv = client.conversations.create(
            ...     title="Product Questions",
            ...     model="gpt-4o",
            ...     project_id="proj_123"
            ... )
        """
        input_data = {
            "title": title,
            "model": model,
            "temperature": temperature,
            "maxTokens": max_tokens
        }

        if project_id:
            input_data["projectId"] = project_id
        if system_prompt:
            input_data["systemPrompt"] = system_prompt

        return self._trpc_request("conversations.create", input_data)

    def list(self) -> List[Conversation]:
        """
        List all conversations.

        Returns:
            List of conversations

        Example:
            >>> conversations = client.conversations.list()
            >>> for conv in conversations:
            ...     print(f"{conv['title']}: {conv['messageCount']} messages")
        """
        return self._trpc_request("conversations.list")

    def get(self, conversation_id: str) -> dict:
        """
        Get conversation by ID with all messages.

        Args:
            conversation_id: Conversation ID

        Returns:
            Conversation data with messages

        Example:
            >>> conv = client.conversations.get("conv_123")
            >>> print(f"Messages: {len(conv['messages'])}")
        """
        return self._trpc_request("conversations.getById", {"id": conversation_id})

    def update(
        self,
        conversation_id: str,
        title: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> dict:
        """
        Update conversation settings.

        Args:
            conversation_id: Conversation ID
            title: New title
            temperature: New temperature
            max_tokens: New max tokens
            system_prompt: New system prompt

        Returns:
            Updated conversation data
        """
        data = {"id": conversation_id}
        if title is not None:
            data["title"] = title
        if temperature is not None:
            data["temperature"] = temperature
        if max_tokens is not None:
            data["maxTokens"] = max_tokens
        if system_prompt is not None:
            data["systemPrompt"] = system_prompt

        return self._trpc_request("conversations.update", data)

    def delete(self, conversation_id: str) -> dict:
        """
        Delete a conversation.

        Args:
            conversation_id: Conversation ID

        Returns:
            Deletion confirmation
        """
        return self._trpc_request("conversations.delete", {"id": conversation_id})

    def update_title(self, conversation_id: str) -> dict:
        """
        Auto-generate and update conversation title based on content.

        Args:
            conversation_id: Conversation ID

        Returns:
            Updated conversation with new title

        Example:
            >>> conv = client.conversations.update_title("conv_123")
            >>> print(f"New title: {conv['title']}")
        """
        return self._trpc_request("conversations.updateTitle", {"id": conversation_id})
