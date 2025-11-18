"""
TextClient for text processing operations.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "generated"))

import grpc
from generated.artificer import text_service_pb2
from generated.artificer import text_service_pb2_grpc


class TextClient:
    """Client for text processing operations."""

    def __init__(self, channel: grpc.Channel):
        """
        Initialize text client.

        Args:
            channel: gRPC channel to use for requests
        """
        self.stub = text_service_pb2_grpc.TextServiceStub(channel)

    def chunk_document(
        self,
        document_id: str,
        project_id: str,
        content: str,
        filename: str = "",
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        separators: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Chunk a document into overlapping segments.

        Args:
            document_id: Document identifier
            project_id: Project identifier
            content: Document content to chunk
            filename: Document filename (optional)
            chunk_size: Target chunk size in characters
            chunk_overlap: Overlap between chunks in characters
            separators: Custom separators (default: paragraph/sentence breaks)

        Returns:
            Dictionary with:
            - chunks: List of chunk dictionaries containing:
                - id: Chunk ID
                - document_id: Parent document ID
                - project_id: Project ID
                - content: Chunk content
                - metadata: Chunk metadata (filename, index, position)
            - total_chunks: Total number of chunks
        """
        request = text_service_pb2.ChunkDocumentRequest(
            document_id=document_id,
            project_id=project_id,
            content=content,
            filename=filename,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=separators or [],
        )

        response = self.stub.ChunkDocument(request)

        chunks = []
        for chunk in response.chunks:
            chunks.append(
                {
                    "id": chunk.id,
                    "document_id": chunk.document_id,
                    "project_id": chunk.project_id,
                    "content": chunk.content,
                    "metadata": {
                        "filename": chunk.metadata.filename,
                        "chunk_index": chunk.metadata.chunk_index,
                        "total_chunks": chunk.metadata.total_chunks,
                        "start_char": chunk.metadata.start_char,
                        "end_char": chunk.metadata.end_char,
                    },
                }
            )

        return {"chunks": chunks, "total_chunks": response.total_chunks}

    def chunk_documents_batch(
        self,
        documents: List[Dict[str, str]],
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        separators: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Chunk multiple documents in batch.

        Args:
            documents: List of document dicts with keys:
                - document_id: Document identifier
                - project_id: Project identifier
                - content: Document content
                - filename: Document filename (optional)
            chunk_size: Target chunk size in characters
            chunk_overlap: Overlap between chunks
            separators: Custom separators

        Returns:
            Dictionary with:
            - chunks_map: Dict mapping document_id to list of chunks
            - total_documents: Number of documents processed
            - processing_time_ms: Processing time
        """
        # Convert to protobuf documents
        pb_documents = []
        for doc in documents:
            pb_doc = text_service_pb2.DocumentInput(
                document_id=doc["document_id"],
                project_id=doc["project_id"],
                content=doc["content"],
                filename=doc.get("filename", ""),
            )
            pb_documents.append(pb_doc)

        request = text_service_pb2.ChunkDocumentsBatchRequest(
            documents=pb_documents,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=separators or [],
        )

        response = self.stub.ChunkDocumentsBatch(request)

        # Convert response
        chunks_map = {}
        for doc_id, doc_chunks in response.chunks_map.items():
            chunks = []
            for chunk in doc_chunks.chunks:
                chunks.append(
                    {
                        "id": chunk.id,
                        "document_id": chunk.document_id,
                        "project_id": chunk.project_id,
                        "content": chunk.content,
                        "metadata": {
                            "filename": chunk.metadata.filename,
                            "chunk_index": chunk.metadata.chunk_index,
                            "total_chunks": chunk.metadata.total_chunks,
                            "start_char": chunk.metadata.start_char,
                            "end_char": chunk.metadata.end_char,
                        },
                    }
                )
            chunks_map[doc_id] = chunks

        return {
            "chunks_map": chunks_map,
            "total_documents": response.total_documents,
            "processing_time_ms": response.processing_time_ms,
        }

    def count_tokens(self, content: str, model: str = "gpt-4") -> Dict[str, Any]:
        """
        Count tokens in text content.

        Args:
            content: Text content to count tokens for
            model: Model to use for tokenization (default: 'gpt-4')

        Returns:
            Dictionary with:
            - token_count: Number of tokens
            - model: Model used for counting
            - processing_time_ms: Processing time
        """
        request = text_service_pb2.CountTokensRequest(content=content, model=model)

        response = self.stub.CountTokens(request)

        return {
            "token_count": response.token_count,
            "model": response.model,
            "processing_time_ms": response.processing_time_ms,
        }

    def count_conversation_tokens(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-4",
        message_overhead: int = 3,
        conversation_overhead: int = 3,
    ) -> Dict[str, Any]:
        """
        Count tokens in a conversation with message overhead.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            model: Model to use for tokenization
            message_overhead: Additional tokens per message
            conversation_overhead: Additional tokens for conversation wrapper

        Returns:
            Dictionary with:
            - total_tokens: Total token count
            - message_count: Number of messages
            - message_tokens: Per-message token breakdown
            - model: Model used
            - processing_time_ms: Processing time
        """
        # Convert to protobuf messages
        pb_messages = [
            text_service_pb2.Message(role=msg["role"], content=msg["content"])
            for msg in messages
        ]

        request = text_service_pb2.CountConversationTokensRequest(
            messages=pb_messages,
            model=model,
            message_overhead=message_overhead,
            conversation_overhead=conversation_overhead,
        )

        response = self.stub.CountConversationTokens(request)

        # Convert token breakdown
        message_tokens = [
            {
                "content_tokens": mt.content_tokens,
                "role_tokens": mt.role_tokens,
                "total_tokens": mt.total_tokens,
            }
            for mt in response.message_tokens
        ]

        return {
            "total_tokens": response.total_tokens,
            "message_count": response.message_count,
            "message_tokens": message_tokens,
            "model": response.model,
            "processing_time_ms": response.processing_time_ms,
        }

    def estimate_message_fit(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int,
        model: str = "gpt-4",
        message_overhead: int = 3,
        conversation_overhead: int = 3,
    ) -> Dict[str, Any]:
        """
        Estimate how many messages fit within token budget.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            max_tokens: Maximum token budget
            model: Model to use for tokenization
            message_overhead: Additional tokens per message
            conversation_overhead: Additional tokens for conversation wrapper

        Returns:
            Dictionary with:
            - count: Number of messages that fit
            - total_tokens: Total tokens used by fitting messages
            - max_tokens: Maximum token budget
            - model: Model used
            - processing_time_ms: Processing time
        """
        # Convert to protobuf messages
        pb_messages = [
            text_service_pb2.Message(role=msg["role"], content=msg["content"])
            for msg in messages
        ]

        request = text_service_pb2.EstimateMessageFitRequest(
            messages=pb_messages,
            max_tokens=max_tokens,
            model=model,
            message_overhead=message_overhead,
            conversation_overhead=conversation_overhead,
        )

        response = self.stub.EstimateMessageFit(request)

        return {
            "count": response.count,
            "total_tokens": response.total_tokens,
            "max_tokens": response.max_tokens,
            "model": response.model,
            "processing_time_ms": response.processing_time_ms,
        }

    def calculate_context_window(
        self,
        model_context_window: int,
        output_tokens: int = 4000,
        system_tokens: int = 1000,
    ) -> Dict[str, Any]:
        """
        Calculate optimal context window configuration.

        Determines how to split available tokens between output, system prompt,
        and message history (with 80/20 split for recent vs summary).

        Args:
            model_context_window: Model's total context window
            output_tokens: Tokens reserved for output
            system_tokens: Tokens reserved for system prompt

        Returns:
            Dictionary with:
            - model_context_window: Total context window
            - reserved_for_output: Tokens reserved for output
            - reserved_for_system: Tokens reserved for system
            - available_for_history: Total tokens for message history
            - recent_messages_window: Tokens for recent messages (80%)
            - summary_window: Tokens for summary (20%)
        """
        request = text_service_pb2.CalculateContextWindowRequest(
            model_context_window=model_context_window,
            output_tokens=output_tokens,
            system_tokens=system_tokens,
        )

        response = self.stub.CalculateContextWindow(request)

        return {
            "model_context_window": response.model_context_window,
            "reserved_for_output": response.reserved_for_output,
            "reserved_for_system": response.reserved_for_system,
            "available_for_history": response.available_for_history,
            "recent_messages_window": response.recent_messages_window,
            "summary_window": response.summary_window,
        }
