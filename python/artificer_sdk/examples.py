"""
Artificer SDK Examples

This file demonstrates how to use the Artificer Python SDK.
"""

from artificer_sdk import ArtificerClient


def example_basic_usage():
    """Basic usage with context manager."""
    with ArtificerClient("localhost:50051") as client:
        # Import markdown
        result = client.conversion.import_markdown("# Hello World\n\nThis is a test.")
        print("Imported document:", result["document"])


def example_conversion_operations():
    """Document conversion operations."""
    with ArtificerClient("localhost:50051") as client:
        # Import markdown
        markdown = """
# My Document

This is a **bold** statement with a [link](https://example.com).

- List item 1
- List item 2

```python
print("Hello World")
```
        """
        result = client.conversion.import_markdown(
            content=markdown, strict_mode=False, include_metadata=True
        )
        document = result["document"]

        # Export to HTML
        html_result = client.conversion.export_html(
            document=document,
            include_styles=True,
            include_metadata=True,
            class_name="my-document",
            title="My Document",
        )
        print("HTML output:", html_result["html"][:200])

        # Export to Markdown
        md_result = client.conversion.export_markdown(
            document=document, include_metadata=True
        )
        print("Markdown output:", md_result["markdown"][:200])

        # Export to Notion format
        notion_result = client.conversion.export_notion(
            document=document, pretty_print=True
        )
        print("Notion JSON:", notion_result["json"][:200])


def example_batch_export():
    """Batch export with streaming results."""
    with ArtificerClient("localhost:50051") as client:
        # Create test documents
        docs = []
        for i in range(5):
            result = client.conversion.import_markdown(f"# Document {i}\n\nContent {i}")
            docs.append(result["document"])

        # Batch export to HTML
        print("Exporting 5 documents to HTML...")
        for result in client.conversion.batch_export(
            documents=docs, format="html", options={"include_styles": True}
        ):
            if "summary" in result:
                print(f"Summary: {result['summary']}")
            else:
                print(
                    f"Document {result['index']}: {len(result['output'])} bytes in {result['processing_time_ms']}ms"
                )


def example_pdf_operations():
    """PDF processing operations."""
    with ArtificerClient("localhost:50051") as client:
        # Read PDF file
        with open("sample.pdf", "rb") as f:
            pdf_data = f.read()

        # Check if OCR is needed
        ocr_check = client.pdf.check_needs_ocr(pdf_data, min_text_threshold=100)
        print(f"Needs OCR: {ocr_check['needs_ocr']}")
        print(f"Pages: {ocr_check['pages']}")
        print(f"Estimated cost: ${ocr_check['estimated_ocr_cost']:.4f}")

        # Extract text
        if not ocr_check["needs_ocr"]:
            result = client.pdf.extract_text(pdf_data)
            print(f"Extracted text: {result['text'][:200]}")
            print(f"Method: {result['metadata']['method']}")
        else:
            # Process with OCR fallback
            result = client.pdf.process_pdf(
                pdf_data, force_ocr=False, min_text_threshold=100
            )
            print(f"Processed text: {result['text'][:200]}")

        # Extract pages as images
        print("Extracting pages as images...")
        for page in client.pdf.extract_pages_to_images(
            pdf_data, dpi=200, format="png", max_width=2000
        ):
            print(
                f"Page {page['page_number']}: {page['width']}x{page['height']} ({page['size_bytes']} bytes)"
            )


def example_image_operations():
    """Image processing and OCR operations."""
    with ArtificerClient("localhost:50051") as client:
        # Read image file
        with open("document.png", "rb") as f:
            image_data = f.read()

        # Extract text from image (OCR)
        result = client.image.extract_text_from_image(image_data, "image/png")
        print(f"Extracted text: {result['text']}")
        print(f"Confidence: {result['confidence']}")
        print(f"Provider: {result['metadata']['provider']}")
        print(f"Cost: ${result['metadata']['cost']:.4f}")

        # Convert image format
        converted = client.image.convert_image(
            image_data, output_format="jpeg", max_width=1000, quality=85
        )
        print(
            f"Converted: {converted['width']}x{converted['height']} ({converted['size_bytes']} bytes)"
        )


def example_text_operations():
    """Text processing operations."""
    with ArtificerClient("localhost:50051") as client:
        # Chunk a document
        content = "Long document content here..." * 100
        result = client.text.chunk_document(
            document_id="doc1",
            project_id="proj1",
            content=content,
            filename="document.txt",
            chunk_size=1000,
            chunk_overlap=200,
        )
        print(f"Created {result['total_chunks']} chunks")
        for chunk in result["chunks"][:3]:
            print(f"Chunk {chunk['metadata']['chunk_index']}: {len(chunk['content'])} chars")

        # Count tokens
        token_result = client.text.count_tokens(
            content="This is a test message.", model="gpt-4"
        )
        print(f"Tokens: {token_result['token_count']}")

        # Count conversation tokens
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello!"},
            {"role": "assistant", "content": "Hi! How can I help?"},
        ]
        conv_result = client.text.count_conversation_tokens(
            messages=messages, model="gpt-4"
        )
        print(f"Total conversation tokens: {conv_result['total_tokens']}")

        # Estimate message fit
        fit_result = client.text.estimate_message_fit(
            messages=messages, max_tokens=1000, model="gpt-4"
        )
        print(f"Messages that fit: {fit_result['count']}/{len(messages)}")

        # Calculate context window
        window = client.text.calculate_context_window(
            model_context_window=8192, output_tokens=2000, system_tokens=500
        )
        print(f"Recent messages window: {window['recent_messages_window']} tokens")
        print(f"Summary window: {window['summary_window']} tokens")


def example_metrics_operations():
    """Metrics and health check operations."""
    with ArtificerClient("localhost:50051") as client:
        # Health check
        health = client.metrics.health_check()
        print(f"Status: {health['status']}")
        print(f"Service: {health['service']} v{health['version']}")
        print(f"Processors: {health['processors']}")

        # Get metrics
        metrics = client.metrics.get_metrics()
        print(f"Service: {metrics['service']['name']}")
        print(f"Uptime: {metrics['service']['uptime']['formatted']}")
        print(f"Total requests: {metrics['overall']['total_requests']}")
        print(f"Error rate: {metrics['overall']['error_rate']:.2%}")
        print(f"RPS: {metrics['overall']['requests_per_second']:.2f}")

        # Per-endpoint metrics
        for endpoint, stats in metrics["endpoints"].items():
            print(
                f"{endpoint}: {stats['request_count']} requests, p95={stats['p95_ms']}ms"
            )


def example_advanced_channel_options():
    """Advanced usage with custom channel options."""
    # Custom channel options for large messages
    options = [
        ("grpc.max_receive_message_length", 100 * 1024 * 1024),  # 100MB
        ("grpc.max_send_message_length", 100 * 1024 * 1024),  # 100MB
        ("grpc.keepalive_time_ms", 10000),
    ]

    client = ArtificerClient("localhost:50051", options=options)

    try:
        # Use client
        health = client.metrics.health_check()
        print(f"Status: {health['status']}")
    finally:
        client.close()


if __name__ == "__main__":
    print("Artificer SDK Examples")
    print("=" * 60)

    print("\n1. Basic Usage")
    print("-" * 60)
    example_basic_usage()

    print("\n2. Conversion Operations")
    print("-" * 60)
    example_conversion_operations()

    print("\n3. Metrics")
    print("-" * 60)
    example_metrics_operations()

    # Uncomment to run other examples (require actual files)
    # print("\n4. PDF Operations")
    # print("-" * 60)
    # example_pdf_operations()

    # print("\n5. Image Operations")
    # print("-" * 60)
    # example_image_operations()
