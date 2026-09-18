"""pytest -q. Случаи, которые уже ломались на практике, вынесены отдельно."""
from datetime import date

import pytest

import duration
import triage

TODAY = date(2026, 9, 18)


def answers(**kw):
    base = dict(complaint="", duration="", pain="", redflags="нет",
                allergies="нет", chronic="нет", meds="нет")
    base.update(kw)
    return base


@pytest.mark.parametrize("text,expected_days", [
    ("3 недели", 21),
    ("неделю", 7),
    ("месяц", 30),
    ("сутки", 1),
    ("полтора месяца", 45),
    ("5 дней", 5),
])
def test_relative_durations(text, expected_days):
    assert duration.parse(text, TODAY).days == pytest.approx(expected_days)


@pytest.mark.parametrize("text,expected", [
    ("в понедельник", None),        # не «неделя»
    ("сегодня утром", 0.5),         # не «год», а расплывчатое «сегодня»
    ("такая погода уже 2 дня", 2),  # не «год», а честные 2 дня
])
def test_words_containing_units_are_not_units(text, expected):
    """«поНЕДЕЛьник», «сеГОДня», «поГОДа» не должны читаться как единицы времени."""
    days = duration.parse(text, TODAY).days
    if expected is None:
        assert days is None
    else:
        assert days == pytest.approx(expected)


def test_absolute_date():
    parsed = duration.parse("с 1 июля", TODAY)
    assert parsed.method == "date"
    assert parsed.days == pytest.approx(79)


def test_future_date_falls_back_to_previous_year():
    parsed = duration.parse("11 октября", TODAY)
    assert parsed.confident is False
    assert "прошлый" in parsed.note


def test_red_flag_wins_over_low_pain():
    v = triage.classify(answers(complaint="давит за грудиной", duration="час", pain="2"), TODAY)
    assert v.urgency["code"] == "emergency"


def test_negative_redflag_answer_is_not_matched():
    """Ответ «нет» на вопрос о тревожных признаках не должен сам себя ловить."""
    v = triage.classify(answers(complaint="насморк", duration="2 дня", pain="1"), TODAY)
    assert v.red_flags == []
    assert v.urgency["code"] == "selfcare"


def test_stimulants_escalate():
    v = triage.classify(answers(complaint="головная боль", duration="2 дня", pain="2",
                                meds="кокаин"), TODAY)
    assert v.urgency["code"] == "today"
    assert "стимуляторы" in v.substances


def test_chest_pain_with_stimulants_is_emergency():
    v = triage.classify(answers(complaint="боль в груди", duration="час", pain="3",
                                meds="кокаин"), TODAY)
    assert v.urgency["code"] == "emergency"
    assert any("стимулятор" in f for f in v.red_flags)


def test_long_duration_from_date_reaches_planned():
    """Раньше дата игнорировалась и трёхмесячная жалоба уходила в самопомощь."""
    v = triage.classify(answers(complaint="ноет поясница", duration="с 1 июля", pain="2"), TODAY)
    assert v.urgency["code"] == "planned"


def test_unparsed_duration_asks_for_clarification():
    v = triage.classify(answers(complaint="плохо", duration="ерунда", pain="1"), TODAY)
    assert any("длительность" in c for c in v.needs_clarification)


def test_high_temperature_is_today():
    v = triage.classify(answers(complaint="слабость, температура 38.7", duration="2 дня",
                                pain="2"), TODAY)
    assert v.urgency["code"] == "today"


def test_temperature_39_is_emergency():
    v = triage.classify(answers(complaint="температура 39.5", duration="сутки", pain="3"), TODAY)
    assert v.urgency["code"] == "emergency"


@pytest.mark.parametrize("text,expected_days", [
    ("минут сорок назад", 40 / 1440),
    ("минут 20", 20 / 1440),
    ("дня три", 3),
    ("недели две", 14),
])
def test_number_after_unit(text, expected_days):
    """«минут сорок» — обычный порядок слов; раньше это читалось как одна минута."""
    assert duration.parse(text, TODAY).days == pytest.approx(expected_days)


def test_bare_unit_is_one():
    assert duration.parse("неделю", TODAY).days == pytest.approx(7)
    assert duration.parse("сутки", TODAY).days == pytest.approx(1)
