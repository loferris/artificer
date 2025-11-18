"""
Webhook task helpers for calling external services.

These tasks wrap HTTP calls to external services (like FableForge)
and provide retry logic, timeout handling, and result validation.
"""

import httpx
from typing import Dict, Any, List, Optional
from prefect import task, get_run_logger
from prefect.task_runners import ConcurrentTaskRunner


@task(
    retries=3,
    retry_delay_seconds=[10, 30, 60],  # Exponential backoff
    timeout_seconds=60,
)
async def webhook_call(
    url: str,
    payload: Dict[str, Any],
    method: str = "POST",
    headers: Optional[Dict[str, str]] = None,
    timeout: float = 30.0,
) -> Dict[str, Any]:
    """
    Call a webhook endpoint with retry logic.

    Args:
        url: Webhook URL
        payload: JSON payload to send
        method: HTTP method (default: POST)
        headers: Optional HTTP headers
        timeout: Request timeout in seconds

    Returns:
        JSON response from webhook

    Raises:
        httpx.HTTPError: If request fails after retries
    """
    logger = get_run_logger()
    logger.info(f"Calling webhook: {url}")

    async with httpx.AsyncClient() as client:
        response = await client.request(
            method=method,
            url=url,
            json=payload,
            headers=headers or {},
            timeout=timeout,
        )
        response.raise_for_status()

        result = response.json()
        logger.info(f"Webhook call successful: {url}")
        return result


@task(
    retries=3,
    retry_delay_seconds=[10, 30, 60],
    timeout_seconds=60,
)
async def fableforge_refine(
    context: Dict[str, Any],
    specialist: str,
    base_url: str = "http://localhost:8080",
) -> Dict[str, Any]:
    """
    Call FableForge refinement specialist.

    Args:
        context: Translation context (text, language, metadata)
        specialist: Specialist type (cultural, prose, dialogue, narrative, fluency)
        base_url: FableForge service base URL

    Returns:
        Refinement result with improved translation
    """
    logger = get_run_logger()
    logger.info(f"Calling {specialist} specialist")

    url = f"{base_url}/refine"
    payload = {"context": context, "specialist": specialist}

    return await webhook_call(url, payload)


@task(
    retries=3,
    retry_delay_seconds=[10, 30, 60],
    timeout_seconds=120,
)
async def fableforge_tag(
    text: str, language: str, base_url: str = "http://localhost:8080"
) -> Dict[str, Any]:
    """
    Call FableForge tagging service.

    Args:
        text: Text to tag
        language: Language code (kor, jpn, chi)
        base_url: FableForge service base URL

    Returns:
        Tagged text with linguistic annotations
    """
    logger = get_run_logger()
    logger.info(f"Tagging text for language: {language}")

    url = f"{base_url}/tag"
    payload = {"text": text, "language": language}

    return await webhook_call(url, payload)


@task(
    retries=2,
    retry_delay_seconds=[5, 15],
    timeout_seconds=60,
)
async def fableforge_select_best(
    candidates: List[Dict[str, Any]], strategy: str = "ensemble"
) -> Dict[str, Any]:
    """
    Call FableForge selection service to pick best candidate.

    Args:
        candidates: List of refinement results from specialists
        strategy: Selection strategy (ensemble, vote, quality_score)

    Returns:
        Best candidate selected
    """
    logger = get_run_logger()
    logger.info(f"Selecting best from {len(candidates)} candidates using {strategy}")

    url = "http://localhost:8080/select"
    payload = {"candidates": candidates, "strategy": strategy}

    return await webhook_call(url, payload)


async def parallel_webhook_calls(
    urls: List[str],
    payloads: List[Dict[str, Any]],
    min_successful: Optional[int] = None,
    return_exceptions: bool = True,
) -> List[Any]:
    """
    Execute multiple webhook calls in parallel with partial failure handling.

    Args:
        urls: List of webhook URLs
        payloads: List of payloads (same length as urls)
        min_successful: Minimum number of successful calls required
        return_exceptions: Return exceptions instead of raising

    Returns:
        List of results (or exceptions if return_exceptions=True)

    Raises:
        ValueError: If fewer than min_successful calls succeed
    """
    logger = get_run_logger()
    logger.info(f"Executing {len(urls)} parallel webhook calls")

    # Submit all tasks
    futures = [
        webhook_call.submit(url, payload) for url, payload in zip(urls, payloads)
    ]

    # Collect results
    results = []
    exceptions = []

    for i, future in enumerate(futures):
        try:
            result = await future.result()
            results.append(result)
        except Exception as e:
            logger.warning(f"Webhook call {i} failed: {str(e)}")
            exceptions.append(e)
            if return_exceptions:
                results.append(e)

    # Check minimum successful threshold
    successful_count = len(results) - len(exceptions)
    if min_successful and successful_count < min_successful:
        raise ValueError(
            f"Only {successful_count}/{len(urls)} webhook calls succeeded, "
            f"need at least {min_successful}"
        )

    logger.info(
        f"Parallel webhook calls complete: {successful_count}/{len(urls)} successful"
    )
    return results
