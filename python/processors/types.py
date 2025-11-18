"""
Type definitions for Portable Text and document structures.

Provides TypedDict definitions for improved type safety and IDE autocomplete.
These types match the TypeScript definitions for seamless interop.
"""

from typing import TypedDict, List, Optional, Any, Dict, Literal, Union


# ===== Portable Text Core Types =====

class PortableTextSpan(TypedDict, total=False):
    """
    A span of text within a block.

    Matches @portabletext/types PortableTextSpan interface.
    """
    _type: str
    _key: str
    text: str
    marks: List[str]


class PortableTextMarkDef(TypedDict, total=False):
    """
    Mark definition for links and annotations.

    Supports links, wiki-links, and custom marks.
    """
    _key: str
    _type: Literal["link", "wikiLink"]
    href: Optional[str]  # For regular links
    target: Optional[str]  # For wiki links


class PortableTextBlock(TypedDict, total=False):
    """
    A text block (paragraph, heading, list item, etc.)

    Matches Portable Text block specification.
    """
    _type: Literal["block"]
    _key: str
    style: str  # 'normal', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', etc.
    children: List[PortableTextSpan]
    markDefs: List[PortableTextMarkDef]
    listItem: Optional[str]  # 'bullet', 'number', None
    level: Optional[int]  # Nesting level for lists


class PortableTextCodeBlock(TypedDict, total=False):
    """
    Code block with language and filename.
    """
    _type: Literal["code"]
    _key: str
    code: str
    language: Optional[str]
    filename: Optional[str]


class PortableTextImage(TypedDict, total=False):
    """
    Image block with alt text and caption.
    """
    _type: Literal["image"]
    _key: str
    url: str
    alt: Optional[str]
    caption: Optional[str]


class PortableTextTableCell(TypedDict):
    """Table cell content."""
    _type: Literal["tableCell"]
    _key: str
    content: List[PortableTextSpan]


class PortableTextTableRow(TypedDict):
    """Table row with cells."""
    _type: Literal["tableRow"]
    _key: str
    cells: List[PortableTextTableCell]


class PortableTextTable(TypedDict):
    """Table with rows."""
    _type: Literal["table"]
    _key: str
    rows: List[PortableTextTableRow]


class PortableTextCallout(TypedDict, total=False):
    """
    Callout/admonition block (note, warning, info, etc.)
    """
    _type: Literal["callout"]
    _key: str
    calloutType: str  # 'note', 'info', 'warning', 'error', 'success'
    content: List[PortableTextSpan]


# Union of all possible block types
PortableTextBlockContent = Union[
    PortableTextBlock,
    PortableTextCodeBlock,
    PortableTextImage,
    PortableTextTable,
    PortableTextCallout,
]


class DocumentMetadata(TypedDict, total=False):
    """
    Document metadata.

    Flexible structure for various metadata fields.
    """
    title: Optional[str]
    createdAt: Optional[str]
    updatedAt: Optional[str]
    source: Optional[str]
    author: Optional[str]
    tags: Optional[List[str]]
    # Allow arbitrary additional fields
    # Note: This makes it similar to Dict[str, Any] but with known fields typed


class PortableTextDocument(TypedDict, total=False):
    """
    Complete Portable Text document structure.

    This is the main type used throughout the export/import pipeline.
    Matches TypeScript's ConvertedDocument interface.
    """
    content: List[PortableTextBlockContent]
    metadata: Optional[DocumentMetadata]


# ===== Export Options =====

class MarkdownExportOptions(TypedDict, total=False):
    """Options for Markdown export."""
    includeMetadata: bool
    frontmatterFormat: Literal["yaml", "toml", "none"]


class HtmlExportOptions(TypedDict, total=False):
    """Options for HTML export."""
    includeStyles: bool
    includeMetadata: bool
    className: str
    title: str


class NotionExportOptions(TypedDict, total=False):
    """Options for Notion JSON export."""
    prettyPrint: bool


class RoamExportOptions(TypedDict, total=False):
    """Options for Roam JSON export."""
    prettyPrint: bool


# ===== For backward compatibility =====
# These allow gradual migration from Dict[str, Any]

# Type alias for documents still using Dict[str, Any]
AnyDocument = Dict[str, Any]

# Type alias for options still using Dict[str, Any]
AnyOptions = Dict[str, Any]
