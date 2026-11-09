from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import settings
from app.db import Base, engine
from app.routes.system import router as system_router
from app.routes.users import router as users_router
from app.routes.ingestion import router as ingestion_router
from app.routes.narrative import router as narrative_router
from app.routes.grants import router as grants_router
from app.routes.applications import router as applications_router


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response: Response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Referrer-Policy'] = 'no-referrer'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 "
            "ws://localhost:5173 ws://127.0.0.1:5173; img-src 'self' data:; "
            "font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
        )
        return response


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title='GrantCompass API', version='0.1.0', lifespan=lifespan)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(',') if o.strip()],
    allow_credentials=False,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type'],
)

app.include_router(system_router)
app.include_router(users_router)
app.include_router(ingestion_router)
app.include_router(narrative_router)
app.include_router(grants_router)
app.include_router(applications_router)
