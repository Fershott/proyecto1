import asyncio
import io
import sys
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from backend.app import summarizer


class DummyUpload:
    def __init__(self, content_type: str, data: str):
        self.content_type = content_type
        self.file = io.BytesIO(data.encode("utf-8"))


SAMPLE_TEXT = (
    "La plataforma organiza recordatorios claros para estudiantes. "
    "El resumidor automatico ofrece apoyos personalizados inclusivos. "
    "Los recordatorios y resúmenes reducen el estrés académico."
)


def test_generate_summary_from_text_orders_sentences():
    summary, original = asyncio.run(
        summarizer.generate_summary(None, SAMPLE_TEXT, sentences=2)
    )
    assert summary.startswith("La plataforma organiza")
    assert "resúmenes" not in summary
    assert original == SAMPLE_TEXT


def test_generate_summary_from_file_closes_stream():
    upload = DummyUpload("text/plain", SAMPLE_TEXT)
    summary, original = asyncio.run(
        summarizer.generate_summary(upload, None, sentences=2)
    )
    assert "La plataforma" in summary
    assert upload.file.closed is True
    assert original.startswith("La plataforma organiza")


def test_generate_summary_requires_input():
    with pytest.raises(summarizer.HTTPException) as exc_info:
        asyncio.run(summarizer.generate_summary(None, None, sentences=1))
    assert exc_info.value.status_code == 400
    assert "Debe proporcionar" in exc_info.value.detail


def test_extract_keywords_prioritizes_relevant_terms():
    keywords = summarizer.extract_keywords(SAMPLE_TEXT, limit=5)
    assert keywords[:3] == ["recordatorios", "plataforma", "organiza"]


def test_summarize_text_handles_empty_input():
    assert summarizer.summarize_text("", sentences=3) == []
