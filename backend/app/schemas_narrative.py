from typing import Literal

from pydantic import BaseModel, Field

ArtifactType = Literal['essay', 'cover_letter', 'resume_summary', 'resume', 'cv']


class BackstoryCreate(BaseModel):
    user_id: int
    prompt_key: str = Field(min_length=2, max_length=128, pattern=r'^[a-zA-Z0-9_-]+$')
    response: str = Field(min_length=1, max_length=20000)


class BackstoryRead(BaseModel):
    id: int
    user_id: int
    prompt_key: str
    response: str


class GenerateArtifactRequest(BaseModel):
    user_id: int
    artifact_type: ArtifactType
    opportunity_name: str = Field(min_length=2, max_length=200)
    word_target: int = Field(default=350, ge=50, le=1200)


class ArtifactAudit(BaseModel):
    status: Literal['needs_review', 'checklist_clear']
    is_ai_review: bool
    notice: str
    concerns: list[dict[str, str]]


class GenerateArtifactResponse(BaseModel):
    user_id: int
    artifact_type: ArtifactType
    content: str
    audit: ArtifactAudit


class AuditArtifactRequest(BaseModel):
    user_id: int
    artifact_type: ArtifactType
    content: str = Field(min_length=1, max_length=20000)


class AuditArtifactResponse(BaseModel):
    audit: ArtifactAudit
