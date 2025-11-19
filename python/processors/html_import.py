"""
HTML to Portable Text Converter

Parses HTML documents and converts them to Portable Text format.
Supports headings, paragraphs, lists, tables, code blocks, images, links, and text formatting.

Fast HTML parsing using BeautifulSoup4 with lxml parser.
"""

from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup, Tag, NavigableString
import re
import uuid


class HtmlImporter:
    """
    Converts HTML documents to Portable Text format.

    Handles common HTML elements:
    - Headings (h1-h6)
    - Paragraphs (p)
    - Lists (ul, ol)
    - Tables (table)
    - Code blocks (pre, code)
    - Images (img)
    - Links (a)
    - Text formatting (strong, em, code, etc.)
    - Blockquotes
    - Horizontal rules
    """

    def __init__(self):
        """Initialize HTML importer."""
        self.mark_defs: List[Dict[str, Any]] = []

    def import_html(
        self, html: str, options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Convert HTML to Portable Text.

        Args:
            html: HTML string to convert
            options: Conversion options (currently unused)

        Returns:
            Dictionary with 'content' (Portable Text blocks) and 'metadata'
        """
        options = options or {}

        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(html, "lxml")

        # Extract metadata from <head> if present
        metadata = self._extract_metadata(soup)

        # Convert body content
        body = soup.find("body")
        if body:
            content = self._convert_children(body)
        else:
            # No body tag, convert entire document
            content = self._convert_children(soup)

        return {"content": content, "metadata": metadata}

    def _extract_metadata(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract metadata from HTML head."""
        metadata: Dict[str, Any] = {}

        # Extract title
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            metadata["title"] = title_tag.string.strip()

        # Extract meta tags
        for meta in soup.find_all("meta"):
            name = meta.get("name") or meta.get("property")
            content = meta.get("content")

            if name and content:
                # Common meta tags
                if name in ["author", "description", "keywords"]:
                    metadata[name] = content
                elif name == "og:title":
                    metadata.setdefault("title", content)

        return metadata

    def _convert_children(self, element: Tag) -> List[Dict[str, Any]]:
        """Convert child elements to Portable Text blocks."""
        blocks: List[Dict[str, Any]] = []

        for child in element.children:
            if isinstance(child, NavigableString):
                # Skip whitespace-only text nodes
                text = str(child).strip()
                if text:
                    # Create paragraph for loose text
                    blocks.append(self._create_paragraph([text]))
            elif isinstance(child, Tag):
                converted = self._convert_element(child)
                if converted:
                    if isinstance(converted, list):
                        blocks.extend(converted)
                    else:
                        blocks.append(converted)

        return blocks

    def _convert_element(self, element: Tag) -> Any:
        """Convert single HTML element to Portable Text."""
        tag_name = element.name.lower()

        # Headings
        if tag_name in ["h1", "h2", "h3", "h4", "h5", "h6"]:
            return self._convert_heading(element, tag_name)

        # Paragraph
        elif tag_name == "p":
            return self._convert_paragraph_element(element)

        # Lists
        elif tag_name in ["ul", "ol"]:
            return self._convert_list(element, tag_name)

        # List items (should be handled by parent list)
        elif tag_name == "li":
            return None  # Handled by parent

        # Code block
        elif tag_name == "pre":
            return self._convert_code_block(element)

        # Blockquote
        elif tag_name == "blockquote":
            return self._convert_blockquote(element)

        # Table
        elif tag_name == "table":
            return self._convert_table(element)

        # Image
        elif tag_name == "img":
            return self._convert_image(element)

        # Horizontal rule
        elif tag_name == "hr":
            return self._create_horizontal_rule()

        # Container elements - convert children
        elif tag_name in ["div", "section", "article", "main", "aside", "header", "footer"]:
            return self._convert_children(element)

        # Skip these elements
        elif tag_name in ["script", "style", "meta", "link", "head"]:
            return None

        # Unknown elements - try to convert children
        else:
            return self._convert_children(element)

    def _convert_heading(self, element: Tag, tag_name: str) -> Dict[str, Any]:
        """Convert heading element."""
        spans = self._convert_inline_elements(element)
        return self._create_block(tag_name, spans)

    def _convert_paragraph_element(self, element: Tag) -> Dict[str, Any]:
        """Convert paragraph element."""
        spans = self._convert_inline_elements(element)
        return self._create_block("normal", spans)

    def _convert_blockquote(self, element: Tag) -> List[Dict[str, Any]]:
        """Convert blockquote to styled blocks."""
        blocks = []
        for child in element.children:
            if isinstance(child, Tag):
                if child.name == "p":
                    spans = self._convert_inline_elements(child)
                    blocks.append(self._create_block("blockquote", spans))
                else:
                    converted = self._convert_element(child)
                    if converted:
                        if isinstance(converted, list):
                            blocks.extend(converted)
                        else:
                            # Force blockquote style
                            if isinstance(converted, dict) and converted.get("_type") == "block":
                                converted["style"] = "blockquote"
                            blocks.append(converted)

        return blocks if blocks else [self._create_block("blockquote", [])]

    def _convert_list(self, element: Tag, tag_name: str) -> List[Dict[str, Any]]:
        """Convert list (ul/ol) to list item blocks."""
        list_type = "bullet" if tag_name == "ul" else "number"
        blocks = []

        for li in element.find_all("li", recursive=False):
            spans = self._convert_inline_elements(li)
            blocks.append(self._create_list_item(list_type, spans))

        return blocks

    def _convert_code_block(self, element: Tag) -> Dict[str, Any]:
        """Convert <pre> or <pre><code> to code block."""
        # Check if there's a <code> child
        code_element = element.find("code")
        if code_element:
            code_text = code_element.get_text()
            # Try to extract language from class (e.g., language-python)
            classes = code_element.get("class", [])
            language = None
            for cls in classes:
                if cls.startswith("language-"):
                    language = cls.replace("language-", "")
                    break
        else:
            code_text = element.get_text()
            language = None

        return {
            "_type": "code",
            "_key": self._generate_key(),
            "code": code_text,
            "language": language,
        }

    def _convert_table(self, element: Tag) -> Dict[str, Any]:
        """Convert HTML table to Portable Text table."""
        rows = []

        # Process thead and tbody
        for row_element in element.find_all("tr"):
            cells = []
            for cell in row_element.find_all(["td", "th"]):
                cell_spans = self._convert_inline_elements(cell)
                cells.append({
                    "_type": "tableCell",
                    "_key": self._generate_key(),
                    "content": cell_spans,
                })

            if cells:
                rows.append({
                    "_type": "tableRow",
                    "_key": self._generate_key(),
                    "cells": cells,
                })

        return {
            "_type": "table",
            "_key": self._generate_key(),
            "rows": rows,
        }

    def _convert_image(self, element: Tag) -> Dict[str, Any]:
        """Convert <img> to image block."""
        return {
            "_type": "image",
            "_key": self._generate_key(),
            "url": element.get("src", ""),
            "alt": element.get("alt"),
            "caption": element.get("title"),
        }

    def _convert_inline_elements(self, element: Tag) -> List[Dict[str, Any]]:
        """Convert inline elements to Portable Text spans."""
        spans: List[Dict[str, Any]] = []
        self.mark_defs = []  # Reset mark definitions for this block

        self._process_inline_node(element, spans, [])

        return spans

    def _process_inline_node(
        self, node: Any, spans: List[Dict[str, Any]], marks: List[str]
    ) -> None:
        """Recursively process inline nodes to build spans."""
        if isinstance(node, NavigableString):
            text = str(node)
            if text:  # Don't create empty spans
                spans.append(self._create_span(text, marks))

        elif isinstance(node, Tag):
            tag_name = node.name.lower()

            # Handle formatting tags
            new_marks = marks.copy()

            if tag_name == "strong" or tag_name == "b":
                new_marks.append("strong")
            elif tag_name == "em" or tag_name == "i":
                new_marks.append("em")
            elif tag_name == "code":
                new_marks.append("code")
            elif tag_name == "u":
                new_marks.append("underline")
            elif tag_name == "s" or tag_name == "strike" or tag_name == "del":
                new_marks.append("strike-through")

            # Handle links
            elif tag_name == "a":
                href = node.get("href")
                if href:
                    mark_key = self._generate_key()
                    self.mark_defs.append({
                        "_key": mark_key,
                        "_type": "link",
                        "href": href,
                    })
                    new_marks.append(mark_key)

            # Line breaks
            elif tag_name == "br":
                spans.append(self._create_span("\n", marks))
                return

            # Process children
            for child in node.children:
                self._process_inline_node(child, spans, new_marks)

    def _create_span(self, text: str, marks: List[str]) -> Dict[str, Any]:
        """Create a Portable Text span."""
        return {
            "_type": "span",
            "_key": self._generate_key(),
            "text": text,
            "marks": marks,
        }

    def _create_block(
        self, style: str, children: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create a Portable Text block."""
        return {
            "_type": "block",
            "_key": self._generate_key(),
            "style": style,
            "children": children if children else [self._create_span("", [])],
            "markDefs": self.mark_defs.copy(),
        }

    def _create_list_item(
        self, list_type: str, children: List[Dict[str, Any]], level: int = 1
    ) -> Dict[str, Any]:
        """Create a list item block."""
        return {
            "_type": "block",
            "_key": self._generate_key(),
            "style": "normal",
            "children": children if children else [self._create_span("", [])],
            "markDefs": self.mark_defs.copy(),
            "listItem": list_type,
            "level": level,
        }

    def _create_paragraph(self, texts: List[str]) -> Dict[str, Any]:
        """Create a simple paragraph block from text."""
        children = [self._create_span(text, []) for text in texts]
        return self._create_block("normal", children)

    def _create_horizontal_rule(self) -> Dict[str, Any]:
        """Create a horizontal rule block."""
        # Represent as a special block or empty paragraph
        return {
            "_type": "block",
            "_key": self._generate_key(),
            "style": "normal",
            "children": [self._create_span("---", [])],
            "markDefs": [],
        }

    @staticmethod
    def _generate_key() -> str:
        """Generate a unique key for Portable Text blocks."""
        # Use shorter keys (9 chars) like Sanity
        return str(uuid.uuid4())[:9]
