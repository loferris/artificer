"""
Dual REST + gRPC Server for Artificer Python Microservice

Runs both FastAPI (REST) and gRPC servers simultaneously for gradual migration.
- FastAPI on port 8000 (or PYTHON_OCR_PORT env var)
- gRPC on port 50051 (or GRPC_PORT env var)

This allows clients to use either protocol during the transition period.
"""

import sys
from pathlib import Path
import os
import signal
import multiprocessing
import logging
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def run_fastapi_server():
    """Run FastAPI REST server in a separate process."""
    # Add parent directory to path
    sys.path.insert(0, str(Path(__file__).parent.parent))

    from services.ocr_service import app

    port = int(os.getenv("PYTHON_OCR_PORT", "8000"))
    host = os.getenv("PYTHON_OCR_HOST", "0.0.0.0")

    logger.info(f"Starting FastAPI REST server on {host}:{port}")

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True,
    )


def run_grpc_server():
    """Run gRPC server in a separate process."""
    # Add parent directory to path
    sys.path.insert(0, str(Path(__file__).parent.parent))

    from services.grpc_server import serve

    logger.info("Starting gRPC server")
    serve()


def main():
    """Run both servers in parallel using multiprocessing."""
    logger.info("=" * 60)
    logger.info("Artificer Dual Server (REST + gRPC)")
    logger.info("=" * 60)
    logger.info("Starting both FastAPI (REST) and gRPC servers...")
    logger.info("Press Ctrl+C to shutdown both servers")
    logger.info("=" * 60)

    # Create processes for each server
    fastapi_process = multiprocessing.Process(
        target=run_fastapi_server, name="FastAPI-REST"
    )
    grpc_process = multiprocessing.Process(target=run_grpc_server, name="gRPC")

    # Start both servers
    fastapi_process.start()
    grpc_process.start()

    def signal_handler(sig, frame):
        """Handle shutdown signals gracefully."""
        logger.info("\nReceived shutdown signal, stopping servers...")

        # Terminate processes
        if fastapi_process.is_alive():
            fastapi_process.terminate()
            fastapi_process.join(timeout=5)
            if fastapi_process.is_alive():
                fastapi_process.kill()

        if grpc_process.is_alive():
            grpc_process.terminate()
            grpc_process.join(timeout=5)
            if grpc_process.is_alive():
                grpc_process.kill()

        logger.info("Both servers stopped")
        sys.exit(0)

    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Wait for processes
    try:
        fastapi_process.join()
        grpc_process.join()
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)


if __name__ == "__main__":
    # Set start method for multiprocessing
    multiprocessing.set_start_method("spawn", force=True)
    main()
