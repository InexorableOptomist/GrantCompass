from typing import Literal

from pydantic import BaseModel, Field

ApplicationStatus = Literal['planned', 'in_progress', 'submitted', 'awarded', 'not_awarded']


class ApplicationCreate(BaseModel):
    user_id: int
    grant_id: str = Field(min_length=1, max_length=64)
    notes: str = Field(default='', max_length=5000)


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationRead(BaseModel):
    id: int
    user_id: int
    grant_id: str
    status: ApplicationStatus
    notes: str
