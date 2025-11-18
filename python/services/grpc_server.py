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
# NOTE: grpc_reflection temporarily disabled due to import issues
# from grpc_reflection.v1alpha import reflection

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

    def __init__(self, port: int = 50051, max_workers: int = 10):
        """
        Initialize gRPC server.

        Args:
            port: Port to listen on (default: 50051)
            max_workers: Maximum thread pool workers (default: 10)
        """
        self.port = port
        self.max_workers = max_workers
        self.server = None

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

        # Enable server reflection for grpcurl/grpc_cli (temporarily disabled)
        # SERVICE_NAMES = (
        #     "artificer.ConversionService",
        #     "artificer.MetricsService",
        #     reflection.SERVICE_NAME,
        # )
        # reflection.enable_server_reflection(SERVICE_NAMES, self.server)

        # Bind to port and start
        self.server.add_insecure_port(f"[::]:{self.port}")
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
        logger.info("Server reflection: Disabled (TODO: fix import issue)")
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

    # Create and start server
    grpc_server = GRPCServer(port=port, max_workers=max_workers)
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
