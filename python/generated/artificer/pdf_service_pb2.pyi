from artificer import common_pb2 as _common_pb2
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class ExtractTextRequest(_message.Message):
    __slots__ = ("pdf_data",)
    PDF_DATA_FIELD_NUMBER: _ClassVar[int]
    pdf_data: bytes
    def __init__(self, pdf_data: _Optional[bytes] = ...) -> None: ...

class ExtractTextResponse(_message.Message):
    __slots__ = ("text", "metadata")
    TEXT_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    text: str
    metadata: PDFMetadata
    def __init__(self, text: _Optional[str] = ..., metadata: _Optional[_Union[PDFMetadata, _Mapping]] = ...) -> None: ...

class ProcessPDFRequest(_message.Message):
    __slots__ = ("pdf_data", "force_ocr", "min_text_threshold")
    PDF_DATA_FIELD_NUMBER: _ClassVar[int]
    FORCE_OCR_FIELD_NUMBER: _ClassVar[int]
    MIN_TEXT_THRESHOLD_FIELD_NUMBER: _ClassVar[int]
    pdf_data: bytes
    force_ocr: bool
    min_text_threshold: int
    def __init__(self, pdf_data: _Optional[bytes] = ..., force_ocr: bool = ..., min_text_threshold: _Optional[int] = ...) -> None: ...

class ProcessPDFResponse(_message.Message):
    __slots__ = ("text", "metadata")
    TEXT_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    text: str
    metadata: PDFMetadata
    def __init__(self, text: _Optional[str] = ..., metadata: _Optional[_Union[PDFMetadata, _Mapping]] = ...) -> None: ...

class CheckNeedsOCRRequest(_message.Message):
    __slots__ = ("pdf_data", "min_text_threshold")
    PDF_DATA_FIELD_NUMBER: _ClassVar[int]
    MIN_TEXT_THRESHOLD_FIELD_NUMBER: _ClassVar[int]
    pdf_data: bytes
    min_text_threshold: int
    def __init__(self, pdf_data: _Optional[bytes] = ..., min_text_threshold: _Optional[int] = ...) -> None: ...

class CheckNeedsOCRResponse(_message.Message):
    __slots__ = ("needs_ocr", "has_text_content", "pages", "text_length", "avg_text_per_page", "estimated_ocr_cost")
    NEEDS_OCR_FIELD_NUMBER: _ClassVar[int]
    HAS_TEXT_CONTENT_FIELD_NUMBER: _ClassVar[int]
    PAGES_FIELD_NUMBER: _ClassVar[int]
    TEXT_LENGTH_FIELD_NUMBER: _ClassVar[int]
    AVG_TEXT_PER_PAGE_FIELD_NUMBER: _ClassVar[int]
    ESTIMATED_OCR_COST_FIELD_NUMBER: _ClassVar[int]
    needs_ocr: bool
    has_text_content: bool
    pages: int
    text_length: int
    avg_text_per_page: int
    estimated_ocr_cost: float
    def __init__(self, needs_ocr: bool = ..., has_text_content: bool = ..., pages: _Optional[int] = ..., text_length: _Optional[int] = ..., avg_text_per_page: _Optional[int] = ..., estimated_ocr_cost: _Optional[float] = ...) -> None: ...

class ExtractPagesToImagesRequest(_message.Message):
    __slots__ = ("pdf_data", "dpi", "format", "max_width", "max_height")
    PDF_DATA_FIELD_NUMBER: _ClassVar[int]
    DPI_FIELD_NUMBER: _ClassVar[int]
    FORMAT_FIELD_NUMBER: _ClassVar[int]
    MAX_WIDTH_FIELD_NUMBER: _ClassVar[int]
    MAX_HEIGHT_FIELD_NUMBER: _ClassVar[int]
    pdf_data: bytes
    dpi: int
    format: str
    max_width: int
    max_height: int
    def __init__(self, pdf_data: _Optional[bytes] = ..., dpi: _Optional[int] = ..., format: _Optional[str] = ..., max_width: _Optional[int] = ..., max_height: _Optional[int] = ...) -> None: ...

class PageImage(_message.Message):
    __slots__ = ("page_number", "image_data", "content_type", "width", "height", "size_bytes", "format")
    PAGE_NUMBER_FIELD_NUMBER: _ClassVar[int]
    IMAGE_DATA_FIELD_NUMBER: _ClassVar[int]
    CONTENT_TYPE_FIELD_NUMBER: _ClassVar[int]
    WIDTH_FIELD_NUMBER: _ClassVar[int]
    HEIGHT_FIELD_NUMBER: _ClassVar[int]
    SIZE_BYTES_FIELD_NUMBER: _ClassVar[int]
    FORMAT_FIELD_NUMBER: _ClassVar[int]
    page_number: int
    image_data: bytes
    content_type: str
    width: int
    height: int
    size_bytes: int
    format: str
    def __init__(self, page_number: _Optional[int] = ..., image_data: _Optional[bytes] = ..., content_type: _Optional[str] = ..., width: _Optional[int] = ..., height: _Optional[int] = ..., size_bytes: _Optional[int] = ..., format: _Optional[str] = ...) -> None: ...

class PDFMetadata(_message.Message):
    __slots__ = ("pages", "method", "has_text_content", "processing_time_ms", "title", "author", "creator")
    PAGES_FIELD_NUMBER: _ClassVar[int]
    METHOD_FIELD_NUMBER: _ClassVar[int]
    HAS_TEXT_CONTENT_FIELD_NUMBER: _ClassVar[int]
    PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    TITLE_FIELD_NUMBER: _ClassVar[int]
    AUTHOR_FIELD_NUMBER: _ClassVar[int]
    CREATOR_FIELD_NUMBER: _ClassVar[int]
    pages: int
    method: str
    has_text_content: bool
    processing_time_ms: int
    title: str
    author: str
    creator: str
    def __init__(self, pages: _Optional[int] = ..., method: _Optional[str] = ..., has_text_content: bool = ..., processing_time_ms: _Optional[int] = ..., title: _Optional[str] = ..., author: _Optional[str] = ..., creator: _Optional[str] = ...) -> None: ...
