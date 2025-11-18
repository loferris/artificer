"""
MetricsClient for metrics and health check operations.
"""

import sys
from pathlib import Path
from typing import Dict, Any

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "generated"))

import grpc
from generated.artificer import metrics_service_pb2
from generated.artificer import metrics_service_pb2_grpc


class MetricsClient:
    """Client for metrics and health check operations."""

    def __init__(self, channel: grpc.Channel):
        """
        Initialize metrics client.

        Args:
            channel: gRPC channel to use for requests
        """
        self.stub = metrics_service_pb2_grpc.MetricsServiceStub(channel)

    def get_metrics(self) -> Dict[str, Any]:
        """
        Get service metrics and performance statistics.

        Returns:
            Dictionary with:
            - service: Service information containing:
                - name: Service name
                - version: Service version
                - uptime: Uptime information (seconds, formatted, start_time)
            - overall: Overall metrics containing:
                - total_requests: Total request count
                - total_errors: Total error count
                - error_rate: Error rate (0.0-1.0)
                - avg_processing_time_ms: Average processing time
                - requests_per_second: Request throughput
            - endpoints: Per-endpoint metrics dict containing:
                - request_count: Request count
                - error_count: Error count
                - error_rate: Error rate
                - last_request: Last request timestamp
                - avg_processing_time_ms: Average processing time
                - p50_ms: 50th percentile latency
                - p95_ms: 95th percentile latency
                - p99_ms: 99th percentile latency
                - min_time_ms: Minimum processing time
                - max_time_ms: Maximum processing time
        """
        request = metrics_service_pb2.GetMetricsRequest()

        response = self.stub.GetMetrics(request)

        # Convert service info
        service = {
            "name": response.service.name,
            "version": response.service.version,
            "uptime": {
                "seconds": response.service.uptime.seconds,
                "formatted": response.service.uptime.formatted,
                "start_time": response.service.uptime.start_time,
            },
        }

        # Convert overall metrics
        overall = {
            "total_requests": response.overall.total_requests,
            "total_errors": response.overall.total_errors,
            "error_rate": response.overall.error_rate,
            "avg_processing_time_ms": response.overall.avg_processing_time_ms,
            "requests_per_second": response.overall.requests_per_second,
        }

        # Convert endpoint metrics
        endpoints = {}
        for endpoint, metrics in response.endpoints.items():
            endpoints[endpoint] = {
                "request_count": metrics.request_count,
                "error_count": metrics.error_count,
                "error_rate": metrics.error_rate,
                "last_request": metrics.last_request,
                "avg_processing_time_ms": metrics.avg_processing_time_ms,
                "p50_ms": metrics.p50_ms,
                "p95_ms": metrics.p95_ms,
                "p99_ms": metrics.p99_ms,
                "min_time_ms": metrics.min_time_ms,
                "max_time_ms": metrics.max_time_ms,
            }

        return {"service": service, "overall": overall, "endpoints": endpoints}

    def health_check(self) -> Dict[str, Any]:
        """
        Perform health check.

        Returns:
            Dictionary with:
            - status: Health status ('ok' or 'unhealthy')
            - service: Service name
            - version: Service version
            - processors: Dict of processor availability flags:
                - pdf: PDF processor available
                - image: Image processor available
                - text: Text processor available
                - markdown: Markdown processor available
                - html: HTML processor available
                - ocr_openai: OpenAI OCR available
                - ocr_tesseract: Tesseract OCR available
        """
        request = metrics_service_pb2.HealthCheckRequest()

        response = self.stub.HealthCheck(request)

        return {
            "status": response.status,
            "service": response.service,
            "version": response.version,
            "processors": dict(response.processors),
        }
