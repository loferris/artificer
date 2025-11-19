"""
Base resource class for API resources
"""

from typing import Optional, Any, Dict
import requests
from ..exceptions import (
    APIError,
    AuthenticationError,
    NotFoundError,
    ValidationError,
    RateLimitError,
    ServiceUnavailableError,
)


class BaseResource:
    """Base class for all API resources."""

    def __init__(self, client: "ArtificerClient"):
        self._client = client
        self._session = client._session
        self._base_url = client._base_url

    def _request(
        self,
        method: str,
        path: str,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Any:
        """
        Make an HTTP request with error handling.

        Args:
            method: HTTP method (GET, POST, etc.)
            path: API path (relative to base URL)
            json: JSON body
            params: Query parameters
            **kwargs: Additional requests kwargs

        Returns:
            Response JSON data

        Raises:
            ArtificerError: On API errors
        """
        url = f"{self._base_url}{path}"

        try:
            response = self._session.request(
                method=method,
                url=url,
                json=json,
                params=params,
                timeout=self._client._timeout,
                **kwargs
            )

            # Handle HTTP errors
            if response.status_code == 401:
                raise AuthenticationError("Invalid API key or unauthorized")
            elif response.status_code == 404:
                raise NotFoundError(
                    f"Resource not found: {path}",
                    response=response.json() if response.content else None
                )
            elif response.status_code == 400:
                raise ValidationError(
                    response.json().get("error", {}).get("message", "Validation failed"),
                    response=response.json() if response.content else None
                )
            elif response.status_code == 429:
                raise RateLimitError(
                    "Rate limit exceeded",
                    response=response.json() if response.content else None
                )
            elif response.status_code == 503:
                raise ServiceUnavailableError(
                    "Service temporarily unavailable",
                    response=response.json() if response.content else None
                )
            elif not response.ok:
                raise APIError(
                    f"API request failed: {response.status_code}",
                    status_code=response.status_code,
                    response=response.json() if response.content else None
                )

            # Return JSON response
            if response.content:
                return response.json()
            return None

        except requests.RequestException as e:
            raise APIError(f"Request failed: {str(e)}")

    def _trpc_request(
        self,
        procedure: str,
        input_data: Optional[Dict[str, Any]] = None,
        method: str = "POST"
    ) -> Any:
        """
        Make a tRPC-formatted request.

        Args:
            procedure: tRPC procedure name (e.g., "projects.create")
            input_data: Input data for the procedure
            method: HTTP method

        Returns:
            Result data from tRPC response
        """
        path = f"/api/trpc/{procedure}"

        # tRPC wraps input in {"input": {...}}
        json_data = {"input": input_data or {}} if input_data is not None else None

        response = self._request(method, path, json=json_data)

        # tRPC wraps result in {"result": {"data": ...}}
        if response and "result" in response:
            return response["result"].get("data")

        return response
