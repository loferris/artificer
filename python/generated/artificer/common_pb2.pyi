from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class PortableTextDocument(_message.Message):
    __slots__ = ("content", "metadata")
    class MetadataEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    content: _containers.RepeatedCompositeFieldContainer[PortableTextBlock]
    metadata: _containers.ScalarMap[str, str]
    def __init__(self, content: _Optional[_Iterable[_Union[PortableTextBlock, _Mapping]]] = ..., metadata: _Optional[_Mapping[str, str]] = ...) -> None: ...

class PortableTextBlock(_message.Message):
    __slots__ = ("type", "key", "style", "children", "mark_defs", "list_item", "level", "code", "language", "url", "alt", "caption", "rows")
    TYPE_FIELD_NUMBER: _ClassVar[int]
    KEY_FIELD_NUMBER: _ClassVar[int]
    STYLE_FIELD_NUMBER: _ClassVar[int]
    CHILDREN_FIELD_NUMBER: _ClassVar[int]
    MARK_DEFS_FIELD_NUMBER: _ClassVar[int]
    LIST_ITEM_FIELD_NUMBER: _ClassVar[int]
    LEVEL_FIELD_NUMBER: _ClassVar[int]
    CODE_FIELD_NUMBER: _ClassVar[int]
    LANGUAGE_FIELD_NUMBER: _ClassVar[int]
    URL_FIELD_NUMBER: _ClassVar[int]
    ALT_FIELD_NUMBER: _ClassVar[int]
    CAPTION_FIELD_NUMBER: _ClassVar[int]
    ROWS_FIELD_NUMBER: _ClassVar[int]
    type: str
    key: str
    style: str
    children: _containers.RepeatedCompositeFieldContainer[PortableTextSpan]
    mark_defs: _containers.RepeatedCompositeFieldContainer[MarkDefinition]
    list_item: str
    level: int
    code: str
    language: str
    url: str
    alt: str
    caption: str
    rows: _containers.RepeatedCompositeFieldContainer[TableRow]
    def __init__(self, type: _Optional[str] = ..., key: _Optional[str] = ..., style: _Optional[str] = ..., children: _Optional[_Iterable[_Union[PortableTextSpan, _Mapping]]] = ..., mark_defs: _Optional[_Iterable[_Union[MarkDefinition, _Mapping]]] = ..., list_item: _Optional[str] = ..., level: _Optional[int] = ..., code: _Optional[str] = ..., language: _Optional[str] = ..., url: _Optional[str] = ..., alt: _Optional[str] = ..., caption: _Optional[str] = ..., rows: _Optional[_Iterable[_Union[TableRow, _Mapping]]] = ...) -> None: ...

class PortableTextSpan(_message.Message):
    __slots__ = ("type", "key", "text", "marks")
    TYPE_FIELD_NUMBER: _ClassVar[int]
    KEY_FIELD_NUMBER: _ClassVar[int]
    TEXT_FIELD_NUMBER: _ClassVar[int]
    MARKS_FIELD_NUMBER: _ClassVar[int]
    type: str
    key: str
    text: str
    marks: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, type: _Optional[str] = ..., key: _Optional[str] = ..., text: _Optional[str] = ..., marks: _Optional[_Iterable[str]] = ...) -> None: ...

class MarkDefinition(_message.Message):
    __slots__ = ("key", "type", "href")
    KEY_FIELD_NUMBER: _ClassVar[int]
    TYPE_FIELD_NUMBER: _ClassVar[int]
    HREF_FIELD_NUMBER: _ClassVar[int]
    key: str
    type: str
    href: str
    def __init__(self, key: _Optional[str] = ..., type: _Optional[str] = ..., href: _Optional[str] = ...) -> None: ...

class TableRow(_message.Message):
    __slots__ = ("type", "key", "cells")
    TYPE_FIELD_NUMBER: _ClassVar[int]
    KEY_FIELD_NUMBER: _ClassVar[int]
    CELLS_FIELD_NUMBER: _ClassVar[int]
    type: str
    key: str
    cells: _containers.RepeatedCompositeFieldContainer[TableCell]
    def __init__(self, type: _Optional[str] = ..., key: _Optional[str] = ..., cells: _Optional[_Iterable[_Union[TableCell, _Mapping]]] = ...) -> None: ...

class TableCell(_message.Message):
    __slots__ = ("type", "key", "content")
    TYPE_FIELD_NUMBER: _ClassVar[int]
    KEY_FIELD_NUMBER: _ClassVar[int]
    CONTENT_FIELD_NUMBER: _ClassVar[int]
    type: str
    key: str
    content: _containers.RepeatedCompositeFieldContainer[PortableTextSpan]
    def __init__(self, type: _Optional[str] = ..., key: _Optional[str] = ..., content: _Optional[_Iterable[_Union[PortableTextSpan, _Mapping]]] = ...) -> None: ...

class DocumentMetadata(_message.Message):
    __slots__ = ("title", "author", "description", "creator", "custom")
    class CustomEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    TITLE_FIELD_NUMBER: _ClassVar[int]
    AUTHOR_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    CREATOR_FIELD_NUMBER: _ClassVar[int]
    CUSTOM_FIELD_NUMBER: _ClassVar[int]
    title: str
    author: str
    description: str
    creator: str
    custom: _containers.ScalarMap[str, str]
    def __init__(self, title: _Optional[str] = ..., author: _Optional[str] = ..., description: _Optional[str] = ..., creator: _Optional[str] = ..., custom: _Optional[_Mapping[str, str]] = ...) -> None: ...

class ProcessingMetrics(_message.Message):
    __slots__ = ("processing_time_ms", "tokens_used", "cost", "provider", "model")
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    TOKENS_USED_FIELD_NUMBER: _ClassVar[int]
    COST_FIELD_NUMBER: _ClassVar[int]
    PROVIDER_FIELD_NUMBER: _ClassVar[int]
    MODEL_FIELD_NUMBER: _ClassVar[int]
    processing_time_ms: int
    tokens_used: int
    cost: float
    provider: str
    model: str
    def __init__(self, processing_time_ms: _Optional[int] = ..., tokens_used: _Optional[int] = ..., cost: _Optional[float] = ..., provider: _Optional[str] = ..., model: _Optional[str] = ...) -> None: ...

class ErrorDetails(_message.Message):
    __slots__ = ("code", "message", "details")
    class DetailsEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    CODE_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    DETAILS_FIELD_NUMBER: _ClassVar[int]
    code: str
    message: str
    details: _containers.ScalarMap[str, str]
    def __init__(self, code: _Optional[str] = ..., message: _Optional[str] = ..., details: _Optional[_Mapping[str, str]] = ...) -> None: ...
