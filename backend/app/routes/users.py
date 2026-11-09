import json
from fastapi import APIRouter, HTTPException
from sqlalchemy import delete
from app.schemas import UserCreate, UserRead
from app.models import User, AuditLog, ProfileFact, Document, BackstoryEntry, Application
from app.deps import get_db_session
from app.security.crypto import crypto_service
from app.security.sanitize import sanitize_for_log


router = APIRouter(prefix='/users', tags=['users'])


@router.post('', response_model=UserRead)
def create_user(payload: UserCreate) -> UserRead:
    with get_db_session() as db:
        user = User(
            full_name_enc=crypto_service.encrypt(payload.full_name),
            email_enc=crypto_service.encrypt(payload.email),
        )
        db.add(user)
        db.flush()

        audit = AuditLog(
            actor='local-user',
            action='create_user',
            details_sanitized=json.dumps(sanitize_for_log({'user_id': user.id, 'email': payload.email})),
        )
        db.add(audit)
        db.flush()

        return UserRead(id=user.id, full_name=payload.full_name, email=payload.email)


@router.get('/{user_id}', response_model=UserRead)
def get_user(user_id: int) -> UserRead:
    with get_db_session() as db:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail='User not found')

        full_name = crypto_service.decrypt(user.full_name_enc)
        email = crypto_service.decrypt(user.email_enc)
        return UserRead(id=user.id, full_name=full_name, email=email)


@router.delete('/{user_id}', status_code=204)
def delete_user(user_id: int) -> None:
    with get_db_session() as db:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail='User not found')
        db.execute(delete(ProfileFact).where(ProfileFact.user_id == user_id))
        db.execute(delete(Document).where(Document.user_id == user_id))
        db.execute(delete(BackstoryEntry).where(BackstoryEntry.user_id == user_id))
        db.execute(delete(Application).where(Application.user_id == user_id))
        db.delete(user)
        db.flush()
