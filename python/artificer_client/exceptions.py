"""
Artificer Client Exceptions
"""


class ArtificerError(Exception):
    """Base exception for Artificer client errors."""
    pass


class APIError(ArtificerError):
    """API request failed."""

    def __init__(self, message: str, status_code: int = None, response: dict = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class AuthenticationError(ArtificerError):
    """Authentication failed (invalid API key)."""
    pass


class NotFoundError(APIError):
    """Resource not found (404)."""

    def __init__(self, message: str, response: dict = None):
        super().__init__(message, status_code=404, response=response)


class ValidationError(APIError):
    """Request validation failed (400)."""

    def __init__(self, message: str, response: dict = None):
        super().__init__(message, status_code=400, response=response)


class RateLimitError(APIError):
    """Rate limit exceeded (429)."""

    def __init__(self, message: str, response: dict = None):
        super().__init__(message, status_code=429, response=response)


class ServiceUnavailableError(APIError):
    """Service temporarily unavailable (503)."""

    def __init__(self, message: str, response: dict = None):
        super().__init__(message, status_code=503, response=response)
