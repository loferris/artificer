"""
Metrics collection and monitoring for Python microservice.

Provides request tracking, performance monitoring, and fallback rate analysis.
Lightweight in-memory implementation with no external dependencies.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
from threading import Lock
import time
import statistics
import uuid


@dataclass
class EndpointMetrics:
    """Metrics for a single endpoint."""

    request_count: int = 0
    processing_times: List[float] = field(default_factory=list)
    error_count: int = 0
    last_request: Optional[str] = None  # ISO timestamp

    def add_request(self, processing_time: float, error: bool = False) -> None:
        """Record a request."""
        self.request_count += 1
        self.processing_times.append(processing_time)
        if error:
            self.error_count += 1
        self.last_request = datetime.utcnow().isoformat()

    def get_stats(self) -> Dict[str, Any]:
        """Get statistical summary."""
        if not self.processing_times:
            return {
                "requestCount": self.request_count,
                "errorCount": self.error_count,
                "lastRequest": self.last_request,
                "avgProcessingTime": 0,
                "p50": 0,
                "p95": 0,
                "p99": 0,
            }

        times = self.processing_times[-1000:]  # Keep last 1000 samples
        sorted_times = sorted(times)

        return {
            "requestCount": self.request_count,
            "errorCount": self.error_count,
            "errorRate": round(self.error_count / self.request_count, 4) if self.request_count > 0 else 0,
            "lastRequest": self.last_request,
            "avgProcessingTime": round(statistics.mean(times), 2),
            "p50": round(statistics.median(times), 2),
            "p95": round(sorted_times[int(len(sorted_times) * 0.95)], 2) if len(sorted_times) > 0 else 0,
            "p99": round(sorted_times[int(len(sorted_times) * 0.99)], 2) if len(sorted_times) > 0 else 0,
            "minTime": round(min(times), 2),
            "maxTime": round(max(times), 2),
        }


class MetricsCollector:
    """
    Collects and aggregates metrics for the Python microservice.

    Thread-safe singleton for tracking requests, performance, and fallback rates.
    """

    _instance = None
    _lock = Lock()

    def __new__(cls):
        """Singleton pattern."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize metrics storage."""
        if not hasattr(self, 'initialized'):
            self.endpoints: Dict[str, EndpointMetrics] = {}
            self.start_time = datetime.utcnow()
            self.initialized = True

    def record_request(
        self,
        endpoint: str,
        processing_time: float,
        error: bool = False
    ) -> None:
        """
        Record a request for an endpoint.

        Args:
            endpoint: Endpoint identifier (e.g., "/api/export/markdown")
            processing_time: Time in milliseconds
            error: Whether the request resulted in an error
        """
        with self._lock:
            if endpoint not in self.endpoints:
                self.endpoints[endpoint] = EndpointMetrics()

            self.endpoints[endpoint].add_request(processing_time, error)

    def get_metrics(self) -> Dict[str, Any]:
        """
        Get complete metrics summary.

        Returns:
            Dictionary with all collected metrics
        """
        with self._lock:
            uptime_seconds = (datetime.utcnow() - self.start_time).total_seconds()

            total_requests = sum(m.request_count for m in self.endpoints.values())
            total_errors = sum(m.error_count for m in self.endpoints.values())

            all_times = []
            for metrics in self.endpoints.values():
                all_times.extend(metrics.processing_times[-1000:])

            return {
                "service": "python-microservice",
                "version": "0.1.0",
                "uptime": {
                    "seconds": int(uptime_seconds),
                    "formatted": self._format_uptime(uptime_seconds),
                    "startTime": self.start_time.isoformat(),
                },
                "overall": {
                    "totalRequests": total_requests,
                    "totalErrors": total_errors,
                    "errorRate": round(total_errors / total_requests, 4) if total_requests > 0 else 0,
                    "avgProcessingTime": round(statistics.mean(all_times), 2) if all_times else 0,
                    "requestsPerSecond": round(total_requests / uptime_seconds, 2) if uptime_seconds > 0 else 0,
                },
                "endpoints": {
                    endpoint: metrics.get_stats()
                    for endpoint, metrics in self.endpoints.items()
                },
            }

    def reset(self) -> None:
        """Reset all metrics (useful for testing)."""
        with self._lock:
            self.endpoints.clear()
            self.start_time = datetime.utcnow()

    @staticmethod
    def _format_uptime(seconds: float) -> str:
        """Format uptime in human-readable form."""
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)

        if days > 0:
            return f"{days}d {hours}h {minutes}m {secs}s"
        elif hours > 0:
            return f"{hours}h {minutes}m {secs}s"
        elif minutes > 0:
            return f"{minutes}m {secs}s"
        else:
            return f"{secs}s"


# Global singleton instance
metrics_collector = MetricsCollector()


class MetricsMiddleware:
    """
    ASGI middleware for automatic request tracking and request ID injection.

    Sets X-Request-ID header for request tracing and collects performance metrics.

    Usage:
        from fastapi import FastAPI
        from services.metrics import MetricsMiddleware

        app = FastAPI()
        app.add_middleware(MetricsMiddleware)
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        """Process request and track metrics."""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Generate request ID
        request_id = str(uuid.uuid4())

        # Add request ID to headers (available in logs)
        headers = dict(scope.get("headers", []))
        if b"x-request-id" not in headers:
            scope.setdefault("headers", [])
            scope["headers"].append((b"x-request-id", request_id.encode()))

        # Start timer
        start_time = time.time()

        # Extract endpoint path
        path = scope.get("path", "unknown")

        # Track if error occurred
        error_occurred = False
        status_code = 200

        async def send_wrapper(message):
            """Wrapper to detect errors and add request ID to response headers."""
            nonlocal error_occurred, status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 200)
                if status_code >= 400:
                    error_occurred = True

                # Add request ID to response headers
                headers = message.get("headers", [])
                headers.append((b"x-request-id", request_id.encode()))
                message["headers"] = headers

            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            error_occurred = True
            raise
        finally:
            # Record metrics
            processing_time = (time.time() - start_time) * 1000  # Convert to ms
            metrics_collector.record_request(path, processing_time, error_occurred)
