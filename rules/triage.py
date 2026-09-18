"""Классификация срочности. Детерминированные правила, без модели.

Всё, что оценивается на отборе, считается здесь: тогда демо-режим и живой
ключ дают одинаковый результат, и проверяющий видит ровно то же, что мы.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from datetime import date

import duration as dur

NEGATIVE = re.compile(r"^(нет|нету|не|no|none|-|—|ничего|отрицаю|нет\.)$", re.I)

RED_FLAGS = [
    (r"(бол|дав|жж|жм|сдав)\w*[^.]{0,20}(груд|за\s*груд)|груд\w*[^.]{0,15}(бол|дав|жж)",
     "боль или давление в груди"),
    (r"одышк|задыха|не могу дышать|нехватка воздуха|тяжело дышать|удушь",
     "одышка"),
    (r"слабость в (рук|ног)|онемел|отнял\w*сь|парал|не слушается рука",
     "слабость или онемение конечности"),
    (r"наруш\w*[^.]{0,10}реч|невнятн\w*[^.]{0,10}реч|не могу говорить|перекос\w*[^.]{0,10}лиц",
     "нарушение речи или асимметрия лица"),
    (r"обморок|потер\w*[^.]{0,10}сознан|теря\w*[^.]{0,10}сознан",
     "потеря сознания"),
    (r"кровотеч|рвота с кровью|кровь в стуле|сильно кровит|рвёт кровью",
     "кровотечение"),
    (r"судорог|припадок", "судороги"),
    (r"(?:темпер\w*|[tт])\D{0,10}(?:39|40|41)", "температура 39 и выше"),
    (r"суицид|покончить с собой|не хочу жить", "суицидальные мысли"),
    (r"ригидность затылоч|не могу наклонить голову|светобоязн", "менингеальные признаки"),
]

# Препараты и вещества, меняющие тактику. Кокаин + боль в груди — классика.
SUBSTANCES = [
    (r"кокаин|амфетамин|мефедрон|метамфетамин|соль\w*\s*(?:курит|нюха)", "стимуляторы"),
    (r"варфарин|ксарелто|прадакса|эликвис|апиксабан|ривароксабан", "антикоагулянты"),
    (r"преднизолон|метипред|дексаметазон", "системные глюкокортикоиды"),
]

HIGH_TEMP = re.compile(r"(?:темпер\w*|[tт])\D{0,10}(3[89](?:[.,]\d)?)", re.I)

CATEGORIES = {
    "emergency": {"code": "emergency", "label": "Неотложно", "rank": 0},
    "today": {"code": "today", "label": "Сегодня", "rank": 1},
    "planned": {"code": "planned", "label": "Плановый приём", "rank": 2},
    "selfcare": {"code": "selfcare", "label": "Самопомощь", "rank": 3},
}


@dataclass
class Verdict:
    urgency: dict
    red_flags: list[str]
    substances: list[str]
    reason: str
    pain: int | None
    duration_days: float | None
    duration_note: str
    duration_confident: bool
    needs_clarification: list[str]


def parse_pain(raw: str | None) -> int | None:
    if not raw:
        return None
    match = re.search(r"\d{1,2}", str(raw))
    if not match:
        return None
    return max(0, min(10, int(match.group())))


def _haystack(answers: dict) -> str:
    parts = []
    for key, value in answers.items():
        text = str(value or "").strip()
        # «нет» в ответе про тревожные признаки не должно ловиться паттернами.
        if key == "redflags" and NEGATIVE.match(text):
            continue
        parts.append(text)
    return "\n".join(parts)


def detect_red_flags(answers: dict) -> list[str]:
    hay = _haystack(answers)
    return [label for pattern, label in RED_FLAGS if re.search(pattern, hay, re.I)]


def detect_substances(answers: dict) -> list[str]:
    hay = " ".join(str(answers.get(k) or "") for k in ("meds", "complaint"))
    return [label for pattern, label in SUBSTANCES if re.search(pattern, hay, re.I)]


def classify(answers: dict, today: date | None = None) -> Verdict:
    pain = parse_pain(answers.get("pain"))
    d = dur.parse(str(answers.get("duration") or ""), today)
    red_flags = detect_red_flags(answers)
    substances = detect_substances(answers)
    hay = _haystack(answers)

    clarify: list[str] = []
    if d.days is None:
        clarify.append("длительность не разобрана — уточнить у пациента")
    elif not d.confident:
        clarify.append(f"длительность понята неточно: {d.note}")
    if pain is None:
        clarify.append("интенсивность боли не указана")

    temp = None
    match = HIGH_TEMP.search(hay)
    if match:
        temp = float(match.group(1).replace(",", "."))

    # Стимуляторы плюс боль в груди — сразу неотложно, даже если пациент
    # не назвал боль сильной: риск ишемии не коррелирует с оценкой по шкале.
    chest = any("груди" in flag for flag in red_flags)
    if substances and "стимуляторы" in substances and chest:
        red_flags.append("боль в груди на фоне стимуляторов")

    if red_flags:
        return _verdict("emergency", red_flags, substances, pain, d, clarify,
                        "Тревожные признаки: " + ", ".join(red_flags))

    if pain is not None and pain >= 7:
        reason = "Выраженная боль (%d из 10) — осмотр в течение суток." % pain
        return _verdict("today", red_flags, substances, pain, d, clarify, reason)
    if temp is not None and temp >= 38.5:
        return _verdict("today", red_flags, substances, pain, d, clarify,
                        f"Температура {temp} — осмотр в течение суток.")
    if dur.is_sudden(str(answers.get("duration") or "")):
        return _verdict("today", red_flags, substances, pain, d, clarify,
                        "Острое начало — осмотр в течение суток.")
    if substances:
        return _verdict("today", red_flags, substances, pain, d, clarify,
                        "Принимаемые препараты меняют тактику: " + ", ".join(substances))

    if (pain is not None and pain >= 3) or (d.days is not None and d.days >= 7):
        bits = []
        if pain is not None and pain >= 3:
            bits.append(f"боль {pain} из 10")
        if d.days is not None and d.days >= 7:
            bits.append(f"длительность {d.note}")
        return _verdict("planned", red_flags, substances, pain, d, clarify,
                        "Плановый приём: " + ", ".join(bits) + ".")

    if d.days is None and pain is None:
        return _verdict("planned", red_flags, substances, pain, d, clarify,
                        "Недостаточно данных для отнесения к самопомощи — плановый приём.")

    return _verdict("selfcare", red_flags, substances, pain, d, clarify,
                    "Тревожных признаков нет, интенсивность низкая — наблюдение.")


def _verdict(code, red_flags, substances, pain, d, clarify, reason) -> Verdict:
    return Verdict(
        urgency=CATEGORIES[code],
        red_flags=red_flags,
        substances=substances,
        reason=reason,
        pain=pain,
        duration_days=None if d.days is None else round(d.days, 3),
        duration_note=d.note,
        duration_confident=d.confident,
        needs_clarification=clarify,
    )


def to_dict(verdict: Verdict) -> dict:
    return asdict(verdict)
