from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.deps import get_db_session
from app.models import Application, User
from app.schemas_applications import (
    ApplicationCreate,
    ApplicationRead,
    ApplicationStatusUpdate,
)
from app.security.crypto import crypto_service
from app.services.context import record_audit
from app.services.grants import GRANTS

router = APIRouter(prefix='/applications', tags=['applications'])
KNOWN_GRANT_IDS = {grant['id'] for grant in GRANTS}


@router.get('/{user_id}', response_model=list[ApplicationRead])
def list_applications(user_id: int) -> list[ApplicationRead]:
    with get_db_session() as db:
        if not db.get(User, user_id):
            raise HTTPException(status_code=404, detail='User not found')
        entries = db.execute(
            select(Application).where(Application.user_id == user_id).order_by(Application.id.desc())
        ).scalars().all()
        return [
            ApplicationRead(
                id=item.id,
                user_id=item.user_id,
                grant_id=item.grant_id,
                status=item.status,
                notes=crypto_service.decrypt(item.notes_enc),
            )
            for item in entries
        ]


@router.post('', response_model=ApplicationRead)
def create_application(payload: ApplicationCreate) -> ApplicationRead:
    if payload.grant_id not in KNOWN_GRANT_IDS:
        raise HTTPException(status_code=400, detail='Unknown demonstration opportunity')
    with get_db_session() as db:
        if not db.get(User, payload.user_id):
            raise HTTPException(status_code=404, detail='User not found')
        item = Application(
            user_id=payload.user_id,
            grant_id=payload.grant_id,
            status='planned',
            notes_enc=crypto_service.encrypt(payload.notes.strip()),
        )
        db.add(item)
        db.flush()
        record_audit(db, 'create_application', {'user_id': payload.user_id, 'grant_id': payload.grant_id})
        return ApplicationRead(
            id=item.id,
            user_id=item.user_id,
            grant_id=item.grant_id,
            status=item.status,
            notes=payload.notes.strip(),
        )


@router.put('/{application_id}/status', response_model=ApplicationRead)
def update_application_status(application_id: int, payload: ApplicationStatusUpdate) -> ApplicationRead:
    with get_db_session() as db:
        item = db.get(Application, application_id)
        if not item:
            raise HTTPException(status_code=404, detail='Application not found')
        item.status = payload.status
        record_audit(db, 'update_application_status', {'application_id': item.id, 'status': item.status})
        return ApplicationRead(
            id=item.id,
            user_id=item.user_id,
            grant_id=item.grant_id,
            status=item.status,
            notes=crypto_service.decrypt(item.notes_enc),
        )
