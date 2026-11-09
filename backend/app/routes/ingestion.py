import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.deps import get_db_session
from app.models import Document, User
from app.schemas_ingestion import FactSheetResponse, GitHubImportRequest, IngestResponse
from app.security.crypto import crypto_service
from app.services.context import build_fact_sheet, record_audit
from app.services.github_provider import get_github_provider, validate_username
from app.services.parsers import MAX_UPLOAD_BYTES, PARSERS, ParseError, detect_source_type

router = APIRouter(prefix='/ingestion', tags=['ingestion'])


def _require_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user


@router.post('/upload', response_model=IngestResponse)
async def upload_document(
    user_id: int = Form(...),
    file: UploadFile = File(...),
    source_type: str | None = Form(default=None),
) -> IngestResponse:
    filename = file.filename or ''
    try:
        file_kind = detect_source_type(filename)
        kind = source_type or file_kind
        if kind not in PARSERS or kind not in {file_kind, 'supplemental'}:
            raise ParseError('Document type does not match the file extension')
        raw = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(raw) > MAX_UPLOAD_BYTES:
            raise ParseError('File exceeds the 8 MB limit')
        text = PARSERS[file_kind](raw)
    except ParseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        await file.close()

    with get_db_session() as db:
        _require_user(db, user_id)
        document = Document(user_id=user_id, source_type=kind, content_enc=crypto_service.encrypt(text))
        db.add(document)
        db.flush()
        record_audit(db, 'upload_document', {'user_id': user_id, 'source_type': kind})
        return IngestResponse(document_id=document.id, user_id=user_id, source_type=kind)


@router.post('/github', response_model=IngestResponse)
def import_github(payload: GitHubImportRequest) -> IngestResponse:
    with get_db_session() as db:
        _require_user(db, payload.user_id)
    try:
        username = validate_username(payload.username)
        snapshot = get_github_provider().get_profile_snapshot(username)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail='Could not retrieve GitHub profile') from exc

    with get_db_session() as db:
        _require_user(db, payload.user_id)
        document = Document(
            user_id=payload.user_id,
            source_type='github_profile',
            content_enc=crypto_service.encrypt(json.dumps(snapshot)),
        )
        db.add(document)
        db.flush()
        record_audit(db, 'import_github', {'user_id': payload.user_id, 'source': snapshot['source']})
        return IngestResponse(document_id=document.id, user_id=payload.user_id, source_type='github_profile')


@router.get('/fact-sheet/{user_id}', response_model=FactSheetResponse)
def get_fact_sheet(user_id: int) -> FactSheetResponse:
    with get_db_session() as db:
        try:
            sheet = build_fact_sheet(db, user_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail='User not found') from exc
        return FactSheetResponse(**sheet)
