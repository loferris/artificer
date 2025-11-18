"""
Artificer Python SDK

High-level client library for interacting with Artificer gRPC services.

Usage:
    from artificer_sdk import ArtificerClient

    client = ArtificerClient(host="localhost", port=50051)

    # Import markdown
    result = client.conversion.import_markdown("# Hello World")

    # Export to HTML
    html = client.conversion.export_html(result.document)

    # Process PDF
    with open("document.pdf", "rb") as f:
        text = client.pdf.extract_text(f.read())
"""

from artificer_sdk.client import ArtificerClient
from artificer_sdk.version import __version__
from artificer_sdk.clients.conversion import ConversionClient
from artificer_sdk.clients.pdf import PDFClient
from artificer_sdk.clients.image import ImageClient
from artificer_sdk.clients.text import TextClient
from artificer_sdk.clients.metrics import MetricsClient

__all__ = [
    "ArtificerClient",
    "__version__",
    "ConversionClient",
    "PDFClient",
    "ImageClient",
    "TextClient",
    "MetricsClient",
]
