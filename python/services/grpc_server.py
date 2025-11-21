"""
gRPC Server for Artificer Python Microservice

Serves all gRPC services on a single port with server reflection.
Runs alongside FastAPI REST server for gradual migration.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))
# Add generated directory to path for protobuf imports
sys.path.insert(0, str(Path(__file__).parent.parent / "generated"))

import grpc
from concurrent import futures
import logging
import os
import signal
import time
from typing import Optional
from grpc_reflection.v1alpha import reflection

# Import service handlers
from services.grpc_handlers.conversion_service import ConversionServiceHandler
from services.grpc_handlers.metrics_service import MetricsServiceHandler
from services.grpc_handlers.pdf_service import PDFServiceHandler
from services.grpc_handlers.image_service import ImageServiceHandler
from services.grpc_handlers.text_service import TextServiceHandler

# Import generated servicers
from generated.artificer import conversion_service_pb2_grpc
from generated.artificer import metrics_service_pb2_grpc
from generated.artificer import pdf_service_pb2_grpc
from generated.artificer import image_service_pb2_grpc
from generated.artificer import text_service_pb2_grpc

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class GRPCServer:
    """gRPC server for Artificer services."""

    def __init__(
        self,
        port: int = 50051,
        max_workers: int = 10,
        tls_cert_path: Optional[str] = None,
        tls_key_path: Optional[str] = None,
        tls_ca_path: Optional[str] = None,
    ):
        """
        Initialize gRPC server.

        Args:
            port: Port to listen on (default: 50051)
            max_workers: Maximum thread pool workers (default: 10)
            tls_cert_path: Path to TLS certificate file (optional)
            tls_key_path: Path to TLS private key file (optional)
            tls_ca_path: Path to CA certificate for client auth (optional)
        """
        self.port = port
        self.max_workers = max_workers
        self.tls_cert_path = tls_cert_path
        self.tls_key_path = tls_key_path
        self.tls_ca_path = tls_ca_path
        self.server = None
        self.use_tls = bool(tls_cert_path and tls_key_path)

    def start(self):
        """Start the gRPC server."""
        # Create server with thread pool
        self.server = grpc.server(futures.ThreadPoolExecutor(max_workers=self.max_workers))

        # Register service handlers
        conversion_service_pb2_grpc.add_ConversionServiceServicer_to_server(
            ConversionServiceHandler(), self.server
        )
        metrics_service_pb2_grpc.add_MetricsServiceServicer_to_server(
            MetricsServiceHandler(), self.server
        )
        pdf_service_pb2_grpc.add_PDFServiceServicer_to_server(
            PDFServiceHandler(), self.server
        )
        image_service_pb2_grpc.add_ImageServiceServicer_to_server(
            ImageServiceHandler(), self.server
        )
        text_service_pb2_grpc.add_TextServiceServicer_to_server(
            TextServiceHandler(), self.server
        )

        # Enable server reflection for grpcurl/grpc_cli
        SERVICE_NAMES = (
            "artificer.ConversionService",
            "artificer.MetricsService",
            "artificer.PDFService",
            "artificer.ImageService",
            "artificer.TextService",
            reflection.SERVICE_NAME,
        )
        reflection.enable_server_reflection(SERVICE_NAMES, self.server)

        # Bind to port with optional TLS
        if self.use_tls:
            # Load TLS credentials
            with open(self.tls_key_path, "rb") as f:
                private_key = f.read()
            with open(self.tls_cert_path, "rb") as f:
                certificate_chain = f.read()

            # Optional client CA for mutual TLS
            root_certificates = None
            if self.tls_ca_path:
                with open(self.tls_ca_path, "rb") as f:
                    root_certificates = f.read()

            credentials = grpc.ssl_server_credentials(
                [(private_key, certificate_chain)],
                root_certificates=root_certificates,
                require_client_auth=bool(root_certificates),
            )
            self.server.add_secure_port(f"[::]:{self.port}", credentials)
            logger.info("TLS enabled with certificate authentication")
        else:
            self.server.add_insecure_port(f"[::]:{self.port}")
            logger.warning("Running in INSECURE mode - use TLS in production!")

        self.server.start()

        logger.info("=" * 60)
        logger.info("Artificer gRPC Server Starting")
        logger.info("=" * 60)
        logger.info(f"Listening on port: {self.port}")
        logger.info(f"Max workers: {self.max_workers}")
        logger.info("Services:")
        logger.info("  - ConversionService (7 RPCs)")
        logger.info("  - MetricsService (2 RPCs)")
        logger.info("  - PDFService (4 RPCs)")
        logger.info("  - ImageService (2 RPCs)")
        logger.info("  - TextService (6 RPCs)")
        logger.info("Total: 21 RPCs across 5 services")
        logger.info("Server reflection: Enabled")
        logger.info("=" * 60)

    def stop(self, grace: int = 10):
        """
        Stop the gRPC server.

        Args:
            grace: Grace period in seconds for shutdown (default: 10)
        """
        if self.server:
            logger.info(f"Shutting down gRPC server (grace period: {grace}s)...")
            self.server.stop(grace)
            logger.info("gRPC server stopped")

    def wait_for_termination(self):
        """Block until server terminates."""
        if self.server:
            self.server.wait_for_termination()


def serve():
    """Run the gRPC server."""
    # Get configuration from environment
    port = int(os.getenv("GRPC_PORT", "50051"))
    max_workers = int(os.getenv("GRPC_MAX_WORKERS", "10"))

    # TLS configuration (optional)
    tls_cert_path = os.getenv("GRPC_TLS_CERT")
    tls_key_path = os.getenv("GRPC_TLS_KEY")
    tls_ca_path = os.getenv("GRPC_TLS_CA")  # For mutual TLS

    # Create and start server
    grpc_server = GRPCServer(
        port=port,
        max_workers=max_workers,
        tls_cert_path=tls_cert_path,
        tls_key_path=tls_key_path,
        tls_ca_path=tls_ca_path,
    )
    grpc_server.start()

    # Handle graceful shutdown
    def signal_handler(sig, frame):
        logger.info(f"Received signal {sig}, initiating graceful shutdown...")
        grpc_server.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Wait for termination
    try:
        grpc_server.wait_for_termination()
    except KeyboardInterrupt:
        grpc_server.stop()


if __name__ == "__main__":
    serve()
