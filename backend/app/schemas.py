from pydantic import BaseModel, EmailStr, Field


class HealthResponse(BaseModel):
    status: str = 'ok'


class UserCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr


class UserRead(BaseModel):
    id: int
    full_name: str
    email: EmailStr
