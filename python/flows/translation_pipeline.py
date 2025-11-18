"""
Translation Pipeline Flow - FableForge Example

This flow demonstrates the full translation pipeline with:
- Sequential stages (cleanup → tagging)
- Parallel refinement (5 specialists running concurrently)
- Partial failure handling (min 3/5 specialists must succeed)
- Fan-in selection (pick best candidate)

Architecture:
    cleanup → tagging → [5 parallel specialists] → selection → final output
"""

import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from prefect import flow, get_run_logger
from prefect.task_runners import ConcurrentTaskRunner
from flows.tasks.webhook_tasks import fableforge_refine, fableforge_tag, fableforge_select_best


@flow(
    name="translation-pipeline",
    description="Full translation pipeline with parallel specialist refinement",
    task_runner=ConcurrentTaskRunner(),
    retries=1,
    retry_delay_seconds=30,
)
async def translation_pipeline(
    text: str,
    language: str,
    min_successful_specialists: int = 3,
    selection_strategy: str = "ensemble",
) -> Dict[str, Any]:
    """
    Execute full translation pipeline.

    This pipeline demonstrates the FableForge multi-specialist approach:
    1. Cleanup: Basic text normalization
    2. Tagging: Linguistic annotation
    3. Refinement: 5 specialists in parallel (cultural, prose, dialogue, narrative, fluency)
    4. Selection: Pick best candidate from successful specialists

    Args:
        text: Raw text to translate
        language: Language code (kor, jpn, chi)
        min_successful_specialists: Minimum specialists that must succeed (default: 3/5)
        selection_strategy: How to select best candidate (ensemble, vote, quality_score)

    Returns:
        Final translation with metadata about the pipeline execution
    """
    logger = get_run_logger()
    logger.info(
        f"Starting translation pipeline for {len(text)} chars in language '{language}'"
    )

    # Stage 1: Cleanup (sequential)
    logger.info("Stage 1: Cleanup")
    # For demo, using a simple cleanup - in production this would call cleanup service
    cleaned_text = text.strip()

    # Stage 2: Tagging (sequential)
    logger.info("Stage 2: Tagging")
    tagged_result = await fableforge_tag(cleaned_text, language)
    tagged_text = tagged_result["tagged_text"]

    # Stage 3: Parallel Refinement (fan-out)
    logger.info("Stage 3: Parallel Refinement (5 specialists)")
    specialists = ["cultural", "prose", "dialogue", "narrative", "fluency"]

    # Submit all specialist tasks in parallel
    refinement_futures = [
        fableforge_refine.submit(
            context={"text": tagged_text, "language": language}, specialist=spec
        )
        for spec in specialists
    ]

    # Collect results with partial failure handling
    successful_results = []
    failed_specialists = []

    for specialist, future in zip(specialists, refinement_futures):
        try:
            result = await future.result()
            successful_results.append(
                {"specialist": specialist, "result": result, "status": "success"}
            )
            logger.info(f"✓ {specialist} specialist succeeded")
        except Exception as e:
            failed_specialists.append({"specialist": specialist, "error": str(e)})
            logger.warning(f"✗ {specialist} specialist failed: {str(e)}")

    # Check if we met minimum success threshold
    success_count = len(successful_results)
    if success_count < min_successful_specialists:
        raise ValueError(
            f"Only {success_count}/{len(specialists)} specialists succeeded, "
            f"need at least {min_successful_specialists}. "
            f"Failed: {[f['specialist'] for f in failed_specialists]}"
        )

    logger.info(
        f"Refinement complete: {success_count}/{len(specialists)} specialists succeeded"
    )

    # Stage 4: Selection (fan-in)
    logger.info(f"Stage 4: Selection using '{selection_strategy}' strategy")
    candidates = [r["result"] for r in successful_results]
    final_result = await fableforge_select_best(candidates, selection_strategy)

    # Build comprehensive result
    pipeline_result = {
        "final_translation": final_result["selected"],
        "metadata": {
            "language": language,
            "input_length": len(text),
            "specialists_attempted": len(specialists),
            "specialists_succeeded": success_count,
            "specialists_failed": len(failed_specialists),
            "successful_specialists": [r["specialist"] for r in successful_results],
            "failed_specialists": [f["specialist"] for f in failed_specialists],
            "selection_strategy": selection_strategy,
        },
        "all_candidates": successful_results,
        "failures": failed_specialists,
    }

    logger.info(
        f"Translation pipeline complete! "
        f"{success_count}/{len(specialists)} specialists succeeded"
    )

    return pipeline_result


@flow(
    name="translation-pipeline-simple",
    description="Simplified translation pipeline without failure handling",
    task_runner=ConcurrentTaskRunner(),
)
async def translation_pipeline_simple(text: str, language: str) -> Dict[str, Any]:
    """
    Simplified translation pipeline - all specialists must succeed.

    Args:
        text: Raw text to translate
        language: Language code

    Returns:
        Final translation
    """
    logger = get_run_logger()

    # Tag text
    tagged_result = await fableforge_tag(text, language)
    tagged_text = tagged_result["tagged_text"]

    # Parallel refinement
    specialists = ["cultural", "prose", "dialogue", "narrative", "fluency"]
    refinement_futures = [
        fableforge_refine.submit(
            context={"text": tagged_text, "language": language}, specialist=spec
        )
        for spec in specialists
    ]

    # Wait for all to complete (will raise if any fail)
    results = [await future.result() for future in refinement_futures]

    # Select best
    final = await fableforge_select_best(results, strategy="ensemble")

    return final


@flow(
    name="batch-translation",
    description="Process multiple documents in parallel",
    task_runner=ConcurrentTaskRunner(),
)
async def batch_translation_pipeline(
    documents: List[Dict[str, str]], language: str, min_successful: int = 3
) -> List[Dict[str, Any]]:
    """
    Process multiple documents in parallel.

    Args:
        documents: List of dicts with 'id' and 'text'
        language: Language code
        min_successful: Minimum specialists per document

    Returns:
        List of translation results
    """
    logger = get_run_logger()
    logger.info(f"Processing {len(documents)} documents in parallel")

    # Submit all document translations in parallel
    futures = [
        translation_pipeline.submit(doc["text"], language, min_successful)
        for doc in documents
    ]

    # Collect results
    results = []
    for doc, future in zip(documents, futures):
        try:
            result = await future.result()
            results.append({"document_id": doc["id"], "status": "success", "result": result})
        except Exception as e:
            results.append(
                {"document_id": doc["id"], "status": "failed", "error": str(e)}
            )

    successful = sum(1 for r in results if r["status"] == "success")
    logger.info(f"Batch translation complete: {successful}/{len(documents)} succeeded")

    return results


if __name__ == "__main__":
    # Example usage
    import asyncio

    async def main():
        # Single document translation
        result = await translation_pipeline(
            text="안녕하세요, 이것은 테스트입니다.",
            language="kor",
            min_successful_specialists=3,
            selection_strategy="ensemble",
        )

        print(f"Translation: {result['final_translation']}")
        print(f"Metadata: {result['metadata']}")

    asyncio.run(main())
