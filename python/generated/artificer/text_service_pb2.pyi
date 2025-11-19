from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class ChunkDocumentRequest(_message.Message):
    __slots__ = ("document_id", "project_id", "content", "filename", "chunk_size", "chunk_overlap", "separators")
    DOCUMENT_ID_FIELD_NUMBER: _ClassVar[int]
    PROJECT_ID_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    FILENAME_FIELD_NUMBER: _ClassVar[int]
    CHUNK_SIZE_FIELD_NUMBER: _ClassVar[int]
    CHUNK_OVERLAP_FIELD_NUMBER: _ClassVar[int]
    SEPARATORS_FIELD_NUMBER: _ClassVar[int]
    document_id: str
    project_id: str
    content: str
    filename: str
    chunk_size: int
    chunk_overlap: int
    separators: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, document_id: _Optional[str] = ..., project_id: _Optional[str] = ..., content: _Optional[str] = ..., filename: _Optional[str] = ..., chunk_size: _Optional[int] = ..., chunk_overlap: _Optional[int] = ..., separators: _Optional[_Iterable[str]] = ...) -> None: ...

class ChunkDocumentResponse(_message.Message):
    __slots__ = ("chunks", "total_chunks")
    CHUNKS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_CHUNKS_FIELD_NUMBER: _ClassVar[int]
    chunks: _containers.RepeatedCompositeFieldContainer[DocumentChunk]
    total_chunks: int
    def __init__(self, chunks: _Optional[_Iterable[_Union[DocumentChunk, _Mapping]]] = ..., total_chunks: _Optional[int] = ...) -> None: ...

class ChunkDocumentsBatchRequest(_message.Message):
    __slots__ = ("documents", "chunk_size", "chunk_overlap", "separators")
    DOCUMENTS_FIELD_NUMBER: _ClassVar[int]
    CHUNK_SIZE_FIELD_NUMBER: _ClassVar[int]
    CHUNK_OVERLAP_FIELD_NUMBER: _ClassVar[int]
    SEPARATORS_FIELD_NUMBER: _ClassVar[int]
    documents: _containers.RepeatedCompositeFieldContainer[DocumentInput]
    chunk_size: int
    chunk_overlap: int
    separators: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, documents: _Optional[_Iterable[_Union[DocumentInput, _Mapping]]] = ..., chunk_size: _Optional[int] = ..., chunk_overlap: _Optional[int] = ..., separators: _Optional[_Iterable[str]] = ...) -> None: ...

class ChunkDocumentsBatchResponse(_message.Message):
    __slots__ = ("chunks_map", "total_documents", "processing_time_ms")
    class ChunksMapEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: DocumentChunks
        def __init__(self, key: _Optional[str] = ..., value: _Optional[_Union[DocumentChunks, _Mapping]] = ...) -> None: ...
    CHUNKS_MAP_FIELD_NUMBER: _ClassVar[int]
    TOTAL_DOCUMENTS_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    chunks_map: _containers.MessageMap[str, DocumentChunks]
    total_documents: int
    processing_time_ms: int
    def __init__(self, chunks_map: _Optional[_Mapping[str, DocumentChunks]] = ..., total_documents: _Optional[int] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class DocumentInput(_message.Message):
    __slots__ = ("document_id", "project_id", "content", "filename")
    DOCUMENT_ID_FIELD_NUMBER: _ClassVar[int]
    PROJECT_ID_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    FILENAME_FIELD_NUMBER: _ClassVar[int]
    document_id: str
    project_id: str
    content: str
    filename: str
    def __init__(self, document_id: _Optional[str] = ..., project_id: _Optional[str] = ..., content: _Optional[str] = ..., filename: _Optional[str] = ...) -> None: ...

class DocumentChunks(_message.Message):
    __slots__ = ("chunks",)
    CHUNKS_FIELD_NUMBER: _ClassVar[int]
    chunks: _containers.RepeatedCompositeFieldContainer[DocumentChunk]
    def __init__(self, chunks: _Optional[_Iterable[_Union[DocumentChunk, _Mapping]]] = ...) -> None: ...

class DocumentChunk(_message.Message):
    __slots__ = ("id", "document_id", "project_id", "content", "metadata")
    ID_FIELD_NUMBER: _ClassVar[int]
    DOCUMENT_ID_FIELD_NUMBER: _ClassVar[int]
    PROJECT_ID_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    id: str
    document_id: str
    project_id: str
    content: str
    metadata: ChunkMetadata
    def __init__(self, id: _Optional[str] = ..., document_id: _Optional[str] = ..., project_id: _Optional[str] = ..., content: _Optional[str] = ..., metadata: _Optional[_Union[ChunkMetadata, _Mapping]] = ...) -> None: ...

class ChunkMetadata(_message.Message):
    __slots__ = ("filename", "chunk_index", "total_chunks", "start_char", "end_char")
    FILENAME_FIELD_NUMBER: _ClassVar[int]
    CHUNK_INDEX_FIELD_NUMBER: _ClassVar[int]
    TOTAL_CHUNKS_FIELD_NUMBER: _ClassVar[int]
    START_CHAR_FIELD_NUMBER: _ClassVar[int]
    END_CHAR_FIELD_NUMBER: _ClassVar[int]
    filename: str
    chunk_index: int
    total_chunks: int
    start_char: int
    end_char: int
    def __init__(self, filename: _Optional[str] = ..., chunk_index: _Optional[int] = ..., total_chunks: _Optional[int] = ..., start_char: _Optional[int] = ..., end_char: _Optional[int] = ...) -> None: ...

class CountTokensRequest(_message.Message):
    __slots__ = ("content", "model")
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    content: str
    model: str
    def __init__(self, content: _Optional[str] = ..., model: _Optional[str] = ...) -> None: ...

class CountTokensResponse(_message.Message):
    __slots__ = ("token_count", "model", "processing_time_ms")
    TOKEN_COUNT_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    token_count: int
    model: str
    processing_time_ms: int
    def __init__(self, token_count: _Optional[int] = ..., model: _Optional[str] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class CountConversationTokensRequest(_message.Message):
    __slots__ = ("messages", "model", "message_overhead", "conversation_overhead")
    MESSAGES_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_OVERHEAD_FIELD_NUMBER: _ClassVar[int]
    CONVERSATION_OVERHEAD_FIELD_NUMBER: _ClassVar[int]
    messages: _containers.RepeatedCompositeFieldContainer[Message]
    model: str
    message_overhead: int
    conversation_overhead: int
    def __init__(self, messages: _Optional[_Iterable[_Union[Message, _Mapping]]] = ..., model: _Optional[str] = ..., message_overhead: _Optional[int] = ..., conversation_overhead: _Optional[int] = ...) -> None: ...

class CountConversationTokensResponse(_message.Message):
    __slots__ = ("total_tokens", "message_count", "message_tokens", "model", "processing_time_ms")
    TOTAL_TOKENS_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_COUNT_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_TOKENS_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    total_tokens: int
    message_count: int
    message_tokens: _containers.RepeatedCompositeFieldContainer[MessageTokenBreakdown]
    model: str
    processing_time_ms: int
    def __init__(self, total_tokens: _Optional[int] = ..., message_count: _Optional[int] = ..., message_tokens: _Optional[_Iterable[_Union[MessageTokenBreakdown, _Mapping]]] = ..., model: _Optional[str] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class Message(_message.Message):
    __slots__ = ("role", "content")
    ROLE_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    role: str
    content: str
    def __init__(self, role: _Optional[str] = ..., content: _Optional[str] = ...) -> None: ...

class MessageTokenBreakdown(_message.Message):
    __slots__ = ("content_tokens", "role_tokens", "total_tokens")
    CONTENT_TOKENS_FIELD_NUMBER: _ClassVar[int]
    ROLE_TOKENS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_TOKENS_FIELD_NUMBER: _ClassVar[int]
    content_tokens: int
    role_tokens: int
    total_tokens: int
    def __init__(self, content_tokens: _Optional[int] = ..., role_tokens: _Optional[int] = ..., total_tokens: _Optional[int] = ...) -> None: ...

class EstimateMessageFitRequest(_message.Message):
    __slots__ = ("messages", "max_tokens", "model", "message_overhead", "conversation_overhead")
    MESSAGES_FIELD_NUMBER: _ClassVar[int]
    MAX_TOKENS_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_OVERHEAD_FIELD_NUMBER: _ClassVar[int]
    CONVERSATION_OVERHEAD_FIELD_NUMBER: _ClassVar[int]
    messages: _containers.RepeatedCompositeFieldContainer[Message]
    max_tokens: int
    model: str
    message_overhead: int
    conversation_overhead: int
    def __init__(self, messages: _Optional[_Iterable[_Union[Message, _Mapping]]] = ..., max_tokens: _Optional[int] = ..., model: _Optional[str] = ..., message_overhead: _Optional[int] = ..., conversation_overhead: _Optional[int] = ...) -> None: ...

class EstimateMessageFitResponse(_message.Message):
    __slots__ = ("count", "total_tokens", "max_tokens", "model", "processing_time_ms")
    COUNT_FIELD_NUMBER: _ClassVar[int]
    TOTAL_TOKENS_FIELD_NUMBER: _ClassVar[int]
    MAX_TOKENS_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    count: int
    total_tokens: int
    max_tokens: int
    model: str
    processing_time_ms: int
    def __init__(self, count: _Optional[int] = ..., total_tokens: _Optional[int] = ..., max_tokens: _Optional[int] = ..., model: _Optional[str] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class CalculateContextWindowRequest(_message.Message):
    __slots__ = ("model_context_window", "output_tokens", "system_tokens")
    MODEL_CONTEXT_WINDOW_FIELD_NUMBER: _ClassVar[int]
    OUTPUT_TOKENS_FIELD_NUMBER: _ClassVar[int]
    SYSTEM_TOKENS_FIELD_NUMBER: _ClassVar[int]
    model_context_window: int
    output_tokens: int
    system_tokens: int
    def __init__(self, model_context_window: _Optional[int] = ..., output_tokens: _Optional[int] = ..., system_tokens: _Optional[int] = ...) -> None: ...

class CalculateContextWindowResponse(_message.Message):
    __slots__ = ("model_context_window", "reserved_for_output", "reserved_for_system", "available_for_history", "recent_messages_window", "summary_window")
    MODEL_CONTEXT_WINDOW_FIELD_NUMBER: _ClassVar[int]
    RESERVED_FOR_OUTPUT_FIELD_NUMBER: _ClassVar[int]
    RESERVED_FOR_SYSTEM_FIELD_NUMBER: _ClassVar[int]
    AVAILABLE_FOR_HISTORY_FIELD_NUMBER: _ClassVar[int]
    RECENT_MESSAGES_WINDOW_FIELD_NUMBER: _ClassVar[int]
    SUMMARY_WINDOW_FIELD_NUMBER: _ClassVar[int]
    model_context_window: int
    reserved_for_output: int
    reserved_for_system: int
    available_for_history: int
    recent_messages_window: int
    summary_window: int
    def __init__(self, model_context_window: _Optional[int] = ..., reserved_for_output: _Optional[int] = ..., reserved_for_system: _Optional[int] = ..., available_for_history: _Optional[int] = ..., recent_messages_window: _Optional[int] = ..., summary_window: _Optional[int] = ...) -> None: ...
