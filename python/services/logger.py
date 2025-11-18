"""
Enhanced structured logging for Python microservice.

Provides JSON-formatted logs with request IDs, performance markers, and structured fields.
"""

import logging
import json
import time
import uuid
from typing import Any, Dict, Optional
from contextvars import ContextVar
from datetime import datetime


# Context variable for request ID (thread-safe)
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


class StructuredFormatter(logging.Formatter):
    """
    JSON formatter for structured logging.

    Outputs logs in JSON format with consistent fields:
    - timestamp: ISO 8601 timestamp
    - level: Log level (INFO, WARNING, ERROR, etc.)
    - message: Log message
    - request_id: Current request ID (if available)
    - service: Service name
    - extra fields: Any additional fields passed via extra parameter
    """

    def __init__(self, service_name: str = "python-microservice"):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "service": self.service_name,
            "message": record.getMessage(),
        }

        # Add request ID if available
        request_id = request_id_var.get()
        if request_id:
            log_data["requestId"] = request_id

        # Add logger name (module path)
        if record.name:
            log_data["logger"] = record.name

        # Add function and line number for debugging
        if record.funcName:
            log_data["function"] = record.funcName
        if record.lineno:
            log_data["line"] = record.lineno

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add any extra fields
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)

        return json.dumps(log_data)


class StructuredLogger:
    """
    Wrapper around logging.Logger for structured logging.

    Provides helper methods for common logging patterns with structured fields.
    """

    def __init__(self, name: str):
        self.logger = logging.getLogger(name)

    def _log_with_fields(
        self, level: int, message: str, fields: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log message with additional structured fields."""
        extra = {"extra_fields": fields} if fields else {}
        self.logger.log(level, message, extra=extra)

    def info(self, message: str, **fields: Any) -> None:
        """Log INFO message with structured fields."""
        self._log_with_fields(logging.INFO, message, fields if fields else None)

    def warning(self, message: str, **fields: Any) -> None:
        """Log WARNING message with structured fields."""
        self._log_with_fields(logging.WARNING, message, fields if fields else None)

    def error(self, message: str, **fields: Any) -> None:
        """Log ERROR message with structured fields."""
        self._log_with_fields(logging.ERROR, message, fields if fields else None)

    def debug(self, message: str, **fields: Any) -> None:
        """Log DEBUG message with structured fields."""
        self._log_with_fields(logging.DEBUG, message, fields if fields else None)

    def exception(self, message: str, **fields: Any) -> None:
        """Log exception with structured fields."""
        self.logger.exception(message, extra={"extra_fields": fields} if fields else {})


def get_logger(name: str) -> StructuredLogger:
    """
    Get a structured logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        StructuredLogger instance
    """
    return StructuredLogger(name)


def setup_structured_logging(
    service_name: str = "python-microservice",
    level: int = logging.INFO,
    json_format: bool = True,
) -> None:
    """
    Configure structured logging for the entire application.

    Args:
        service_name: Name of the service for log identification
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
        json_format: Use JSON formatting (True) or plain text (False)
    """
    # Create root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)

    # Set formatter
    if json_format:
        formatter = StructuredFormatter(service_name=service_name)
    else:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)


def set_request_id(request_id: Optional[str] = None) -> str:
    """
    Set the request ID for the current context.

    Args:
        request_id: Request ID to set (generates UUID if None)

    Returns:
        The request ID that was set
    """
    if request_id is None:
        request_id = str(uuid.uuid4())

    request_id_var.set(request_id)
    return request_id


def get_request_id() -> Optional[str]:
    """
    Get the current request ID.

    Returns:
        Current request ID or None if not set
    """
    return request_id_var.get()


def clear_request_id() -> None:
    """Clear the request ID from the current context."""
    request_id_var.set(None)


class PerformanceTimer:
    """
    Context manager for logging performance metrics.

    Usage:
        with PerformanceTimer("database_query"):
            # ... expensive operation ...
            pass
        # Automatically logs performance metrics
    """

    def __init__(
        self,
        operation: str,
        logger: Optional[StructuredLogger] = None,
        warn_threshold_ms: Optional[int] = None,
    ):
        """
        Initialize performance timer.

        Args:
            operation: Name of the operation being timed
            logger: Logger to use (creates default if None)
            warn_threshold_ms: Log warning if operation exceeds this threshold
        """
        self.operation = operation
        self.logger = logger or get_logger(__name__)
        self.warn_threshold_ms = warn_threshold_ms
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None

    def __enter__(self):
        """Start timer."""
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Stop timer and log performance."""
        self.end_time = time.time()
        duration_ms = int((self.end_time - self.start_time) * 1000)

        # Log at appropriate level
        if self.warn_threshold_ms and duration_ms > self.warn_threshold_ms:
            self.logger.warning(
                f"Slow operation: {self.operation}",
                operation=self.operation,
                duration_ms=duration_ms,
                threshold_ms=self.warn_threshold_ms,
            )
        else:
            self.logger.debug(
                f"Operation completed: {self.operation}",
                operation=self.operation,
                duration_ms=duration_ms,
            )

    def get_duration_ms(self) -> int:
        """Get the duration in milliseconds."""
        if self.start_time and self.end_time:
            return int((self.end_time - self.start_time) * 1000)
        return 0
