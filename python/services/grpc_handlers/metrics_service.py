"""
gRPC MetricsService implementation.

Handles metrics and health check operations via gRPC.
"""

import sys
from pathlib import Path

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "generated"))

import grpc
from generated.artificer import metrics_service_pb2
from generated.artificer import metrics_service_pb2_grpc
from services.metrics import metrics_collector
from processors.pdf import PdfProcessor
from processors.ocr import OCRProcessor
from processors.image import ImageProcessor
from processors.text import TextProcessor
from processors.markdown import MarkdownConverter
from processors.html import HtmlExporter
import os


class MetricsServiceHandler(metrics_service_pb2_grpc.MetricsServiceServicer):
    """gRPC handler for metrics and health check operations."""

    def __init__(self):
        """Initialize metrics service."""
        # Initialize processors for health check
        self.ocr_processor = OCRProcessor(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            model=os.getenv("OCR_MODEL", "gpt-4o-mini"),
            use_tesseract_fallback=True,
        )

    def GetMetrics(
        self, request: metrics_service_pb2.GetMetricsRequest, context
    ) -> metrics_service_pb2.GetMetricsResponse:
        """Get service metrics and performance statistics."""
        try:
            metrics = metrics_collector.get_metrics()

            # Build service info
            service_info = metrics_service_pb2.ServiceInfo(
                name=metrics["service"],
                version=metrics["version"],
                uptime=metrics_service_pb2.Uptime(
                    seconds=metrics["uptime"]["seconds"],
                    formatted=metrics["uptime"]["formatted"],
                    start_time=metrics["uptime"]["startTime"],
                ),
            )

            # Build overall metrics
            overall = metrics_service_pb2.OverallMetrics(
                total_requests=metrics["overall"]["totalRequests"],
                total_errors=metrics["overall"]["totalErrors"],
                error_rate=metrics["overall"]["errorRate"],
                avg_processing_time_ms=metrics["overall"]["avgProcessingTime"],
                requests_per_second=metrics["overall"]["requestsPerSecond"],
            )

            # Build endpoint metrics
            endpoint_metrics = {}
            for endpoint, data in metrics["endpoints"].items():
                endpoint_metrics[endpoint] = metrics_service_pb2.EndpointMetrics(
                    request_count=data["requestCount"],
                    error_count=data["errorCount"],
                    error_rate=data.get("errorRate", 0.0),
                    last_request=data.get("lastRequest", ""),
                    avg_processing_time_ms=data["avgProcessingTime"],
                    p50_ms=data["p50"],
                    p95_ms=data["p95"],
                    p99_ms=data["p99"],
                    min_time_ms=data.get("minTime", 0.0),
                    max_time_ms=data.get("maxTime", 0.0),
                )

            return metrics_service_pb2.GetMetricsResponse(
                service=service_info, overall=overall, endpoints=endpoint_metrics
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Get metrics failed: {str(e)}")
            return metrics_service_pb2.GetMetricsResponse()

    def HealthCheck(
        self, request: metrics_service_pb2.HealthCheckRequest, context
    ) -> metrics_service_pb2.HealthCheckResponse:
        """Health check endpoint."""
        try:
            processors = {
                "pdf": True,
                "image": True,
                "text": True,
                "markdown": True,
                "html": True,
                "ocr_openai": self.ocr_processor.openai_client is not None,
                "ocr_tesseract": self.ocr_processor.tesseract_available,
            }

            return metrics_service_pb2.HealthCheckResponse(
                status="ok",
                service="artificer-python-grpc",
                version="0.1.0",
                processors=processors,
            )

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"Health check failed: {str(e)}")
            return metrics_service_pb2.HealthCheckResponse(
                status="unhealthy",
                service="artificer-python-grpc",
                version="0.1.0",
            )
