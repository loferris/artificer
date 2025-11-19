from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class GetMetricsRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class GetMetricsResponse(_message.Message):
    __slots__ = ("service", "overall", "endpoints")
    class EndpointsEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: EndpointMetrics
        def __init__(self, key: _Optional[str] = ..., value: _Optional[_Union[EndpointMetrics, _Mapping]] = ...) -> None: ...
    SERVICE_FIELD_NUMBER: _ClassVar[int]
    OVERALL_FIELD_NUMBER: _ClassVar[int]
    ENDPOINTS_FIELD_NUMBER: _ClassVar[int]
    service: ServiceInfo
    overall: OverallMetrics
    endpoints: _containers.MessageMap[str, EndpointMetrics]
    def __init__(self, service: _Optional[_Union[ServiceInfo, _Mapping]] = ..., overall: _Optional[_Union[OverallMetrics, _Mapping]] = ..., endpoints: _Optional[_Mapping[str, EndpointMetrics]] = ...) -> None: ...

class ServiceInfo(_message.Message):
    __slots__ = ("name", "version", "uptime")
    NAME_FIELD_NUMBER: _ClassVar[int]
    VERSION_FIELD_NUMBER: _ClassVar[int]
    UPTIME_FIELD_NUMBER: _ClassVar[int]
    name: str
    version: str
    uptime: Uptime
    def __init__(self, name: _Optional[str] = ..., version: _Optional[str] = ..., uptime: _Optional[_Union[Uptime, _Mapping]] = ...) -> None: ...

class Uptime(_message.Message):
    __slots__ = ("seconds", "formatted", "start_time")
    SECONDS_FIELD_NUMBER: _ClassVar[int]
    FORMATTED_FIELD_NUMBER: _ClassVar[int]
    START_TIME_FIELD_NUMBER: _ClassVar[int]
    seconds: int
    formatted: str
    start_time: str
    def __init__(self, seconds: _Optional[int] = ..., formatted: _Optional[str] = ..., start_time: _Optional[str] = ...) -> None: ...

class OverallMetrics(_message.Message):
    __slots__ = ("total_requests", "total_errors", "error_rate", "avg_processing_time_ms", "requests_per_second")
    TOTAL_REQUESTS_FIELD_NUMBER: _ClassVar[int]
    TOTAL_ERRORS_FIELD_NUMBER: _ClassVar[int]
    ERROR_RATE_FIELD_NUMBER: _ClassVar[int]
    AVG_PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    REQUESTS_PER_SECOND_FIELD_NUMBER: _ClassVar[int]
    total_requests: int
    total_errors: int
    error_rate: float
    avg_processing_time_ms: float
    requests_per_second: float
    def __init__(self, total_requests: _Optional[int] = ..., total_errors: _Optional[int] = ..., error_rate: _Optional[float] = ..., avg_processing_time_ms: _Optional[float] = ..., requests_per_second: _Optional[float] = ...) -> None: ...

class EndpointMetrics(_message.Message):
    __slots__ = ("request_count", "error_count", "error_rate", "last_request", "avg_processing_time_ms", "p50_ms", "p95_ms", "p99_ms", "min_time_ms", "max_time_ms")
    REQUEST_COUNT_FIELD_NUMBER: _ClassVar[int]
    ERROR_COUNT_FIELD_NUMBER: _ClassVar[int]
    ERROR_RATE_FIELD_NUMBER: _ClassVar[int]
    LAST_REQUEST_FIELD_NUMBER: _ClassVar[int]
    AVG_PROCESSING_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    P50_MS_FIELD_NUMBER: _ClassVar[int]
    P95_MS_FIELD_NUMBER: _ClassVar[int]
    P99_MS_FIELD_NUMBER: _ClassVar[int]
    MIN_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    MAX_TIME_MS_FIELD_NUMBER: _ClassVar[int]
    request_count: int
    error_count: int
    error_rate: float
    last_request: str
    avg_processing_time_ms: float
    p50_ms: float
    p95_ms: float
    p99_ms: float
    min_time_ms: float
    max_time_ms: float
    def __init__(self, request_count: _Optional[int] = ..., error_count: _Optional[int] = ..., error_rate: _Optional[float] = ..., last_request: _Optional[str] = ..., avg_processing_time_ms: _Optional[float] = ..., p50_ms: _Optional[float] = ..., p95_ms: _Optional[float] = ..., p99_ms: _Optional[float] = ..., min_time_ms: _Optional[float] = ..., max_time_ms: _Optional[float] = ...) -> None: ...

class HealthCheckRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class HealthCheckResponse(_message.Message):
    __slots__ = ("status", "service", "version", "processors")
    class ProcessorsEntry(_message.Message):
        __slots__ = ("key", "value")
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: bool
        def __init__(self, key: _Optional[str] = ..., value: bool = ...) -> None: ...
    STATUS_FIELD_NUMBER: _ClassVar[int]
    SERVICE_FIELD_NUMBER: _ClassVar[int]
    VERSION_FIELD_NUMBER: _ClassVar[int]
    PROCESSORS_FIELD_NUMBER: _ClassVar[int]
    status: str
    service: str
    version: str
    processors: _containers.ScalarMap[str, bool]
    def __init__(self, status: _Optional[str] = ..., service: _Optional[str] = ..., version: _Optional[str] = ..., processors: _Optional[_Mapping[str, bool]] = ...) -> None: ...
