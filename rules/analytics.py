"""Сводка по очереди: то, ради чего врачу нужен не только список карточек."""
from __future__ import annotations

from collections import Counter

ORDER = ["emergency", "today", "planned", "selfcare"]
LABELS = {
    "emergency": "Неотложно",
    "today": "Сегодня",
    "planned": "Плановый приём",
    "selfcare": "Самопомощь",
}


def summarize(cards: list[dict]) -> dict:
    by_urgency = Counter(c.get("urgency", {}).get("code", "selfcare") for c in cards)
    flags = Counter(flag for c in cards for flag in (c.get("redFlags") or []))
    pains = [c["painLevel"] for c in cards if isinstance(c.get("painLevel"), (int, float))]
    unclear = [c for c in cards if c.get("needsClarification")]

    return {
        "total": len(cards),
        "byUrgency": [
            {"code": code, "label": LABELS[code], "count": by_urgency.get(code, 0)}
            for code in ORDER
        ],
        "topRedFlags": [
            {"flag": flag, "count": count} for flag, count in flags.most_common(5)
        ],
        "avgPain": round(sum(pains) / len(pains), 1) if pains else None,
        "needsClarification": len(unclear),
        "emergencyShare": round(100 * by_urgency.get("emergency", 0) / len(cards))
        if cards else 0,
    }
