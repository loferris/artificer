from artificer import common_pb2 as _common_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class ExtractTextFromImageRequest(_message.Message):
    __slots__ = ("image_data", "content_type")
    IMAGE_DATA_FIELD_NUMBER: _ClassVar[int]
    CONTENT_TYPE_FIELD_NUMBER: _ClassVar[int]
    image_data: bytes
    content_type: str
    def __init__(self, image_data: _Optional[bytes] = ..., content_type: _Optional[str] = ...) -> None: ...

class ExtractTextFromImageResponse(_message.Message):
    __slots__ = ("text", "confidence", "metadata")
    TEXT_FIELD_NUMBER: _ClassVar[int]
    CONFIDENCE_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    text: str
    confidence: float
    metadata: OCRMetadata
    def __init__(self, text: _Optional[str] = ..., confidence: _Optional[float] = ..., metadata: _Optional[_Union[OCRMetadata, _Mapping]] = ...) -> None: ...

class ConvertImageRequest(_message.Message):
    __slots__ = ("image_data", "output_format", "max_width", "max_height", "quality")
    IMAGE_DATA_FIELD_NUMBER: _ClassVar[int]
    OUTPUT_FORMAT_FIELD_NUMBER: _ClassVar[int]
    MAX_WIDTH_FIELD_NUMBER: _ClassVar[int]
    MAX_HEIGHT_FIELD_NUMBER: _ClassVar[int]
    QUALITY_FIELD_NUMBER: _ClassVar[int]
    image_data: bytes
    output_format: str
    max_width: int
    max_height: int
    quality: int
    def __init__(self, image_data: _Optional[bytes] = ..., output_format: _Optional[str] = ..., max_width: _Optional[int] = ..., max_height: _Optional[int] = ..., quality: _Optional[int] = ...) -> None: ...

class ConvertImageResponse(_message.Message):
    __slots__ = ("image_data", "content_type", "width", "height", "size_bytes", "format", "processing_time_ms")
    IMAGE_DATA_FIELD_NUMBER: _ClassVar[int]
    CONTENT_TYPE_FIELD_NUMBER: _ClassVar[int]
    WIDTH_FIELD_NUMBER: _ClassVar[int]
    HEIGHT_FIELD_NUMBER: _ClassVar[int]
    SIZE_BYTES_FIELD_NUMBER: _ClassVar[int]
    FORMAT_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    image_data: bytes
    content_type: str
    width: int
    height: int
    size_bytes: int
    format: str
    processing_time_ms: int
    def __init__(self, image_data: _Optional[bytes] = ..., content_type: _Optional[str] = ..., width: _Optional[int] = ..., height: _Optional[int] = ..., size_bytes: _Optional[int] = ..., format: _Optional[str] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class OCRMetadata(_message.Message):
    __slots__ = ("processing_time_ms", "provider", "model", "tokens_used", "cost")
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    PROVIDER_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    TOKENS_USED_FIELD_NUMBER: _ClassVar[int]
    COST_FIELD_NUMBER: _ClassVar[int]
    processing_time_ms: int
    provider: str
    model: str
    tokens_used: int
    cost: float
    def __init__(self, processing_time_ms: _Optional[int] = ..., provider: _Optional[str] = ..., model: _Optional[str] = ..., tokens_used: _Optional[int] = ..., cost: _Optional[float] = ...) -> None: ...
