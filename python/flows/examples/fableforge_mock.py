"""
Mock FableForge Service for Testing

This is a simple mock server that simulates the FableForge API
for testing the translation pipeline without a real FableForge deployment.
"""

import asyncio
import random
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List

app = FastAPI(title="FableForge Mock Service")


class TagRequest(BaseModel):
    text: str
    language: str


class RefineRequest(BaseModel):
    context: Dict[str, Any]
    specialist: str


class SelectRequest(BaseModel):
    candidates: List[Dict[str, Any]]
    strategy: str = "ensemble"


@app.get("/")
async def root():
    return {"service": "fableforge-mock", "status": "ok"}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "fableforge-mock"}


@app.post("/tag")
async def tag_text(request: TagRequest):
    """
    Mock tagging endpoint - simulates linguistic tagging.
    """
    # Simulate processing time
    await asyncio.sleep(random.uniform(0.1, 0.5))

    # Mock tagged output
    tagged = f"<tagged lang='{request.language}'>{request.text}</tagged>"

    return {
        "tagged_text": tagged,
        "language": request.language,
        "tags": ["proper_noun", "verb", "adjective"],
        "processing_time_ms": random.randint(100, 500),
    }


@app.post("/refine")
async def refine_translation(request: RefineRequest):
    """
    Mock refinement endpoint - simulates specialist processing.
    """
    specialist = request.specialist
    text = request.context.get("text", "")

    # Simulate processing time (longer for some specialists)
    processing_time = random.uniform(1.0, 3.0)
    if specialist == "cultural":
        processing_time += 1.0  # Cultural specialist takes longer

    # Simulate random failures (10% chance)
    if random.random() < 0.1:
        await asyncio.sleep(processing_time)
        raise HTTPException(
            status_code=500, detail=f"{specialist} specialist encountered an error"
        )

    await asyncio.sleep(processing_time)

    # Mock refinement output
    refinement = f"[{specialist.upper()} REFINED] {text}"

    return {
        "refined_text": refinement,
        "specialist": specialist,
        "confidence": random.uniform(0.7, 0.95),
        "improvements": [
            f"{specialist}_improvement_1",
            f"{specialist}_improvement_2",
        ],
        "processing_time_ms": int(processing_time * 1000),
    }


@app.post("/select")
async def select_best(request: SelectRequest):
    """
    Mock selection endpoint - picks best candidate.
    """
    # Simulate processing time
    await asyncio.sleep(random.uniform(0.2, 0.5))

    if not request.candidates:
        raise HTTPException(status_code=400, detail="No candidates provided")

    # Select based on strategy
    if request.strategy == "ensemble":
        # Average all candidates
        selected = {
            "refined_text": " | ".join(
                c.get("refined_text", "") for c in request.candidates
            ),
            "method": "ensemble",
        }
    elif request.strategy == "vote":
        # Pick random (mock voting)
        selected = random.choice(request.candidates)
        selected["method"] = "vote"
    else:  # quality_score
        # Pick highest confidence
        selected = max(request.candidates, key=lambda c: c.get("confidence", 0))
        selected["method"] = "quality_score"

    return {
        "selected": selected,
        "strategy": request.strategy,
        "candidates_count": len(request.candidates),
        "processing_time_ms": random.randint(200, 500),
    }


@app.post("/cleanup")
async def cleanup_text(text: str):
    """
    Mock cleanup endpoint.
    """
    await asyncio.sleep(random.uniform(0.1, 0.3))

    return {
        "cleaned_text": text.strip(),
        "changes": ["removed_whitespace", "normalized_punctuation"],
        "processing_time_ms": random.randint(100, 300),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)
