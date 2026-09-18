"""HTTP-обёртка над правилами. Node-API ходит сюда, но умеет жить и без неё."""
from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

import analytics
import triage

app = FastAPI(title="triage-rules", version="1.0.0")

COMMIT = (
    os.environ.get("RENDER_GIT_COMMIT")
    or os.environ.get("GIT_COMMIT")
    or "local"
)[:7]


class Answers(BaseModel):
    complaint: str = ""
    duration: str = ""
    pain: str = ""
    redflags: str = ""
    allergies: str = ""
    chronic: str = ""
    meds: str = ""


class CardList(BaseModel):
    cards: list[dict[str, Any]] = Field(default_factory=list)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "rules", "commit": COMMIT, "engine": "python"}


@app.post("/classify")
def classify(answers: Answers) -> dict:
    verdict = triage.classify(answers.model_dump())
    return triage.to_dict(verdict)


@app.post("/analytics")
def stats(payload: CardList) -> dict:
    return analytics.summarize(payload.cards)
