"""
Workflow Examples - Prefect Orchestration

Demonstrates using Artificer workflows for:
- PDF processing and conversion
- Batch document processing
- Image OCR
- Translation with specialist consensus
- Custom workflow execution
"""

import base64
import time
from pathlib import Path
from artificer_client import ArtificerClient


def list_available_workflows(client: ArtificerClient):
    """List all available Prefect workflows."""
    print("\n=== Available Workflows ===")

    workflows = client.workflows.list()
    print(f"Prefect service available: {workflows['available']}")

    if workflows['available']:
        print("\nWorkflows:")
        for wf in workflows['workflows']:
            print(f"\n  {wf['id']}")
            print(f"    Description: {wf['description']}")
            print(f"    Inputs: {wf['inputs']}")


def pdf_to_html_example(client: ArtificerClient, pdf_path: str):
    """Convert PDF to HTML with styles."""
    print("\n=== PDF to HTML Pipeline ===")

    # Read PDF file
    with open(pdf_path, "rb") as f:
        pdf_data = base64.b64encode(f.read()).decode()

    # Execute workflow
    print("Executing pdf-to-html pipeline...")
    result = client.workflows.execute_pdf_to_html(
        pdf_data,
        include_styles=True,
        title="Sample Document"
    )

    if result['success']:
        html = result['result']['html']
        print(f"✓ Conversion successful")
        print(f"  HTML length: {len(html)} characters")
        print(f"  Preview: {html[:200]}...")

        # Save to file
        output_path = Path(pdf_path).with_suffix('.html')
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"  Saved to: {output_path}")
    else:
        print(f"✗ Conversion failed: {result.get('error')}")


def pdf_with_ocr_example(client: ArtificerClient, pdf_path: str):
    """Process PDF with OCR and chunking."""
    print("\n=== PDF with OCR and Chunking ===")

    # Read PDF file
    with open(pdf_path, "rb") as f:
        pdf_data = base64.b64encode(f.read()).decode()

    # Execute workflow
    print("Executing pdf-with-ocr pipeline...")
    result = client.workflows.execute_pdf_with_ocr(
        pdf_data,
        chunk_size=1000,
        chunk_overlap=200
    )

    if result['success']:
        chunks = result['result']['chunks']
        metadata = result['result'].get('metadata', {})

        print(f"✓ Processing successful")
        print(f"  Total chunks: {len(chunks)}")
        print(f"  Pages: {metadata.get('pages', 'unknown')}")
        print(f"  OCR used: {metadata.get('ocr_used', False)}")

        # Show first chunk
        if chunks:
            print(f"\n  First chunk preview:")
            print(f"    {chunks[0][:200]}...")
    else:
        print(f"✗ Processing failed: {result.get('error')}")


def batch_pdf_example(client: ArtificerClient, pdf_dir: str):
    """Process multiple PDFs in parallel."""
    print("\n=== Batch PDF Processing ===")

    # Find all PDFs in directory
    pdf_files = []
    for pdf_path in Path(pdf_dir).glob("*.pdf"):
        with open(pdf_path, "rb") as f:
            pdf_data = base64.b64encode(f.read()).decode()
        pdf_files.append({
            "filename": pdf_path.name,
            "data": pdf_data
        })

    if not pdf_files:
        print("No PDF files found in directory")
        return

    print(f"Processing {len(pdf_files)} PDF files...")

    # Execute batch workflow
    result = client.workflows.execute_batch_pdf(
        pdf_files,
        max_workers=3
    )

    if result['success']:
        results = result['result']['results']
        print(f"✓ Batch processing complete")

        # Show results for each file
        successful = 0
        failed = 0
        for item in results:
            status = item['status']
            if status == 'success':
                successful += 1
                print(f"  ✓ {item['filename']}: {len(item.get('chunks', []))} chunks")
            else:
                failed += 1
                print(f"  ✗ {item['filename']}: {item.get('error', 'unknown error')}")

        print(f"\n  Summary: {successful} successful, {failed} failed")
    else:
        print(f"✗ Batch processing failed: {result.get('error')}")


def image_ocr_example(client: ArtificerClient, image_path: str):
    """Extract text from image using OCR."""
    print("\n=== Image OCR ===")

    # Read image file
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    # Execute workflow
    print("Executing image-ocr pipeline...")
    result = client.workflows.execute_image_ocr(
        image_data,
        language="eng"
    )

    if result['success']:
        text = result['result']['text']
        confidence = result['result'].get('confidence', 0)

        print(f"✓ OCR successful")
        print(f"  Confidence: {confidence:.2%}")
        print(f"  Text length: {len(text)} characters")
        print(f"\n  Extracted text:")
        print(f"  {text[:300]}...")
    else:
        print(f"✗ OCR failed: {result.get('error')}")


def translation_example(client: ArtificerClient):
    """Translate text with specialist consensus."""
    print("\n=== Translation with Specialists ===")

    # Text to translate
    text = """
    Artificial intelligence is transforming the world. Machine learning models
    can now understand and generate human language with remarkable accuracy.
    """

    target_languages = ["es", "fr", "de"]

    for lang in target_languages:
        print(f"\nTranslating to {lang}...")

        result = client.workflows.execute_translation(
            text.strip(),
            target_language=lang,
            use_specialists=True,
            min_specialists_required=3
        )

        if result['success']:
            translation = result['result']['translation']
            confidence = result['result'].get('confidence', 0)
            models_used = result['result'].get('models_used', [])

            print(f"✓ Translation successful")
            print(f"  Confidence: {confidence:.2%}")
            print(f"  Models: {', '.join(models_used)}")
            print(f"  Result: {translation[:200]}...")
        else:
            print(f"✗ Translation failed: {result.get('error')}")


def batch_translation_example(client: ArtificerClient):
    """Translate multiple texts in parallel."""
    print("\n=== Batch Translation ===")

    texts = [
        "Hello, world!",
        "How are you today?",
        "The weather is beautiful.",
        "I love programming.",
        "Thank you very much."
    ]

    print(f"Translating {len(texts)} texts to Spanish...")

    result = client.workflows.execute_batch_translation(
        texts,
        target_language="es",
        max_workers=3
    )

    if result['success']:
        translations = result['result']['translations']
        print(f"✓ Batch translation complete")

        for i, item in enumerate(translations):
            print(f"\n  {texts[i]}")
            print(f"  → {item['translation']}")
    else:
        print(f"✗ Batch translation failed: {result.get('error')}")


def markdown_conversion_example(client: ArtificerClient):
    """Convert between formats using markdown."""
    print("\n=== Markdown Conversion ===")

    # HTML to Markdown
    html_content = """
    <h1>Sample Document</h1>
    <p>This is a <strong>sample</strong> document with <em>formatting</em>.</p>
    <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
    </ul>
    """

    print("Converting HTML to Markdown...")
    result = client.workflows.execute_markdown_conversion(
        source_format="html",
        content=html_content.strip(),
        target_format="markdown"
    )

    if result['success']:
        markdown = result['result']['content']
        print(f"✓ Conversion successful")
        print(f"\n  Markdown output:")
        print(f"  {markdown}")
    else:
        print(f"✗ Conversion failed: {result.get('error')}")


def custom_workflow_example(client: ArtificerClient, pdf_path: str):
    """Execute workflow using generic execute() method."""
    print("\n=== Custom Workflow Execution ===")

    # Read PDF file
    with open(pdf_path, "rb") as f:
        pdf_data = base64.b64encode(f.read()).decode()

    # Execute using generic method
    print("Executing workflow: pdf-to-html")
    result = client.workflows.execute(
        workflow_id="pdf-to-html",
        inputs={
            "pdf_data": pdf_data,
            "include_styles": True,
            "title": "Custom Workflow Example"
        }
    )

    if result['success']:
        print(f"✓ Workflow successful")
        print(f"  Result keys: {list(result['result'].keys())}")
    else:
        print(f"✗ Workflow failed: {result.get('error')}")


def health_check_example(client: ArtificerClient):
    """Check Prefect service health."""
    print("\n=== Prefect Health Check ===")

    health = client.workflows.health_check()

    print(f"Service available: {health['available']}")
    if 'version' in health:
        print(f"Version: {health['version']}")
    if 'uptime' in health:
        print(f"Uptime: {health['uptime']}")


def main():
    """Run all workflow examples."""
    # Initialize client
    client = ArtificerClient(
        api_url="http://localhost:3000",
        api_key=None  # For local development
    )

    print("=" * 60)
    print("Artificer Workflow Examples")
    print("=" * 60)

    # Check health
    health_check_example(client)

    # List available workflows
    list_available_workflows(client)

    # Note: Replace these paths with actual files for testing
    pdf_path = "sample.pdf"
    image_path = "sample.jpg"
    pdf_dir = "sample_pdfs/"

    # Uncomment examples as needed:

    # PDF to HTML
    # if Path(pdf_path).exists():
    #     pdf_to_html_example(client, pdf_path)

    # PDF with OCR
    # if Path(pdf_path).exists():
    #     pdf_with_ocr_example(client, pdf_path)

    # Batch PDF processing
    # if Path(pdf_dir).exists():
    #     batch_pdf_example(client, pdf_dir)

    # Image OCR
    # if Path(image_path).exists():
    #     image_ocr_example(client, image_path)

    # Translation
    # translation_example(client)

    # Batch translation
    # batch_translation_example(client)

    # Markdown conversion
    # markdown_conversion_example(client)

    # Custom workflow
    # if Path(pdf_path).exists():
    #     custom_workflow_example(client, pdf_path)

    print("\n" + "=" * 60)
    print("Examples complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
