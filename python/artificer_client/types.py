"""
Type definitions for Artificer client
"""

from typing import TypedDict, Optional, List, Literal, Any
from datetime import datetime


# Projects
class Project(TypedDict, total=False):
    id: str
    name: str
    description: Optional[str]
    settings: dict
    createdAt: str
    updatedAt: str


class ProjectStats(TypedDict):
    conversationCount: int
    documentCount: int
    knowledgeEntityCount: int


# Documents
class Document(TypedDict, total=False):
    id: str
    projectId: str
    filename: str
    originalName: str
    contentType: str
    content: str
    size: int
    uploadedAt: str
    metadata: dict


# Conversations
class Conversation(TypedDict, total=False):
    id: str
    title: str
    model: str
    systemPrompt: Optional[str]
    temperature: float
    maxTokens: int
    projectId: Optional[str]
    messageCount: int
    createdAt: str
    updatedAt: str


# Messages
class Message(TypedDict, total=False):
    id: str
    conversationId: str
    role: Literal["user", "assistant", "system"]
    content: str
    model: Optional[str]
    tokensUsed: Optional[int]
    cost: Optional[float]
    createdAt: str


# Search
class SearchResult(TypedDict):
    documentId: str
    content: str
    score: float
    metadata: dict


class SearchResponse(TypedDict):
    query: str
    results: List[SearchResult]
    count: int


# Batch Jobs
BatchStatus = Literal["PENDING", "RUNNING", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"]


class BatchJobPhase(TypedDict, total=False):
    name: str
    taskType: Optional[str]
    model: Optional[str]
    useRAG: bool
    validation: dict


class BatchJobItem(TypedDict, total=False):
    input: str
    metadata: dict


class BatchJobProgress(TypedDict):
    totalItems: int
    completedItems: int
    failedItems: int
    percentComplete: float


class BatchJobAnalytics(TypedDict, total=False):
    costIncurred: float
    avgCostPerItem: float
    avgProcessingTimeMs: float
    totalProcessingTimeMs: float


class BatchJob(TypedDict, total=False):
    id: str
    name: str
    status: BatchStatus
    projectId: Optional[str]
    progress: BatchJobProgress
    analytics: BatchJobAnalytics
    createdAt: str
    updatedAt: str
    completedAt: Optional[str]


# Export
ExportFormat = Literal["markdown", "notion", "roam", "obsidian", "google-docs", "html", "json"]


class ExportOptions(TypedDict, total=False):
    format: ExportFormat
    includeMetadata: bool
    includeTimestamps: bool
    includeCosts: bool
    groupByConversation: bool


class ExportResult(TypedDict):
    format: ExportFormat
    data: str
    metadata: dict


# OCR/Images
class OCRResult(TypedDict):
    text: str
    confidence: float
    metadata: dict


class ImageConversionResult(TypedDict):
    imageData: bytes
    width: int
    height: int
    format: str
    sizeBytes: int


# Monitoring
class ServiceHealth(TypedDict):
    status: str
    service: str
    version: str
    uptime: dict
    processors: List[str]
