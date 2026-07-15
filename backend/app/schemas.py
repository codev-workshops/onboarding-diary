import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_email(value: str) -> str:
    normalized = value.strip().lower()
    if len(normalized) > 254 or not EMAIL_PATTERN.fullmatch(normalized):
        raise ValueError("Enter a valid email address")
    return normalized


def normalize_bounded_text(value: str, field: str) -> str:
    normalized = value.strip()
    if not 1 <= len(normalized) <= 100:
        raise ValueError(f"{field} must be between 1 and 100 characters")
    return normalized


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SignupRequest(StrictModel):
    email: str
    password: str
    name: str
    department: str
    start_date: date

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not 8 <= len(value) <= 128:
            raise ValueError("Password must be between 8 and 128 characters")
        return value

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return normalize_bounded_text(value, "Name")

    @field_validator("department")
    @classmethod
    def validate_department(cls, value: str) -> str:
        return normalize_bounded_text(value, "Department")


class LoginRequest(StrictModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def trim_email(cls, value: str) -> str:
        return value.strip().lower()


class ProfileUpdate(StrictModel):
    email: str | None = None
    name: str | None = None
    department: str | None = None
    start_date: date | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Email cannot be null")
        return normalize_email(value)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Name cannot be null")
        return normalize_bounded_text(value, "Name")

    @field_validator("department")
    @classmethod
    def validate_department(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Department cannot be null")
        return normalize_bounded_text(value, "Department")

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: date | None) -> date | None:
        if value is None:
            raise ValueError("Start date cannot be null")
        return value


class ProfileResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    department: str
    start_date: date


UserRole = Literal["Recruit", "Manager", "Admin"]


class AdminUserCreate(SignupRequest):
    role: UserRole


class AdminUserPatch(StrictModel):
    email: str | None = None
    name: str | None = None
    department: str | None = None
    start_date: date | None = None
    role: UserRole | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Email cannot be null")
        return normalize_email(value)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Name cannot be null")
        return normalize_bounded_text(value, "Name")

    @field_validator("department")
    @classmethod
    def validate_department(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("Department cannot be null")
        return normalize_bounded_text(value, "Department")

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: date | None) -> date | None:
        if value is None:
            raise ValueError("Start date cannot be null")
        return value

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: UserRole | None) -> UserRole | None:
        if value is None:
            raise ValueError("Role cannot be null")
        return value


class AdminUserResponse(ProfileResponse):
    assigned_manager_id: int | None = None


class ManagerAssignmentRequest(StrictModel):
    manager_id: int
