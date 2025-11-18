"""
Projects resource
"""

from typing import List, Optional, Dict, Any
import base64
from .base import BaseResource
from ..types import Project, Document


class Projects(BaseResource):
    """Projects API resource."""

    def create(
        self,
        name: str,
        description: Optional[str] = None,
        settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new project.

        Args:
            name: Project name (1-100 characters)
            description: Project description (max 500 characters)
            settings: Project settings dictionary

        Returns:
            Created project data

        Example:
            >>> project = client.projects.create(
            ...     name="Knowledge Base",
            ...     description="RAG vector database"
            ... )
        """
        return self._trpc_request("projects.create", {
            "name": name,
            "description": description,
            "settings": settings or {}
        })

    def list(self) -> List[Project]:
        """
        List all projects.

        Returns:
            List of projects

        Example:
            >>> projects = client.projects.list()
            >>> for project in projects:
            ...     print(project['name'])
        """
        return self._trpc_request("projects.list")

    def get(self, project_id: str) -> Project:
        """
        Get project by ID.

        Args:
            project_id: Project ID

        Returns:
            Project data

        Example:
            >>> project = client.projects.get("proj_123")
        """
        return self._trpc_request("projects.getById", {"id": project_id})

    def update(
        self,
        project_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Update a project.

        Args:
            project_id: Project ID
            name: New project name
            description: New description
            settings: New settings

        Returns:
            Updated project data
        """
        data = {"id": project_id}
        if name is not None:
            data["name"] = name
        if description is not None:
            data["description"] = description
        if settings is not None:
            data["settings"] = settings

        return self._trpc_request("projects.update", data)

    def delete(self, project_id: str) -> Dict[str, Any]:
        """
        Delete a project.

        Args:
            project_id: Project ID

        Returns:
            Deletion confirmation
        """
        return self._trpc_request("projects.delete", {"id": project_id})

    def upload_document(
        self,
        project_id: str,
        filename: str,
        content: bytes,
        content_type: str = "application/octet-stream"
    ) -> Dict[str, Any]:
        """
        Upload a document to a project.

        The document will be automatically:
        - Text extracted (with OCR if needed via Python service - 10-20x faster)
        - Chunked (via Python service - 3-5x faster)
        - Embedded (OpenAI text-embedding-3-small)
        - Stored in vector DB (Chroma)

        Args:
            project_id: Project ID
            filename: Document filename
            content: Document content as bytes
            content_type: MIME type (e.g., "application/pdf", "image/png")

        Returns:
            Document metadata

        Example:
            >>> with open("document.pdf", "rb") as f:
            ...     doc = client.projects.upload_document(
            ...         "proj_123",
            ...         "document.pdf",
            ...         f.read(),
            ...         "application/pdf"
            ...     )
        """
        # Encode content as base64
        encoded_content = base64.b64encode(content).decode('utf-8')

        return self._trpc_request("projects.uploadDocument", {
            "projectId": project_id,
            "filename": filename,
            "content": encoded_content,
            "contentType": content_type
        })

    def list_documents(self, project_id: str) -> List[Document]:
        """
        List all documents in a project.

        Args:
            project_id: Project ID

        Returns:
            List of documents

        Example:
            >>> docs = client.projects.list_documents("proj_123")
        """
        return self._trpc_request("projects.getDocuments", {"projectId": project_id})

    def get_document(self, document_id: str) -> Document:
        """
        Get a document by ID.

        Args:
            document_id: Document ID

        Returns:
            Document data
        """
        return self._trpc_request("projects.getDocument", {"id": document_id})

    def delete_document(self, document_id: str) -> Dict[str, Any]:
        """
        Delete a document.

        Args:
            document_id: Document ID

        Returns:
            Deletion confirmation
        """
        return self._trpc_request("projects.deleteDocument", {"id": document_id})

    def get_stats(self, project_id: str) -> Dict[str, Any]:
        """
        Get project statistics.

        Args:
            project_id: Project ID

        Returns:
            Project statistics (document count, etc.)
        """
        return self._trpc_request("projects.getDocumentStats", {"projectId": project_id})
