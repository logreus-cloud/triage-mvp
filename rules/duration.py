"""Разбор длительности из свободного текста в дни.

Ради этого модуля Python и появился в проекте: JS-версия умела только
относительные сроки («3 недели») и молча игнорировала даты («с 1 июля»),
из-за чего трёхмесячная жалоба уходила в самопомощь.

Возвращается не только число, но и способ разбора — врач должен видеть,
как система поняла ответ, особенно когда пациент написал дату.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime

MONTHS = {
    "янв": 1, "фев": 2, "мар": 3, "апр": 4, "ма": 5, "июн": 6,
    "июл": 7, "авг": 8, "сен": 9, "окт": 10, "ноя": 11, "дек": 12,
}

# Единицы измерения -> дней. Lookbehind обязателен: без него «сеГОДня»
# читается как «год», а «поНЕДЕЛьник» — как «неделя».
UNITS = [
    (r"(?<![а-яё])(?:год|года|лет|году)", 365.0),
    (r"(?<![а-яё])(?:месяц\w*|мес(?![а-яё]))", 30.0),
    (r"(?<![а-яё])недел\w*", 7.0),
    (r"(?<![а-яё])(?:дня|дней|день|днями|сутки|суток)", 1.0),
    (r"(?<![а-яё])час\w*", 1.0 / 24),
    (r"(?<![а-яё])минут\w*", 1.0 / 1440),
]

WORD_NUMBERS = {
    "один": 1, "одна": 1, "полтора": 1.5, "полторы": 1.5, "два": 2, "две": 2,
    "три": 3, "четыре": 4, "пять": 5, "шесть": 6, "семь": 7, "восемь": 8,
    "девять": 9, "десять": 10, "пара": 2, "пару": 2, "несколько": 3,
    "двенадцать": 12, "пятнадцать": 15, "двадцать": 20, "тридцать": 30,
    "сорок": 40, "пятьдесят": 50,
}

VAGUE_LONG = re.compile(r"давно|постоянн|хроническ|всю жизнь|годами|месяцами", re.I)
VAGUE_SHORT = re.compile(r"сегодня|только что|сейчас|утром|с утра|ночью", re.I)
SUDDEN = re.compile(r"внезапн|резко|остро начал|вдруг", re.I)

NUMBER_TOKEN = r"(\d+(?:[.,]\d+)?|[а-яё]+)"


@dataclass
class Duration:
    days: float | None
    method: str          # relative | date | vague | unparsed
    note: str            # человекочитаемо, уходит в карточку врача
    confident: bool      # дата в свободной форме — повод перепроверить у пациента


def _number(match) -> float | None:
    """Достаёт число из совпадения: цифрами или словом. None, если это не число."""
    if not match:
        return None
    raw = match.group(1).lower().replace(",", ".")
    if re.fullmatch(r"\d+(?:\.\d+)?", raw):
        return float(raw)
    return float(WORD_NUMBERS[raw]) if raw in WORD_NUMBERS else None


def _relative(text: str) -> Duration | None:
    for pattern, factor in UNITS:
        match = re.search(pattern, text, re.I)
        if not match:
            continue
        # Число ищем слева от единицы, а если слева его нет — справа:
        # «минут сорок» по-русски совершенно обычный порядок слов, и без
        # этого сорок минут превращались в одну.
        before = text[: match.start()].rstrip()
        after = text[match.end():].lstrip()
        amount = (
            _number(re.search(NUMBER_TOKEN + r"$", before, re.I))
            or _number(re.match(NUMBER_TOKEN, after, re.I))
            or 1.0
        )
        days = amount * factor
        return Duration(days, "relative", _humanize(days), True)
    return None


def _from_date(text: str, today: date) -> Duration | None:
    numeric = re.search(r"\b(\d{1,2})[.\-/](\d{1,2})(?:[.\-/](\d{2,4}))?\b", text)
    if numeric:
        year = int(numeric.group(3) or today.year)
        if year < 100:
            year += 2000
        return _delta(int(numeric.group(1)), int(numeric.group(2)), year, today)

    # Окончание («11-го») ловим только с дефисом и требуем пробел перед
    # названием месяца: иначе «о?» откусывало «о» от «октября».
    named = re.search(r"\b(\d{1,2})(?:\s*-\s*[а-яё]{1,2})?\s+([а-яё]{3,})", text, re.I)
    if named:
        stem = named.group(2).lower()
        for prefix, month in MONTHS.items():
            if stem.startswith(prefix):
                return _delta(int(named.group(1)), month, today.year, today)
    return None


def _delta(day: int, month: int, year: int, today: date) -> Duration | None:
    try:
        started = date(year, month, day)
    except ValueError:
        return None
    guessed_year = False
    if started > today:
        # Дата в будущем — пациент почти наверняка имел в виду прошлый год.
        try:
            started = date(year - 1, month, day)
            guessed_year = True
        except ValueError:
            return None
    days = float((today - started).days)
    if not 0 <= days <= 365 * 5:
        return None
    note = f"{_humanize(days)} (дата {started.strftime('%d.%m.%Y')})"
    if guessed_year:
        note += ", год не указан — принят прошлый"
    return Duration(days, "date", note, not guessed_year)


def _humanize(days: float) -> str:
    if days < 1 / 24:
        return f"~{round(days * 1440)} мин"
    if days < 1:
        return f"~{round(days * 24)} ч"
    if days < 14:
        return f"~{round(days)} дн"
    if days < 60:
        return f"~{round(days / 7)} нед"
    if days < 365:
        return f"~{round(days / 30)} мес"
    return f"~{days / 365:.1f} года"


def parse(text: str, today: date | None = None) -> Duration:
    if not text or not text.strip():
        return Duration(None, "unparsed", "не указана", False)
    today = today or datetime.now().date()
    text = text.strip()

    found = _relative(text) or _from_date(text, today)
    if found:
        return found
    if VAGUE_LONG.search(text):
        return Duration(90.0, "vague", "длительно, со слов пациента", False)
    if VAGUE_SHORT.search(text):
        return Duration(0.5, "vague", "сегодня", True)
    return Duration(None, "unparsed", f"не разобрано: «{text}»", False)


def is_sudden(text: str) -> bool:
    return bool(text and SUDDEN.search(text))
