"""
Tests for HTML importer

Tests the Python implementation of HTML to Portable Text conversion.
"""

import pytest
from processors.html_import import HtmlImporter


@pytest.fixture
def html_importer():
    """HTML importer instance"""
    return HtmlImporter()


def test_simple_paragraph(html_importer):
    """Test importing a simple paragraph"""
    html = "<p>Hello, World!</p>"
    result = html_importer.import_html(html)

    assert len(result["content"]) == 1
    block = result["content"][0]
    assert block["_type"] == "block"
    assert block["style"] == "normal"
    assert len(block["children"]) == 1
    assert block["children"][0]["text"] == "Hello, World!"


def test_headings(html_importer):
    """Test importing headings"""
    html = """
    <h1>Heading 1</h1>
    <h2>Heading 2</h2>
    <h3>Heading 3</h3>
    """
    result = html_importer.import_html(html)

    assert len(result["content"]) == 3
    assert result["content"][0]["style"] == "h1"
    assert result["content"][1]["style"] == "h2"
    assert result["content"][2]["style"] == "h3"
    assert result["content"][0]["children"][0]["text"] == "Heading 1"
    assert result["content"][1]["children"][0]["text"] == "Heading 2"
    assert result["content"][2]["children"][0]["text"] == "Heading 3"


def test_text_formatting(html_importer):
    """Test importing text with formatting"""
    html = "<p>This is <strong>bold</strong> and <em>italic</em> text.</p>"
    result = html_importer.import_html(html)

    block = result["content"][0]
    children = block["children"]

    # Should have 5 spans: "This is ", "bold", " and ", "italic", " text."
    assert len(children) == 5
    assert children[0]["text"] == "This is "
    assert children[0]["marks"] == []

    assert children[1]["text"] == "bold"
    assert "strong" in children[1]["marks"]

    assert children[2]["text"] == " and "
    assert children[2]["marks"] == []

    assert children[3]["text"] == "italic"
    assert "em" in children[3]["marks"]

    assert children[4]["text"] == " text."
    assert children[4]["marks"] == []


def test_links(html_importer):
    """Test importing links"""
    html = '<p>Visit <a href="https://example.com">example</a> for more.</p>'
    result = html_importer.import_html(html)

    block = result["content"][0]
    children = block["children"]

    # Should have 3 spans: "Visit ", "example", " for more."
    assert len(children) == 3
    assert children[1]["text"] == "example"
    # Link mark should be in marks
    assert len(children[1]["marks"]) == 1

    # Check mark definitions
    assert len(block["markDefs"]) == 1
    mark_def = block["markDefs"][0]
    assert mark_def["_type"] == "link"
    assert mark_def["href"] == "https://example.com"


def test_unordered_list(html_importer):
    """Test importing unordered list"""
    html = """
    <ul>
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
    </ul>
    """
    result = html_importer.import_html(html)

    assert len(result["content"]) == 3
    for block in result["content"]:
        assert block["_type"] == "block"
        assert block["listItem"] == "bullet"
        assert block["level"] == 1


def test_ordered_list(html_importer):
    """Test importing ordered list"""
    html = """
    <ol>
        <li>First step</li>
        <li>Second step</li>
    </ol>
    """
    result = html_importer.import_html(html)

    assert len(result["content"]) == 2
    for block in result["content"]:
        assert block["_type"] == "block"
        assert block["listItem"] == "number"
        assert block["level"] == 1


def test_code_block(html_importer):
    """Test importing code block"""
    html = """
    <pre><code class="language-python">def hello():
    print("Hello, World!")
</code></pre>
    """
    result = html_importer.import_html(html)

    assert len(result["content"]) >= 1
    code_block = None
    for block in result["content"]:
        if block.get("_type") == "code":
            code_block = block
            break

    assert code_block is not None
    assert code_block["_type"] == "code"
    assert code_block["language"] == "python"
    assert "def hello():" in code_block["code"]
    assert 'print("Hello, World!")' in code_block["code"]


def test_blockquote(html_importer):
    """Test importing blockquote"""
    html = """
    <blockquote>
        <p>This is a quote.</p>
    </blockquote>
    """
    result = html_importer.import_html(html)

    assert len(result["content"]) >= 1
    block = result["content"][0]
    assert block["_type"] == "block"
    assert block["style"] == "blockquote"
    assert block["children"][0]["text"] == "This is a quote."


def test_image(html_importer):
    """Test importing image"""
    html = '<img src="/path/to/image.jpg" alt="Test image" title="Image caption" />'
    result = html_importer.import_html(html)

    assert len(result["content"]) >= 1
    image_block = None
    for block in result["content"]:
        if block.get("_type") == "image":
            image_block = block
            break

    assert image_block is not None
    assert image_block["_type"] == "image"
    assert image_block["url"] == "/path/to/image.jpg"
    assert image_block["alt"] == "Test image"
    assert image_block["caption"] == "Image caption"


def test_table(html_importer):
    """Test importing table"""
    html = """
    <table>
        <tr>
            <th>Name</th>
            <th>Age</th>
        </tr>
        <tr>
            <td>Alice</td>
            <td>30</td>
        </tr>
        <tr>
            <td>Bob</td>
            <td>25</td>
        </tr>
    </table>
    """
    result = html_importer.import_html(html)

    # Find table block
    table_block = None
    for block in result["content"]:
        if block.get("_type") == "table":
            table_block = block
            break

    assert table_block is not None
    assert table_block["_type"] == "table"
    assert len(table_block["rows"]) == 3  # 1 header + 2 data rows

    # Check first row (header)
    header_row = table_block["rows"][0]
    assert len(header_row["cells"]) == 2
    assert header_row["cells"][0]["content"][0]["text"] == "Name"
    assert header_row["cells"][1]["content"][0]["text"] == "Age"

    # Check data rows
    data_row1 = table_block["rows"][1]
    assert data_row1["cells"][0]["content"][0]["text"] == "Alice"
    assert data_row1["cells"][1]["content"][0]["text"] == "30"


def test_metadata_extraction(html_importer):
    """Test extracting metadata from HTML head"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Document</title>
        <meta name="author" content="John Doe" />
        <meta name="description" content="A test document" />
    </head>
    <body>
        <p>Content here</p>
    </body>
    </html>
    """
    result = html_importer.import_html(html)

    assert result["metadata"]["title"] == "Test Document"
    assert result["metadata"]["author"] == "John Doe"
    assert result["metadata"]["description"] == "A test document"


def test_nested_formatting(html_importer):
    """Test nested text formatting"""
    html = "<p>This is <strong><em>bold and italic</em></strong> text.</p>"
    result = html_importer.import_html(html)

    block = result["content"][0]
    children = block["children"]

    # Find the "bold and italic" span
    nested_span = None
    for span in children:
        if "bold and italic" in span["text"]:
            nested_span = span
            break

    assert nested_span is not None
    # Should have both strong and em marks
    assert "strong" in nested_span["marks"]
    assert "em" in nested_span["marks"]


def test_multiple_paragraphs(html_importer):
    """Test importing multiple paragraphs"""
    html = """
    <p>First paragraph.</p>
    <p>Second paragraph.</p>
    <p>Third paragraph.</p>
    """
    result = html_importer.import_html(html)

    assert len(result["content"]) == 3
    assert all(block["_type"] == "block" and block["style"] == "normal" for block in result["content"])
    assert result["content"][0]["children"][0]["text"] == "First paragraph."
    assert result["content"][1]["children"][0]["text"] == "Second paragraph."
    assert result["content"][2]["children"][0]["text"] == "Third paragraph."


def test_mixed_content(html_importer):
    """Test importing mixed content types"""
    html = """
    <h1>Title</h1>
    <p>Introduction paragraph.</p>
    <ul>
        <li>List item 1</li>
        <li>List item 2</li>
    </ul>
    <pre><code>const x = 1;</code></pre>
    <p>Conclusion.</p>
    """
    result = html_importer.import_html(html)

    # Should have multiple blocks
    assert len(result["content"]) >= 5

    # Check that different types exist
    types = [block.get("_type") for block in result["content"]]
    assert "block" in types
    assert "code" in types


def test_empty_elements(html_importer):
    """Test handling empty elements"""
    html = """
    <p></p>
    <p>Non-empty paragraph</p>
    <p></p>
    """
    result = html_importer.import_html(html)

    # Should handle empty paragraphs gracefully
    assert len(result["content"]) >= 1

    # Find non-empty paragraph
    non_empty = None
    for block in result["content"]:
        if block.get("children") and block["children"][0].get("text"):
            if "Non-empty" in block["children"][0]["text"]:
                non_empty = block
                break

    assert non_empty is not None
    assert non_empty["children"][0]["text"] == "Non-empty paragraph"


def test_strip_script_and_style(html_importer):
    """Test that script and style tags are ignored"""
    html = """
    <script>alert('test');</script>
    <style>body { color: red; }</style>
    <p>Visible content</p>
    """
    result = html_importer.import_html(html)

    # Should only have the paragraph
    assert len(result["content"]) >= 1

    # Find visible content
    visible = None
    for block in result["content"]:
        if block.get("children") and block["children"]:
            if any("Visible" in span.get("text", "") for span in block["children"]):
                visible = block
                break

    assert visible is not None
    assert visible["children"][0]["text"] == "Visible content"


def test_br_tag(html_importer):
    """Test line break handling"""
    html = "<p>Line 1<br>Line 2</p>"
    result = html_importer.import_html(html)

    block = result["content"][0]
    children = block["children"]

    # Should have spans with newline character
    text_content = "".join(span["text"] for span in children)
    assert "Line 1" in text_content
    assert "Line 2" in text_content
    assert "\n" in text_content
