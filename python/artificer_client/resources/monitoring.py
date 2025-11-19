"""
Monitoring resource
"""

from .base import BaseResource
from ..types import ServiceHealth


class Monitoring(BaseResource):
    """Monitoring API resource."""

    def get_health(self) -> ServiceHealth:
        """
        Get service health status.

        Returns:
            Service health information

        Example:
            >>> health = client.monitoring.get_health()
            >>> print(f"Status: {health['status']}")
        """
        return self._trpc_request("monitoring.getHealthStatus")

    def get_python_service_stats(self) -> dict:
        """
        Get Python microservice statistics.

        Shows Python service availability, circuit breaker state, etc.

        Returns:
            Python service statistics

        Example:
            >>> stats = client.monitoring.get_python_service_stats()
            >>> print(f"OCR available: {stats['ocr']['available']}")
            >>> print(f"Circuit state: {stats['ocr']['circuitBreaker']['state']}")
        """
        return self._trpc_request("monitoring.getPythonServiceStats")

    def get_usage_stats(self) -> dict:
        """
        Get model usage statistics.

        Returns:
            Usage statistics

        Example:
            >>> usage = client.monitoring.get_usage_stats()
            >>> for model, stats in usage.items():
            ...     print(f"{model}: {stats['requests']} requests")
        """
        return self._trpc_request("monitoring.getUsageStats")

    def get_model_capabilities(self) -> dict:
        """
        Get available model capabilities and pricing.

        Returns:
            Model capabilities

        Example:
            >>> caps = client.monitoring.get_model_capabilities()
            >>> for model in caps['models']:
            ...     print(f"{model['name']}: ${model['pricing']['input']} per 1M tokens")
        """
        return self._trpc_request("monitoring.getCapabilities")
