from __future__ import annotations

import re
from typing import Any

EMAIL_RE = re.compile(r'([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)')
PHONE_RE = re.compile(r'(\+?\d[\d\-\s]{7,}\d)')


def redact_pii(value: str) -> str:
    if not isinstance(value, str):
        return value
    v = EMAIL_RE.sub('[REDACTED_EMAIL]', value)
    v = PHONE_RE.sub('[REDACTED_PHONE]', v)
    return v


def sanitize_for_log(payload: Any) -> Any:
    if isinstance(payload, dict):
        return {k: sanitize_for_log(v) for k, v in payload.items()}
    if isinstance(payload, list):
        return [sanitize_for_log(v) for v in payload]
    if isinstance(payload, str):
        return redact_pii(payload)
    return payload


def prompt_injection_prefilter(text: str) -> str:
    if not text:
        return text
    patterns = [
        r'ignore\s+previous\s+instructions',
        r'reveal\s+system\s+prompt',
        r'exfiltrate',
        r'override\s+safety',
    ]
    lowered = text.lower()
    for p in patterns:
        lowered = re.sub(p, '[BLOCKED_PATTERN]', lowered)
    return lowered
