from artificer import common_pb2 as _common_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class ExportFormat(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    EXPORT_FORMAT_UNSPECIFIED: _ClassVar[ExportFormat]
    EXPORT_FORMAT_MARKDOWN: _ClassVar[ExportFormat]
    EXPORT_FORMAT_HTML: _ClassVar[ExportFormat]
    EXPORT_FORMAT_NOTION: _ClassVar[ExportFormat]
    EXPORT_FORMAT_ROAM: _ClassVar[ExportFormat]
EXPORT_FORMAT_UNSPECIFIED: ExportFormat
EXPORT_FORMAT_MARKDOWN: ExportFormat
EXPORT_FORMAT_HTML: ExportFormat
EXPORT_FORMAT_NOTION: ExportFormat
EXPORT_FORMAT_ROAM: ExportFormat

class ImportMarkdownRequest(_message.Message):
    __slots__ = ("content", "strict_mode", "include_metadata")
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    STRICT_MODE_FIELD_NUMBER: _ClassVar[int]
    INCLUDE_METADATA_FIELD_NUMBER: _ClassVar[int]
    content: str
    strict_mode: bool
    include_metadata: bool
    def __init__(self, content: _Optional[str] = ..., strict_mode: bool = ..., include_metadata: bool = ...) -> None: ...

class ImportMarkdownResponse(_message.Message):
    __slots__ = ("document", "processing_time_ms")
    DOCUMENT_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    document: _common_pb2.PortableTextDocument
    processing_time_ms: int
    def __init__(self, document: _Optional[_Union[_common_pb2.PortableTextDocument, _Mapping]] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class ImportHTMLRequest(_message.Message):
    __slots__ = ("content",)
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    content: str
    def __init__(self, content: _Optional[str] = ...) -> None: ...

class ImportHTMLResponse(_message.Message):
    __slots__ = ("document", "processing_time_ms")
    DOCUMENT_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    document: _common_pb2.PortableTextDocument
    processing_time_ms: int
    def __init__(self, document: _Optional[_Union[_common_pb2.PortableTextDocument, _Mapping]] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class ExportHTMLRequest(_message.Message):
    __slots__ = ("document", "include_styles", "include_metadata", "class_name", "title")
    DOCUMENT_FIELD_NUMBER: _ClassVar[int]
    INCLUDE_STYLES_FIELD_NUMBER: _ClassVar[int]
    INCLUDE_METADATA_FIELD_NUMBER: _ClassVar[int]
    CLASS_NAME_FIELD_NUMBER: _ClassVar[int]
    TITLE_FIELD_NUMBER: _ClassVar[int]
    document: _common_pb2.PortableTextDocument
    include_styles: bool
    include_metadata: bool
    class_name: str
    title: str
    def __init__(self, document: _Optional[_Union[_common_pb2.PortableTextDocument, _Mapping]] = ..., include_styles: bool = ..., include_metadata: bool = ..., class_name: _Optional[str] = ..., title: _Optional[str] = ...) -> None: ...

class ExportHTMLResponse(_message.Message):
    __slots__ = ("html", "processing_time_ms")
    HTML_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    html: str
    processing_time_ms: int
    def __init__(self, html: _Optional[str] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class ExportMarkdownRequest(_message.Message):
    __slots__ = ("document", "include_metadata")
    DOCUMENT_FIELD_NUMBER: _ClassVar[int]
    INCLUDE_METADATA_FIELD_NUMBER: _ClassVar[int]
    document: _common_pb2.PortableTextDocument
    include_metadata: bool
    def __init__(self, document: _Optional[_Union[_common_pb2.PortableTextDocument, _Mapping]] = ..., include_metadata: bool = ...) -> None: ...

class ExportMarkdownResponse(_message.Message):
    __slots__ = ("markdown", "processing_time_ms")
    MARKDOWN_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    markdown: str
    processing_time_ms: int
    def __init__(self, markdown: _Optional[str] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class ExportNotionRequest(_message.Message):
    __slots__ = ("document", "pretty_print")
    DOCUMENT_FIELD_NUMBER: _ClassVar[int]
    PRETTY_PRINT_FIELD_NUMBER: _ClassVar[int]
    document: _common_pb2.PortableTextDocument
    pretty_print: bool
    def __init__(self, document: _Optional[_Union[_common_pb2.PortableTextDocument, _Mapping]] = ..., pretty_print: bool = ...) -> None: ...

class ExportNotionResponse(_message.Message):
    __slots__ = ("json", "processing_time_ms")
    JSON_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    json: str
    processing_time_ms: int
    def __init__(self, json: _Optional[str] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class ExportRoamRequest(_message.Message):
    __slots__ = ("document", "pretty_print")
    DOCUMENT_FIELD_NUMBER: _ClassVar[int]
    PRETTY_PRINT_FIELD_NUMBER: _ClassVar[int]
    document: _common_pb2.PortableTextDocument
    pretty_print: bool
    def __init__(self, document: _Optional[_Union[_common_pb2.PortableTextDocument, _Mapping]] = ..., pretty_print: bool = ...) -> None: ...

class ExportRoamResponse(_message.Message):
    __slots__ = ("json", "processing_time_ms")
    JSON_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    json: str
    processing_time_ms: int
    def __init__(self, json: _Optional[str] = ..., processing_time_ms: _Optional[int] = ...) -> None: ...

class BatchExportRequest(_message.Message):
    __slots__ = ("documents", "format", "options")
    class OptionsEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    DOCUMENTS_FIELD_NUMBER: _ClassVar[int]
    FORMAT_FIELD_NUMBER: _ClassVar[int]
    OPTIONS_FIELD_NUMBER: _ClassVar[int]
    documents: _containers.RepeatedCompositeFieldContainer[_common_pb2.PortableTextDocument]
    format: ExportFormat
    options: _containers.ScalarMap[str, str]
    def __init__(self, documents: _Optional[_Iterable[_Union[_common_pb2.PortableTextDocument, _Mapping]]] = ..., format: _Optional[_Union[ExportFormat, str]] = ..., options: _Optional[_Mapping[str, str]] = ...) -> None: ...

class BatchExportResult(_message.Message):
    __slots__ = ("index", "success", "output", "processing_time_ms", "error", "summary")
    INDEX_FIELD_NUMBER: _ClassVar[int]
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    OUTPUT_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    SUMMARY_FIELD_NUMBER: _ClassVar[int]
    index: int
    success: bool
    output: str
    processing_time_ms: int
    error: str
    summary: BatchExportSummary
    def __init__(self, index: _Optional[int] = ..., success: bool = ..., output: _Optional[str] = ..., processing_time_ms: _Optional[int] = ..., error: _Optional[str] = ..., summary: _Optional[_Union[BatchExportSummary, _Mapping]] = ...) -> None: ...

class BatchExportSummary(_message.Message):
    __slots__ = ("total_documents", "successful", "failed", "total_processing_time_ms", "average_processing_time_ms", "parallel_speedup")
    TOTAL_DOCUMENTS_FIELD_NUMBER: _ClassVar[int]
    SUCCESSFUL_FIELD_NUMBER: _ClassVar[int]
    FAILED_FIELD_NUMBER: _ClassVar[int]
    TOTAL_PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    AVERAGE_PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    PARALLEL_SPEEDUP_FIELD_NUMBER: _ClassVar[int]
    total_documents: int
    successful: int
    failed: int
    total_processing_time_ms: int
    average_processing_time_ms: int
    parallel_speedup: float
    def __init__(self, total_documents: _Optional[int] = ..., successful: _Optional[int] = ..., failed: _Optional[int] = ..., total_processing_time_ms: _Optional[int] = ..., average_processing_time_ms: _Optional[int] = ..., parallel_speedup: _Optional[float] = ...) -> None: ...
