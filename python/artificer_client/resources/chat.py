"""
Chat resource
"""

from typing import List
from .base import BaseResource
from ..types import Message


class Chat(BaseResource):
    """Chat API resource."""

    def send_message(
        self,
        conversation_id: str,
        content: str
    ) -> dict:
        """
        Send a message and get AI response.

        Args:
            conversation_id: Conversation ID
            content: Message content (1-10,000 characters)

        Returns:
            AI response message

        Example:
            >>> response = client.chat.send_message(
            ...     "conv_123",
            ...     "What is machine learning?"
            ... )
            >>> print(response['message']['content'])
        """
        return self._trpc_request("chat.sendMessage", {
            "conversationId": conversation_id,
            "content": content
        })

    def send_with_orchestration(
        self,
        conversation_id: str,
        content: str
    ) -> dict:
        """
        Send message with intelligent model routing.

        Uses chain orchestration to:
        1. Analyze complexity
        2. Select optimal model (cost vs quality)
        3. Execute with validation
        4. Retry with better model if needed

        Args:
            conversation_id: Conversation ID
            content: Message content

        Returns:
            AI response with chain metadata

        Example:
            >>> response = client.chat.send_with_orchestration(
            ...     "conv_123",
            ...     "Analyze this complex dataset..."
            ... )
            >>> print(f"Model used: {response['chainMetadata']['strategy']}")
            >>> print(f"Cost: ${response['chainMetadata']['cost']:.4f}")
        """
        return self._trpc_request("orchestration.chainChat", {
            "conversationId": conversation_id,
            "content": content
        })

    def get_messages(self, conversation_id: str) -> List[Message]:
        """
        Get all messages in a conversation.

        Args:
            conversation_id: Conversation ID

        Returns:
            List of messages

        Example:
            >>> messages = client.chat.get_messages("conv_123")
            >>> for msg in messages:
            ...     print(f"{msg['role']}: {msg['content'][:50]}...")
        """
        return self._trpc_request("chat.getMessages", {"conversationId": conversation_id})
