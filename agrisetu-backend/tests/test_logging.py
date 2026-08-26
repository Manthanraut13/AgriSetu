"""Tests for structured logging (JSON formatter)."""
import json
import logging
import pytest
from middleware.logging import JsonRequestFormatter


def test_json_formatter_output():
    formatter = JsonRequestFormatter()
    record = logging.LogRecord(
        name="agrisetu.test",
        level=logging.INFO,
        pathname="test.py",
        lineno=42,
        msg="request completed %s",
        args=("hello",),
        exc_info=None,
    )
    record.request_id = "abc-123"
    output = formatter.format(record)
    parsed = json.loads(output)

    assert parsed["level"] == "INFO"
    assert parsed["logger"] == "agrisetu.test"
    assert parsed["msg"] == "request completed hello"
    assert parsed["request_id"] == "abc-123"
    assert "ts" in parsed


def test_json_formatter_without_request_id():
    formatter = JsonRequestFormatter()
    record = logging.LogRecord(
        name="agrisetu.test",
        level=logging.WARNING,
        pathname="test.py",
        lineno=1,
        msg="something happened",
        args=(),
        exc_info=None,
    )
    output = formatter.format(record)
    parsed = json.loads(output)

    assert parsed["level"] == "WARNING"
    assert parsed["msg"] == "something happened"
    assert "request_id" not in parsed
