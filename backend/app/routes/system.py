from fastapi import APIRouter, HTTPException
from app.schemas import HealthResponse


router = APIRouter(tags=['system'])


@router.get('/health', response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status='ok')
