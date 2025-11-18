"""
Artificer Python Client

Unified client for Artificer API providing access to:
- Projects and documents
- Semantic search
- Conversations and chat
- Batch processing
- OCR and image processing
- Export to multiple formats
"""

from typing import Optional
import requests
from .resources import (
    Projects,
    Conversations,
    Search,
    Chat,
    Batch,
    Images,
    Export,
    Monitoring,
)
from .exceptions import ArtificerError


class ArtificerClient:
    """
    Artificer API client.

    Provides high-level access to all Artificer features with automatic:
    - Authentication via API key
    - Retry logic with exponential backoff
    - Error handling
    - Type hints

    Example:
        >>> from artificer_client import ArtificerClient
        >>>
        >>> client = ArtificerClient(
        ...     api_url="http://localhost:3000",
        ...     api_key="sk_your_key_here"
        ... )
        >>>
        >>> # Create project
        >>> project = client.projects.create("Knowledge Base")
        >>>
        >>> # Upload document (auto-processed with embeddings)
        >>> with open("doc.pdf", "rb") as f:
        ...     doc = client.projects.upload_document(
        ...         project['project']['id'],
        ...         "doc.pdf",
        ...         f.read(),
        ...         "application/pdf"
        ...     )
        >>>
        >>> # Semantic search
        >>> results = client.search.search_documents(
        ...     project['project']['id'],
        ...     "key information",
        ...     limit=5
        ... )
        >>>
        >>> # Chat with context
        >>> conv = client.conversations.create(
        ...     "Q&A",
        ...     project_id=project['project']['id']
        ... )
        >>> response = client.chat.send_message(
        ...     conv['conversation']['id'],
        ...     "Summarize the key points"
        ... )
    """

    def __init__(
        self,
        api_url: str = "http://localhost:3000",
        api_key: Optional[str] = None,
        timeout: int = 60,
        max_retries: int = 3
    ):
        """
        Initialize Artificer client.

        Args:
            api_url: Base API URL (default: http://localhost:3000)
            api_key: API key for authentication (required for production)
            timeout: Request timeout in seconds (default: 60)
            max_retries: Maximum retry attempts (default: 3)
        """
        self._base_url = api_url.rstrip('/')
        self._timeout = timeout
        self._max_retries = max_retries

        # Create session with authentication
        self._session = requests.Session()
        if api_key:
            self._session.headers["Authorization"] = f"Bearer {api_key}"

        self._session.headers["Content-Type"] = "application/json"
        self._session.headers["User-Agent"] = "artificer-python-client/1.0.0"

        # Initialize resource clients
        self.projects = Projects(self)
        self.conversations = Conversations(self)
        self.search = Search(self)
        self.chat = Chat(self)
        self.batch = Batch(self)
        self.images = Images(self)
        self.export = Export(self)
        self.monitoring = Monitoring(self)

    def __enter__(self):
        """Context manager support."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager cleanup."""
        self.close()

    def close(self):
        """Close the client session."""
        self._session.close()

    def health_check(self) -> dict:
        """
        Quick health check.

        Returns:
            Health status

        Example:
            >>> health = client.health_check()
            >>> print(f"Status: {health['status']}")
        """
        return self.monitoring.get_health()
