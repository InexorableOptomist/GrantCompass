from fastapi import APIRouter, HTTPException

from app.deps import get_db_session
from app.models import User
from app.services.context import build_fact_sheet
from app.services.grants import GRANTS, match_grants

router = APIRouter(prefix='/grants', tags=['grants'])


@router.get('')
def list_grants() -> dict:
    return {
        'items': GRANTS,
        'notice': 'Demonstration data only. Opportunities, eligibility, amounts, and deadlines are not verified.',
    }


@router.get('/match/{user_id}')
def get_matches(user_id: int) -> dict:
    with get_db_session() as db:
        try:
            profile = build_fact_sheet(db, user_id)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail='User not found') from exc
        return {
            'items': match_grants(profile),
            'notice': 'Keyword overlap only. Verify each opportunity and eligibility with its official provider.',
        }
