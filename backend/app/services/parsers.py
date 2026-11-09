import json
import zipfile
from io import BytesIO
from typing import Any

from docx import Document as DocxDocument
from pypdf import PdfReader

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_PDF_PAGES = 100


class ParseError(ValueError):
    pass


def _validate_size(raw: bytes) -> None:
    if not raw:
        raise ParseError('Empty file')
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ParseError('File exceeds the 8 MB limit')


def _require_text(text: str, label: str) -> str:
    text = text.strip()
    if not text:
        raise ParseError(f'No extractable text found in {label}')
    return text


def parse_pdf(raw: bytes) -> str:
    _validate_size(raw)
    if not raw.startswith(b'%PDF'):
        raise ParseError('File is not a valid PDF')
    try:
        reader = PdfReader(BytesIO(raw))
        if reader.is_encrypted:
            raise ParseError('Encrypted PDFs are not supported')
        pages = [page.extract_text() or '' for page in reader.pages[:MAX_PDF_PAGES]]
    except ParseError:
        raise
    except Exception as exc:
        raise ParseError('Could not read PDF') from exc
    return _require_text('\n'.join(pages), 'PDF')


def parse_docx(raw: bytes) -> str:
    _validate_size(raw)
    if not raw.startswith(b'PK'):
        raise ParseError('File is not a valid DOCX')
    try:
        with zipfile.ZipFile(BytesIO(raw)) as archive:
            entries = archive.infolist()
            expanded_size = sum(entry.file_size for entry in entries)
            compressed_size = sum(entry.compress_size for entry in entries)
            if len(entries) > 1000 or expanded_size > 30 * 1024 * 1024:
                raise ParseError('DOCX archive expands beyond the supported size')
            if compressed_size and expanded_size / compressed_size > 100:
                raise ParseError('DOCX archive compression ratio is too high')
        document = DocxDocument(BytesIO(raw))
        parts = [paragraph.text for paragraph in document.paragraphs]
        for table in document.tables:
            for row in table.rows:
                parts.append(' | '.join(cell.text for cell in row.cells))
    except ParseError:
        raise
    except Exception as exc:
        raise ParseError('Could not read DOCX') from exc
    return _require_text('\n'.join(parts), 'DOCX')


def parse_text(raw: bytes) -> str:
    _validate_size(raw)
    return _require_text(raw.decode('utf-8', errors='strict'), 'text file')


def _flatten_json(value: Any, prefix: str = '') -> list[str]:
    if isinstance(value, dict):
        lines: list[str] = []
        for key, item in value.items():
            lines.extend(_flatten_json(item, f'{prefix}{key}: '))
        return lines
    if isinstance(value, list):
        return [line for item in value for line in _flatten_json(item, prefix)]
    return [f'{prefix}{value}'.strip()] if value not in (None, '') else []


def parse_linkedin_json(raw: bytes) -> str:
    _validate_size(raw)
    try:
        data = json.loads(raw.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError, RecursionError) as exc:
        raise ParseError('Invalid JSON export') from exc
    try:
        flattened = '\n'.join(_flatten_json(data))
    except RecursionError as exc:
        raise ParseError('JSON export is nested too deeply') from exc
    return _require_text(flattened, 'JSON export')


PARSERS = {
    'resume_pdf': parse_pdf,
    'resume_docx': parse_docx,
    'resume_md': parse_text,
    'linkedin_json': parse_linkedin_json,
    'supplemental': parse_text,
}

EXTENSIONS = {
    '.pdf': 'resume_pdf',
    '.docx': 'resume_docx',
    '.md': 'resume_md',
    '.txt': 'resume_md',
    '.json': 'linkedin_json',
}


def detect_source_type(filename: str) -> str:
    lowered = filename.lower()
    for extension, source_type in EXTENSIONS.items():
        if lowered.endswith(extension):
            return source_type
    raise ParseError('Unsupported file type. Use PDF, DOCX, Markdown, text, or JSON.')
