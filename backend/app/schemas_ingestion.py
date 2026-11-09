from typing import Any, Literal

from pydantic import BaseModel, Field

SourceType = Literal['resume_pdf', 'resume_docx', 'resume_md', 'linkedin_json', 'supplemental']


class IngestResponse(BaseModel):
    document_id: int
    user_id: int
    source_type: str
    message: str = 'Document stored locally.'


class FactSheetResponse(BaseModel):
    user_id: int
    identity: dict[str, Any]
    academics: dict[str, Any]
    experience: dict[str, Any]
    skills: dict[str, Any]
    awards: dict[str, Any]
    narrative_hooks: dict[str, Any]
    provenance: dict[str, Any]


class GitHubImportRequest(BaseModel):
    user_id: int
    username: str = Field(min_length=1, max_length=39, pattern=r'^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$')
