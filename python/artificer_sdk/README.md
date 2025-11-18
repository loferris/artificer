# Artificer Python SDK

High-level Python client library for Artificer gRPC services.

## Installation

```bash
pip install artificer-sdk
```

Or install from source:

```bash
cd python/artificer_sdk
pip install -e .
```

## Quick Start

```python
from artificer_sdk import ArtificerClient

# Create client (context manager recommended)
with ArtificerClient("localhost:50051") as client:
    # Import markdown
    result = client.conversion.import_markdown("# Hello World")

    # Export to HTML
    html = client.conversion.export_html(
        result["document"],
        include_styles=True
    )

    print(html["html"])
```

## Features

The SDK provides access to all Artificer services:

- **Conversion**: Document import/export (Markdown, HTML, Notion, Roam)
- **PDF**: PDF text extraction and OCR
- **Image**: Image processing and OCR
- **Text**: Document chunking and token counting
- **Metrics**: Service metrics and health checks

## Client Services

### ConversionClient

Document import and export operations:

```python
# Import markdown
result = client.conversion.import_markdown(
    content="# Title\n\nParagraph",
    strict_mode=False,
    include_metadata=True
)

# Import HTML
result = client.conversion.import_html(
    content="<h1>Title</h1><p>Paragraph</p>"
)

# Export to HTML
html = client.conversion.export_html(
    document=result["document"],
    include_styles=True,
    class_name="document-content",
    title="My Document"
)

# Export to Markdown
md = client.conversion.export_markdown(
    document=result["document"],
    include_metadata=True
)

# Export to Notion format
notion = client.conversion.export_notion(
    document=result["document"],
    pretty_print=True
)

# Export to Roam format
roam = client.conversion.export_roam(
    document=result["document"],
    pretty_print=True
)

# Batch export (streaming)
documents = [doc1, doc2, doc3]
for result in client.conversion.batch_export(
    documents=documents,
    format="html",
    options={"include_styles": True}
):
    if "summary" in result:
        print(f"Completed: {result['summary']}")
    else:
        print(f"Document {result['index']}: {result['output']}")
```

### PDFClient

PDF processing and OCR:

```python
# Read PDF
with open("document.pdf", "rb") as f:
    pdf_data = f.read()

# Check if OCR is needed (cost estimation)
check = client.pdf.check_needs_ocr(
    pdf_data,
    min_text_threshold=100
)
print(f"Needs OCR: {check['needs_ocr']}")
print(f"Estimated cost: ${check['estimated_ocr_cost']}")

# Extract text (direct extraction, no OCR)
result = client.pdf.extract_text(pdf_data)
print(result["text"])
print(result["metadata"])

# Process PDF (smart OCR fallback)
result = client.pdf.process_pdf(
    pdf_data,
    force_ocr=False,
    min_text_threshold=100
)

# Extract pages as images (streaming)
for page in client.pdf.extract_pages_to_images(
    pdf_data,
    dpi=200,
    format="png",
    max_width=2000
):
    print(f"Page {page['page_number']}: {page['width']}x{page['height']}")
```

### ImageClient

Image processing and OCR:

```python
# Read image
with open("document.png", "rb") as f:
    image_data = f.read()

# Extract text from image (OCR)
result = client.image.extract_text_from_image(
    image_data,
    content_type="image/png"
)
print(f"Text: {result['text']}")
print(f"Confidence: {result['confidence']}")
print(f"Provider: {result['metadata']['provider']}")

# Convert/resize image
converted = client.image.convert_image(
    image_data,
    output_format="jpeg",
    max_width=1000,
    max_height=1000,
    quality=85
)
```

### TextClient

Text chunking and token counting:

```python
# Chunk a document
result = client.text.chunk_document(
    document_id="doc1",
    project_id="proj1",
    content="Long document content...",
    filename="document.txt",
    chunk_size=1000,
    chunk_overlap=200
)
print(f"Created {result['total_chunks']} chunks")

# Batch chunking
documents = [
    {"document_id": "1", "project_id": "p1", "content": "..."},
    {"document_id": "2", "project_id": "p1", "content": "..."},
]
result = client.text.chunk_documents_batch(
    documents=documents,
    chunk_size=1000,
    chunk_overlap=200
)

# Count tokens
result = client.text.count_tokens(
    content="This is a test.",
    model="gpt-4"
)
print(f"Tokens: {result['token_count']}")

# Count conversation tokens
messages = [
    {"role": "system", "content": "You are helpful."},
    {"role": "user", "content": "Hello!"}
]
result = client.text.count_conversation_tokens(
    messages=messages,
    model="gpt-4"
)
print(f"Total: {result['total_tokens']}")

# Estimate message fit
result = client.text.estimate_message_fit(
    messages=messages,
    max_tokens=1000,
    model="gpt-4"
)
print(f"Fits: {result['count']}/{len(messages)}")

# Calculate context window
window = client.text.calculate_context_window(
    model_context_window=8192,
    output_tokens=2000,
    system_tokens=500
)
print(f"Recent: {window['recent_messages_window']} tokens")
```

### MetricsClient

Service metrics and health:

```python
# Health check
health = client.metrics.health_check()
print(f"Status: {health['status']}")
print(f"Processors: {health['processors']}")

# Get metrics
metrics = client.metrics.get_metrics()
print(f"Uptime: {metrics['service']['uptime']['formatted']}")
print(f"Total requests: {metrics['overall']['total_requests']}")
print(f"RPS: {metrics['overall']['requests_per_second']}")

# Per-endpoint metrics
for endpoint, stats in metrics['endpoints'].items():
    print(f"{endpoint}: p95={stats['p95_ms']}ms")
```

## Advanced Usage

### Custom Channel Options

```python
options = [
    ('grpc.max_receive_message_length', 100 * 1024 * 1024),  # 100MB
    ('grpc.max_send_message_length', 100 * 1024 * 1024),
    ('grpc.keepalive_time_ms', 10000),
]

client = ArtificerClient("localhost:50051", options=options)
```

### Secure Connections

```python
import grpc

# Create SSL credentials
credentials = grpc.ssl_channel_credentials(
    root_certificates=open('ca.pem', 'rb').read(),
    private_key=open('client-key.pem', 'rb').read(),
    certificate_chain=open('client-cert.pem', 'rb').read()
)

# Create secure client
client = ArtificerClient(
    "artificer.example.com:443",
    credentials=credentials
)
```

### Direct Client Usage

For advanced use cases, you can use individual clients directly:

```python
import grpc
from artificer_sdk.clients import ConversionClient

# Create channel
channel = grpc.insecure_channel("localhost:50051")

# Create specific client
conversion = ConversionClient(channel)

# Use client
result = conversion.import_markdown("# Hello")

# Clean up
channel.close()
```

## Error Handling

All methods raise `grpc.RpcError` on failures:

```python
import grpc

try:
    result = client.conversion.import_markdown("# Test")
except grpc.RpcError as e:
    print(f"gRPC error: {e.code()}")
    print(f"Details: {e.details()}")
```

## Performance

The SDK uses gRPC for high-performance communication:

- **Binary serialization**: Protocol Buffers for efficient data transfer
- **HTTP/2**: Multiplexed connections and header compression
- **Streaming**: Server-side streaming for batch operations (5-10x faster)

### Batch Export Performance

Batch export uses streaming for parallel processing:

```python
# Export 100 documents - processes in parallel
documents = [doc1, doc2, ..., doc100]
for result in client.conversion.batch_export(documents, format="html"):
    if "summary" in result:
        speedup = result["summary"]["parallel_speedup"]
        print(f"Speedup: {speedup}x faster than sequential")
```

## Requirements

- Python 3.8+
- grpcio >= 1.60.0
- protobuf >= 4.25.0

## Development

### Running Examples

```bash
# Start the gRPC server first
python python/services/dual_server.py

# Run examples
python python/artificer_sdk/examples.py
```

### Testing

```bash
pytest python/artificer_sdk/tests/
```

## License

MIT License - see LICENSE file for details.

## Support

- Issues: https://github.com/loferris/artificer/issues
- Documentation: https://docs.artificer.dev
