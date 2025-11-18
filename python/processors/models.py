"""
Pydantic models for Portable Text and document structures.

Provides runtime validation, automatic JSON serialization, and full type safety.
These models match the TypeScript definitions for seamless interop.

Usage:
    from processors.models import PortableTextDocument, PortableTextBlock

    # Parse and validate document
    doc = PortableTextDocument(**data)

    # Access with full autocomplete
    for block in doc.content:
        if block.type == "block":
            print(block.children[0].text)
"""

from typing import List, Optional, Literal, Union, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


# ===== Portable Text Core Models =====

class PortableTextSpan(BaseModel):
    """
    A span of text within a block.

    Matches @portabletext/types PortableTextSpan interface.
    """
    model_config = ConfigDict(populate_by_name=True)

    type: Literal["span"] = Field(default="span", alias="_type")
    key: str = Field(alias="_key")
    text: str
    marks: List[str] = Field(default_factory=list)


class PortableTextMarkDef(BaseModel):
    """
    Mark definition for links and annotations.

    Supports links, wiki-links, and custom marks.
    """
    model_config = ConfigDict(populate_by_name=True)

    key: str = Field(alias="_key")
    type: Literal["link", "wikiLink"] = Field(alias="_type")
    href: Optional[str] = None  # For regular links
    target: Optional[str] = None  # For wiki links


class PortableTextBlock(BaseModel):
    """
    A text block (paragraph, heading, list item, etc.)

    Matches Portable Text block specification.
    """
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    type: Literal["block"] = Field(default="block", alias="_type")
    key: str = Field(alias="_key")
    style: str = "normal"
    children: List[PortableTextSpan]
    mark_defs: List[PortableTextMarkDef] = Field(default_factory=list, alias="markDefs")
    list_item: Optional[str] = Field(default=None, alias="listItem")
    level: Optional[int] = None


class PortableTextCodeBlock(BaseModel):
    """Code block with language and filename."""
    model_config = ConfigDict(populate_by_name=True)

    type: Literal["code"] = Field(default="code", alias="_type")
    key: str = Field(alias="_key")
    code: str
    language: Optional[str] = None
    filename: Optional[str] = None


class PortableTextImage(BaseModel):
    """Image block with alt text and caption."""
    model_config = ConfigDict(populate_by_name=True)

    type: Literal["image"] = Field(default="image", alias="_type")
    key: str = Field(alias="_key")
    url: str
    alt: Optional[str] = None
    caption: Optional[str] = None


class PortableTextTableCell(BaseModel):
    """Table cell content."""
    model_config = ConfigDict(populate_by_name=True)

    type: Literal["tableCell"] = Field(default="tableCell", alias="_type")
    key: str = Field(alias="_key")
    content: List[PortableTextSpan]


class PortableTextTableRow(BaseModel):
    """Table row with cells."""
    model_config = ConfigDict(populate_by_name=True)

    type: Literal["tableRow"] = Field(default="tableRow", alias="_type")
    key: str = Field(alias="_key")
    cells: List[PortableTextTableCell]


class PortableTextTable(BaseModel):
    """Table with rows."""
    model_config = ConfigDict(populate_by_name=True)

    type: Literal["table"] = Field(default="table", alias="_type")
    key: str = Field(alias="_key")
    rows: List[PortableTextTableRow]


class PortableTextCallout(BaseModel):
    """Callout/admonition block (note, warning, info, etc.)"""
    model_config = ConfigDict(populate_by_name=True)

    type: Literal["callout"] = Field(default="callout", alias="_type")
    key: str = Field(alias="_key")
    callout_type: str = Field(alias="calloutType")
    content: List[PortableTextSpan]


# Union of all possible block types
PortableTextBlockContent = Union[
    PortableTextBlock,
    PortableTextCodeBlock,
    PortableTextImage,
    PortableTextTable,
    PortableTextCallout,
]


class DocumentMetadata(BaseModel):
    """
    Document metadata.

    Flexible structure for various metadata fields.
    """
    model_config = ConfigDict(extra="allow")

    title: Optional[str] = None
    created_at: Optional[str] = Field(default=None, alias="createdAt")
    updated_at: Optional[str] = Field(default=None, alias="updatedAt")
    source: Optional[str] = None
    author: Optional[str] = None
    tags: Optional[List[str]] = None
    # extra="allow" permits additional fields


class PortableTextDocument(BaseModel):
    """
    Complete Portable Text document structure.

    This is the main model used throughout the export/import pipeline.
    Matches TypeScript's ConvertedDocument interface.

    Example:
        >>> doc_data = {
        ...     "content": [
        ...         {
        ...             "_type": "block",
        ...             "_key": "block1",
        ...             "style": "h1",
        ...             "children": [{"_type": "span", "_key": "span1", "text": "Hello", "marks": []}],
        ...             "markDefs": []
        ...         }
        ...     ],
        ...     "metadata": {"title": "My Document"}
        ... }
        >>> doc = PortableTextDocument(**doc_data)
        >>> doc.content[0].children[0].text
        'Hello'
    """
    model_config = ConfigDict(populate_by_name=True)

    content: List[Any]  # Use Any for now to allow Dict or Pydantic models
    metadata: Optional[DocumentMetadata] = None

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert to dictionary with original field names.

        Useful for passing to legacy functions expecting Dict[str, Any].
        """
        return self.model_dump(by_alias=True, exclude_none=True)


# ===== Export Options Models =====

class MarkdownExportOptions(BaseModel):
    """Options for Markdown export."""
    model_config = ConfigDict(populate_by_name=True)

    include_metadata: bool = Field(default=True, alias="includeMetadata")
    frontmatter_format: Literal["yaml", "toml", "none"] = Field(
        default="yaml", alias="frontmatterFormat"
    )


class HtmlExportOptions(BaseModel):
    """Options for HTML export."""
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    include_styles: bool = Field(default=True, alias="includeStyles")
    include_metadata: bool = Field(default=True, alias="includeMetadata")
    class_name: str = Field(default="document-content", alias="className")
    title: Optional[str] = None


class NotionExportOptions(BaseModel):
    """Options for Notion JSON export."""
    model_config = ConfigDict(populate_by_name=True)

    pretty_print: bool = Field(default=False, alias="prettyPrint")


class RoamExportOptions(BaseModel):
    """Options for Roam JSON export."""
    model_config = ConfigDict(populate_by_name=True)

    pretty_print: bool = Field(default=False, alias="prettyPrint")


# ===== Batch Export Models =====

class BatchExportRequest(BaseModel):
    """Request for batch export operation."""
    model_config = ConfigDict(populate_by_name=True)

    documents: List[Dict[str, Any]]
    format: Literal["markdown", "html", "notion", "roam"]
    options: Dict[str, Any] = Field(default_factory=dict)


class BatchExportResult(BaseModel):
    """Result for a single document in batch export."""
    model_config = ConfigDict(populate_by_name=True)

    index: int
    success: bool
    output: str
    processing_time: int = Field(alias="processingTime")


class BatchExportError(BaseModel):
    """Error for a failed document in batch export."""
    model_config = ConfigDict(populate_by_name=True)

    index: int
    error: str


class BatchExportResponse(BaseModel):
    """Response from batch export operation."""
    model_config = ConfigDict(populate_by_name=True)

    total_documents: int = Field(alias="totalDocuments")
    successful: int
    failed: int
    results: List[BatchExportResult]
    errors: List[BatchExportError]
    total_processing_time: int = Field(alias="totalProcessingTime")
    average_processing_time: int = Field(alias="averageProcessingTime")
    parallel_speedup: float = Field(alias="parallelSpeedup")


# ===== Helper Functions =====

def document_from_dict(data: Dict[str, Any]) -> PortableTextDocument:
    """
    Create PortableTextDocument from dictionary with validation.

    Args:
        data: Dictionary containing document data

    Returns:
        Validated PortableTextDocument

    Raises:
        ValidationError: If data doesn't match expected structure
    """
    return PortableTextDocument(**data)


def document_to_dict(doc: PortableTextDocument) -> Dict[str, Any]:
    """
    Convert PortableTextDocument to dictionary.

    Args:
        doc: PortableTextDocument instance

    Returns:
        Dictionary with original field names (using aliases)
    """
    return doc.to_dict()
