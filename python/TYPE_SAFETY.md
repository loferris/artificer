# Python Type Safety Guide

This guide explains the type safety improvements in the Python microservice and how to use them.

## Overview

The Python codebase now has **three levels of type safety**:

1. **TypedDict** (`processors/types.py`) - Lightweight type hints for gradual migration
2. **Pydantic Models** (`processors/models.py`) - Full runtime validation + type safety
3. **mypy Configuration** (`pyproject.toml`) - Static type checking

## Quick Start

### Using Pydantic Models (Recommended)

```python
from processors.models import PortableTextDocument, document_from_dict

# Parse and validate data from API
data = request.json()
doc = document_from_dict(data)  # Raises ValidationError if invalid

# Full IDE autocomplete!
for block in doc.content:
    if hasattr(block, 'children'):
        for span in block.children:
            print(span.text)  # ✅ Type-safe access

# Convert back to dict for legacy functions
legacy_data = doc.to_dict()
```

### Using TypedDict (Lightweight)

```python
from processors.types import PortableTextDocument

def process_document(doc: PortableTextDocument) -> str:
    # mypy knows doc has 'content' and 'metadata'
    blocks = doc['content']  # ✅ Type checked
    return f"Processing {len(blocks)} blocks"
```

## Type Safety Levels

### Level 1: Basic Type Hints (Current State)

```python
def export_markdown(document: Dict[str, Any]) -> str:
    # ❌ No structure validation
    # ❌ No autocomplete
    # ❌ Can't catch field name typos
    content = document.get("content")  # Could be None, could be wrong type
```

### Level 2: TypedDict (Better)

```python
from processors.types import PortableTextDocument

def export_markdown(document: PortableTextDocument) -> str:
    # ✅ mypy validates structure
    # ✅ Some IDE autocomplete
    # ❌ No runtime validation
    content = document["content"]  # mypy knows this is List[PortableTextBlockContent]
```

### Level 3: Pydantic Models (Best)

```python
from processors.models import PortableTextDocument

def export_markdown(document: PortableTextDocument) -> str:
    # ✅ mypy validates structure
    # ✅ Full IDE autocomplete
    # ✅ Runtime validation
    # ✅ Automatic JSON parsing
    content = document.content  # Pydantic property with full type safety
```

## Migration Guide

### Gradual Migration Path

**Phase 1: Update Function Signatures (Day 1)**

```python
# Before
def export_notion(self, document: Dict[str, Any], options: Optional[Dict[str, Any]] = None) -> str:
    pass

# After - TypedDict
from processors.types import PortableTextDocument, NotionExportOptions

def export_notion(self, document: PortableTextDocument, options: Optional[NotionExportOptions] = None) -> str:
    pass
```

**Phase 2: Use Pydantic at API Boundaries (Week 1)**

```python
from processors.models import PortableTextDocument, document_from_dict

@app.post("/api/export")
async def export_endpoint(request: Request):
    data = await request.json()

    # Validate incoming data
    doc = document_from_dict(data)  # Raises ValidationError if bad

    # Process with full type safety
    result = processor.export(doc)

    return {"result": result}
```

**Phase 3: Full Pydantic (Week 2)**

```python
from processors.models import PortableTextDocument

class NotionExporter:
    def export_notion(self, document: PortableTextDocument) -> str:
        # Work with Pydantic models throughout
        for block in document.content:
            if block.type == "block":
                text = block.children[0].text
```

## Available Types

### Core Models (Pydantic)

```python
from processors.models import (
    PortableTextDocument,      # Complete document
    PortableTextBlock,          # Text block
    PortableTextCodeBlock,      # Code block
    PortableTextImage,          # Image
    PortableTextTable,          # Table
    PortableTextCallout,        # Callout/admonition
    DocumentMetadata,           # Metadata
)
```

### Export Options (Pydantic)

```python
from processors.models import (
    MarkdownExportOptions,
    HtmlExportOptions,
    NotionExportOptions,
    RoamExportOptions,
)

# Use with validation
options = HtmlExportOptions(
    includeStyles=True,
    includeMetadata=False,
    title="My Document"
)
```

### Batch Export (Pydantic)

```python
from processors.models import (
    BatchExportRequest,
    BatchExportResponse,
    BatchExportResult,
)
```

## Type Checking with mypy

### Running mypy

```bash
# Check all files
cd python
python -m mypy services/ processors/

# Check specific file
python -m mypy processors/notion_export.py

# Strict mode (future)
python -m mypy --strict processors/notion_export.py
```

### Configuration

mypy is configured in `pyproject.toml`:

```toml
[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
check_untyped_defs = true
ignore_missing_imports = true
```

## CI/CD Integration

Type checking runs automatically in GitHub Actions:

```yaml
- name: Run type checking with mypy
  run: |
    cd python
    python -m mypy services/ processors/
```

See `.github/workflows/ci.yml` for full configuration.

## IDE Setup

### VS Code

Install Python extension, then mypy will work automatically:

```json
{
  "python.linting.mypyEnabled": true,
  "python.linting.enabled": true
}
```

### PyCharm

Pycharm has built-in type checking. Enable it in:
- Settings → Editor → Inspections → Python → Type checker

## Common Patterns

### Pattern 1: Accept Dict, Use Pydantic Internally

```python
from processors.models import PortableTextDocument, document_from_dict

def export_notion(self, document: Dict[str, Any]) -> str:
    # Convert to Pydantic for type safety
    doc = document_from_dict(document)

    # Now work with full type safety
    for block in doc.content:
        # Full autocomplete here!
        pass

    return result
```

### Pattern 2: Pydantic End-to-End

```python
from processors.models import PortableTextDocument

def export_notion(self, document: PortableTextDocument) -> str:
    # Already validated, full type safety
    for block in document.content:
        if block.type == "block":
            # IDE knows exact type
            text = block.children[0].text
```

### Pattern 3: Optional Validation

```python
from processors.models import PortableTextDocument, document_from_dict
from pydantic import ValidationError

def safe_export(document: Dict[str, Any]) -> Optional[str]:
    try:
        doc = document_from_dict(document)
        return export_with_types(doc)
    except ValidationError as e:
        logger.error(f"Invalid document: {e}")
        return None  # Or fallback to dict-based processing
```

## Benefits

### 1. Catch Errors at Development Time

```python
# TypeScript catches this at compile time:
result.processingTme  // Error: did you mean 'processingTime'?

# Python with Pydantic catches this at runtime (ASAP):
doc.metadta  # AttributeError: did you mean 'metadata'?

# Python without types only fails when that line executes (later):
doc.get("metadta")  # Returns None, bug hides until production
```

### 2. Better IDE Experience

```python
# Without types
document.get("???")  # No autocomplete, have to remember field names

# With Pydantic
document.content[0].  # ✅ Autocomplete shows: children, style, markDefs, etc.
```

### 3. Automatic Validation

```python
# Bad data rejected immediately
bad_doc = {"content": "not a list"}
doc = PortableTextDocument(**bad_doc)  # ❌ ValidationError

# Good data parsed correctly
good_doc = {"content": [], "metadata": {"title": "Test"}}
doc = PortableTextDocument(**good_doc)  # ✅ Works
```

### 4. Self-Documenting Code

```python
# Clear what's expected
def export_markdown(
    document: PortableTextDocument,  # ✅ IDE shows full structure
    options: MarkdownExportOptions    # ✅ IDE shows available options
) -> str:
    pass
```

## Performance

- **TypedDict**: Zero runtime overhead
- **Pydantic**: ~1-5ms validation overhead per document (negligible for most use cases)
- **mypy**: Only runs during development/CI, no runtime cost

For hot paths, use TypedDict. For API boundaries, use Pydantic (validation is worth it).

## Backward Compatibility

All types are backward compatible:

```python
# Old code still works
def old_function(document: Dict[str, Any]) -> str:
    return document.get("content", [])

# Can pass Pydantic model
doc = PortableTextDocument(content=[])
old_function(doc.to_dict())  # ✅ Works
```

## Future Improvements

1. **Strict mode**: Enable `disallow_untyped_defs` for new code
2. **Discriminated unions**: Better type narrowing for block types
3. **Generic types**: Type-safe exporters with generic return types
4. **Protocol types**: Interface-based typing for exporters

## Resources

- [mypy documentation](https://mypy.readthedocs.io/)
- [Pydantic documentation](https://docs.pydantic.dev/)
- [Python typing module](https://docs.python.org/3/library/typing.html)
- [TypeScript comparison](../docs/typescript-vs-python-types.md)

## Summary

| Approach | Type Checking | Runtime Validation | IDE Support | Overhead |
|----------|--------------|-------------------|-------------|----------|
| Dict[str, Any] | ❌ None | ❌ None | ❌ None | None |
| TypedDict | ✅ Static | ❌ None | ⚠️ Limited | None |
| Pydantic | ✅ Static | ✅ Runtime | ✅ Excellent | ~1-5ms |

**Recommendation**: Use Pydantic for all new code and API boundaries. Gradually migrate existing code.
