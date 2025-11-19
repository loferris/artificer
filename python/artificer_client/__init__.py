"""
Artificer Python Client

A unified Python SDK for Artificer API.

Example:
    >>> from artificer_client import ArtificerClient
    >>>
    >>> client = ArtificerClient(
    ...     api_url="http://localhost:3000",
    ...     api_key="sk_your_key_here"
    ... )
    >>>
    >>> # Create project and upload document
    >>> project = client.projects.create("My Project")
    >>> with open("document.pdf", "rb") as f:
    ...     doc = client.projects.upload_document(
    ...         project['project']['id'],
    ...         "document.pdf",
    ...         f.read(),
    ...         "application/pdf"
    ...     )
    >>>
    >>> # Search with semantic similarity
    >>> results = client.search.search_documents(
    ...     project['project']['id'],
    ...     "find key information",
    ...     min_score=0.8
    ... )
"""

from .client import ArtificerClient
from .exceptions import (
    ArtificerError,
    APIError,
    AuthenticationError,
    NotFoundError,
    ValidationError,
    RateLimitError,
    ServiceUnavailableError,
)

__version__ = "1.0.0"

__all__ = [
    "ArtificerClient",
    "ArtificerError",
    "APIError",
    "AuthenticationError",
    "NotFoundError",
    "ValidationError",
    "RateLimitError",
    "ServiceUnavailableError",
]
