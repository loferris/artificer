"""
Main ArtificerClient class - entry point for the SDK.
"""

import sys
from pathlib import Path
from typing import Optional

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "generated"))

import grpc

from artificer_sdk.clients.conversion import ConversionClient
from artificer_sdk.clients.pdf import PDFClient
from artificer_sdk.clients.image import ImageClient
from artificer_sdk.clients.text import TextClient
from artificer_sdk.clients.metrics import MetricsClient


class ArtificerClient:
    """
    Main client for Artificer gRPC services.

    Provides access to all Artificer services through a single interface:
    - conversion: Document import/export (markdown, HTML, Notion, Roam)
    - pdf: PDF processing and OCR
    - image: Image processing and OCR
    - text: Text chunking and token counting
    - metrics: Service metrics and health checks

    Usage:
        # Basic usage
        client = ArtificerClient("localhost:50051")
        result = client.conversion.import_markdown("# Hello World")
        client.close()

        # Context manager (recommended)
        with ArtificerClient("localhost:50051") as client:
            result = client.conversion.import_markdown("# Hello World")
            print(result["document"])

        # Custom channel options
        client = ArtificerClient(
            "localhost:50051",
            options=[
                ('grpc.max_receive_message_length', 100 * 1024 * 1024),
            ]
        )
    """

    def __init__(
        self,
        target: str = "localhost:50051",
        options: Optional[list] = None,
        credentials: Optional[grpc.ChannelCredentials] = None,
    ):
        """
        Initialize Artificer client.

        Args:
            target: gRPC server address (default: 'localhost:50051')
            options: gRPC channel options (optional)
            credentials: gRPC credentials for secure connections (optional)

        Example channel options:
            [
                ('grpc.max_receive_message_length', 100 * 1024 * 1024),
                ('grpc.max_send_message_length', 100 * 1024 * 1024),
                ('grpc.keepalive_time_ms', 10000),
            ]
        """
        self.target = target
        self.options = options or []
        self.credentials = credentials
        self._channel: Optional[grpc.Channel] = None

        # Client instances (lazy initialization)
        self._conversion: Optional[ConversionClient] = None
        self._pdf: Optional[PDFClient] = None
        self._image: Optional[ImageClient] = None
        self._text: Optional[TextClient] = None
        self._metrics: Optional[MetricsClient] = None

    @property
    def channel(self) -> grpc.Channel:
        """Get or create gRPC channel."""
        if self._channel is None:
            if self.credentials:
                self._channel = grpc.secure_channel(
                    self.target, self.credentials, options=self.options
                )
            else:
                self._channel = grpc.insecure_channel(self.target, options=self.options)

        return self._channel

    @property
    def conversion(self) -> ConversionClient:
        """Get ConversionClient instance."""
        if self._conversion is None:
            self._conversion = ConversionClient(self.channel)
        return self._conversion

    @property
    def pdf(self) -> PDFClient:
        """Get PDFClient instance."""
        if self._pdf is None:
            self._pdf = PDFClient(self.channel)
        return self._pdf

    @property
    def image(self) -> ImageClient:
        """Get ImageClient instance."""
        if self._image is None:
            self._image = ImageClient(self.channel)
        return self._image

    @property
    def text(self) -> TextClient:
        """Get TextClient instance."""
        if self._text is None:
            self._text = TextClient(self.channel)
        return self._text

    @property
    def metrics(self) -> MetricsClient:
        """Get MetricsClient instance."""
        if self._metrics is None:
            self._metrics = MetricsClient(self.channel)
        return self._metrics

    def close(self):
        """Close the gRPC channel."""
        if self._channel is not None:
            self._channel.close()
            self._channel = None

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
        return False

    def __del__(self):
        """Cleanup on deletion."""
        self.close()
