"""
gRPC TextService implementation.

Handles text processing operations via gRPC.
"""

import sys
from pathlib import Path

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "generated"))

import grpc
from generated.artificer import text_service_pb2
from generated.artificer import text_service_pb2_grpc
from processors.text import TextProcessor


class TextServiceHandler(text_service_pb2_grpc.TextServiceServicer):
    """gRPC handler for text processing operations."""

    def __init__(self):
        """Initialize text service with processor."""
        self.text_processor = TextProcessor()

    def ChunkDocument(
        self, request: text_service_pb2.ChunkDocumentRequest, context
    ) -> text_service_pb2.ChunkDocumentResponse:
        """Chunk a document into overlapping segments."""
        try:
            chunks = self.text_processor.chunk_document(
                document_id=request.document_id,
                project_id=request.project_id,
                content=request.content,
                filename=request.filename,
                chunk_size=request.chunk_size,
                chunk_overlap=request.chunk_overlap,
                separators=list(request.separators) if request.separators else None,
            )

            # Convert to protobuf chunks
            chunk_messages = []
            for chunk in chunks:
                metadata = text_service_pb2.ChunkMetadata(
                    filename=chunk["metadata"]["filename"],
                    chunk_index=chunk["metadata"]["chunk_index"],
                    total_chunks=chunk["metadata"]["total_chunks"],
                    start_char=chunk["metadata"]["start_char"],
                    end_char=chunk["metadata"]["end_char"],
                )

                chunk_message = text_service_pb2.DocumentChunk(
                    id=chunk["id"],
                    document_id=chunk["document_id"],
                    project_id=chunk["project_id"],
                    content=chunk["content"],
                    metadata=metadata,
                )
                chunk_messages.append(chunk_message)

            return text_service_pb2.ChunkDocumentResponse(
                chunks=chunk_messages, total_chunks=len(chunk_messages)
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Document chunking failed: {str(e)}")
            return text_service_pb2.ChunkDocumentResponse()

    def ChunkDocumentsBatch(
        self, request: text_service_pb2.ChunkDocumentsBatchRequest, context
    ) -> text_service_pb2.ChunkDocumentsBatchResponse:
        """Chunk multiple documents in batch."""
        try:
            import time

            start = time.time()

            # Convert protobuf documents to dicts
            documents = [
                {
                    "document_id": doc.document_id,
                    "project_id": doc.project_id,
                    "content": doc.content,
                    "filename": doc.filename,
                }
                for doc in request.documents
            ]

            # Process batch
            chunks_map = self.text_processor.chunk_documents_batch(
                documents=documents,
                chunk_size=request.chunk_size,
                chunk_overlap=request.chunk_overlap,
                separators=list(request.separators) if request.separators else None,
            )

            processing_time = int((time.time() - start) * 1000)

            # Convert to protobuf
            result_map = {}
            for doc_id, chunks in chunks_map.items():
                chunk_messages = []
                for chunk in chunks:
                    metadata = text_service_pb2.ChunkMetadata(
                        filename=chunk["metadata"]["filename"],
                        chunk_index=chunk["metadata"]["chunk_index"],
                        total_chunks=chunk["metadata"]["total_chunks"],
                        start_char=chunk["metadata"]["start_char"],
                        end_char=chunk["metadata"]["end_char"],
                    )
                    chunk_message = text_service_pb2.DocumentChunk(
                        id=chunk["id"],
                        document_id=chunk["document_id"],
                        project_id=chunk["project_id"],
                        content=chunk["content"],
                        metadata=metadata,
                    )
                    chunk_messages.append(chunk_message)

                result_map[doc_id] = text_service_pb2.DocumentChunks(
                    chunks=chunk_messages
                )

            return text_service_pb2.ChunkDocumentsBatchResponse(
                chunks_map=result_map,
                total_documents=len(result_map),
                processing_time_ms=processing_time,
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Batch chunking failed: {str(e)}")
            return text_service_pb2.ChunkDocumentsBatchResponse()

    def CountTokens(
        self, request: text_service_pb2.CountTokensRequest, context
    ) -> text_service_pb2.CountTokensResponse:
        """Count tokens in text content."""
        try:
            result = self.text_processor.count_tokens(
                content=request.content, model=request.model
            )

            return text_service_pb2.CountTokensResponse(
                token_count=result["token_count"],
                model=result["model"],
                processing_time_ms=result["processing_time_ms"],
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Token counting failed: {str(e)}")
            return text_service_pb2.CountTokensResponse()

    def CountConversationTokens(
        self, request: text_service_pb2.CountConversationTokensRequest, context
    ) -> text_service_pb2.CountConversationTokensResponse:
        """Count tokens in a conversation with message overhead."""
        try:
            # Convert protobuf messages to dicts
            messages = [
                {"role": msg.role, "content": msg.content} for msg in request.messages
            ]

            result = self.text_processor.count_conversation_tokens(
                messages=messages,
                model=request.model,
                message_overhead=request.message_overhead,
                conversation_overhead=request.conversation_overhead,
            )

            # Convert token breakdown to protobuf
            message_tokens = [
                text_service_pb2.MessageTokenBreakdown(
                    content_tokens=mt["content_tokens"],
                    role_tokens=mt["role_tokens"],
                    total_tokens=mt["total_tokens"],
                )
                for mt in result["message_tokens"]
            ]

            return text_service_pb2.CountConversationTokensResponse(
                total_tokens=result["total_tokens"],
                message_count=result["message_count"],
                message_tokens=message_tokens,
                model=result["model"],
                processing_time_ms=result["processing_time_ms"],
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Conversation token counting failed: {str(e)}")
            return text_service_pb2.CountConversationTokensResponse()

    def EstimateMessageFit(
        self, request: text_service_pb2.EstimateMessageFitRequest, context
    ) -> text_service_pb2.EstimateMessageFitResponse:
        """Estimate how many messages fit within token budget."""
        try:
            # Convert protobuf messages to dicts
            messages = [
                {"role": msg.role, "content": msg.content} for msg in request.messages
            ]

            result = self.text_processor.estimate_message_fit(
                messages=messages,
                max_tokens=request.max_tokens,
                model=request.model,
                message_overhead=request.message_overhead,
                conversation_overhead=request.conversation_overhead,
            )

            return text_service_pb2.EstimateMessageFitResponse(
                count=result["count"],
                total_tokens=result["total_tokens"],
                max_tokens=result["max_tokens"],
                model=result["model"],
                processing_time_ms=result["processing_time_ms"],
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Message fit estimation failed: {str(e)}")
            return text_service_pb2.EstimateMessageFitResponse()

    def CalculateContextWindow(
        self, request: text_service_pb2.CalculateContextWindowRequest, context
    ) -> text_service_pb2.CalculateContextWindowResponse:
        """Calculate optimal context window configuration."""
        try:
            result = self.text_processor.calculate_context_window(
                model_context_window=request.model_context_window,
                output_tokens=request.output_tokens,
                system_tokens=request.system_tokens,
            )

            return text_service_pb2.CalculateContextWindowResponse(
                model_context_window=result["model_context_window"],
                reserved_for_output=result["reserved_for_output"],
                reserved_for_system=result["reserved_for_system"],
                available_for_history=result["available_for_history"],
                recent_messages_window=result["recent_messages_window"],
                summary_window=result["summary_window"],
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Context window calculation failed: {str(e)}")
            return text_service_pb2.CalculateContextWindowResponse()
