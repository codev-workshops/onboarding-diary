import re
from datetime import date as DateValue
from datetime import datetime as DateTimeValue
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ISO_DATE_PATTERN = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")


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
    start_date: DateValue

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
    start_date: DateValue | None = None

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
    def validate_start_date(cls, value: DateValue | None) -> DateValue | None:
        if value is None:
            raise ValueError("Start date cannot be null")
        return value


class ProfileResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    department: str
    start_date: DateValue


UserRole = Literal["Recruit", "Manager", "Admin"]


class AdminUserCreate(SignupRequest):
    role: UserRole


class AdminUserPatch(StrictModel):
    email: str | None = None
    name: str | None = None
    department: str | None = None
    start_date: DateValue | None = None
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
    def validate_start_date(cls, value: DateValue | None) -> DateValue | None:
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


TaskCategory = Literal["Training", "Setup", "Meeting", "Project", "Other"]
TaskStatus = Literal["Not Started", "In Progress", "Completed", "Blocked"]
TaskPriority = Literal["Low", "Medium", "High"]
IssueSeverity = Literal["Low", "Medium", "High", "Critical"]
IssueStatus = Literal["Open", "In Progress", "Resolved", "Closed"]
FeedbackType = Literal["Positive", "Suggestion", "Concern"]


def normalize_text(value: str, field: str, minimum: int, maximum: int) -> str:
    normalized = value.strip()
    if not minimum <= len(normalized) <= maximum:
        raise ValueError(f"{field} must be between {minimum} and {maximum} characters")
    return normalized


def parse_strict_date(value: object) -> DateValue:
    if not isinstance(value, str) or ISO_DATE_PATTERN.fullmatch(value) is None:
        raise ValueError("Date must use YYYY-MM-DD format")
    try:
        return DateValue.fromisoformat(value)
    except ValueError as error:
        raise ValueError("Date must be a valid calendar date") from error


StrictDateValue = Annotated[DateValue, BeforeValidator(parse_strict_date)]


class TaskCreate(StrictModel):
    owner_id: int | None = None
    date: StrictDateValue
    title: str
    description: str
    category: TaskCategory
    status: TaskStatus
    priority: TaskPriority

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        return normalize_text(value, "Title", 1, 120)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        return normalize_text(value, "Description", 0, 2000)


class TaskPatch(StrictModel):
    date: StrictDateValue | None = None
    title: str | None = None
    description: str | None = None
    category: TaskCategory | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None

    @field_validator("date", "category", "status", "priority")
    @classmethod
    def reject_null(cls, value: object | None) -> object:
        if value is None:
            raise ValueError("Field cannot be null")
        return value

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Title cannot be null")
        return normalize_text(value, "Title", 1, 120)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Description cannot be null")
        return normalize_text(value, "Description", 0, 2000)


class TaskResponse(BaseModel):
    id: int
    owner_id: int
    date: DateValue
    title: str
    description: str
    category: TaskCategory
    status: TaskStatus
    priority: TaskPriority
    created_at: DateTimeValue


class IssueCreate(StrictModel):
    owner_id: int | None = None
    date: StrictDateValue
    title: str
    description: str
    severity: IssueSeverity
    status: IssueStatus
    resolution_notes: str = ""

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        return normalize_text(value, "Title", 1, 120)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        return normalize_text(value, "Description", 1, 2000)

    @field_validator("resolution_notes")
    @classmethod
    def validate_resolution_notes(cls, value: str) -> str:
        return normalize_text(value, "Resolution notes", 0, 2000)


class IssuePatch(StrictModel):
    date: StrictDateValue | None = None
    title: str | None = None
    description: str | None = None
    severity: IssueSeverity | None = None
    status: IssueStatus | None = None
    resolution_notes: str | None = None

    @field_validator("date", "severity", "status")
    @classmethod
    def reject_null(cls, value: object | None) -> object:
        if value is None:
            raise ValueError("Field cannot be null")
        return value

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Title cannot be null")
        return normalize_text(value, "Title", 1, 120)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Description cannot be null")
        return normalize_text(value, "Description", 1, 2000)

    @field_validator("resolution_notes")
    @classmethod
    def validate_resolution_notes(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Resolution notes cannot be null")
        return normalize_text(value, "Resolution notes", 0, 2000)


class IssueResponse(BaseModel):
    id: int
    owner_id: int
    date: DateValue
    title: str
    description: str
    severity: IssueSeverity
    status: IssueStatus
    resolution_notes: str
    created_at: DateTimeValue


class FeedbackCreate(StrictModel):
    owner_id: int | None = None
    date: StrictDateValue
    subject: str
    type: FeedbackType
    details: str

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, value: str) -> str:
        return normalize_text(value, "Subject", 1, 120)

    @field_validator("details")
    @classmethod
    def validate_details(cls, value: str) -> str:
        return normalize_text(value, "Details", 1, 2000)


class FeedbackPatch(StrictModel):
    date: StrictDateValue | None = None
    subject: str | None = None
    type: FeedbackType | None = None
    details: str | None = None

    @field_validator("date", "type")
    @classmethod
    def reject_null(cls, value: object | None) -> object:
        if value is None:
            raise ValueError("Field cannot be null")
        return value

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Subject cannot be null")
        return normalize_text(value, "Subject", 1, 120)

    @field_validator("details")
    @classmethod
    def validate_details(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Details cannot be null")
        return normalize_text(value, "Details", 1, 2000)


class FeedbackResponse(BaseModel):
    id: int
    owner_id: int
    date: DateValue
    subject: str
    type: FeedbackType
    details: str
    created_at: DateTimeValue


def normalize_tags(value: object) -> list[str]:
    if not isinstance(value, list):
        raise ValueError("Tags must be a list")
    if len(value) > 10:
        raise ValueError("Tags must contain at most 10 items")
    normalized: list[str] = []
    seen: set[str] = set()
    for tag in value:
        if not isinstance(tag, str):
            raise ValueError("Each tag must be text")
        cleaned = tag.strip().lower()
        if not 1 <= len(cleaned) <= 30:
            raise ValueError("Each tag must be between 1 and 30 characters")
        if cleaned not in seen:
            normalized.append(cleaned)
            seen.add(cleaned)
    return normalized


class NoteCreate(StrictModel):
    owner_id: int | None = None
    date: StrictDateValue
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        return normalize_text(value, "Title", 1, 120)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        return normalize_text(value, "Content", 1, 5000)

    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, value: object) -> list[str]:
        return normalize_tags(value)


class NotePatch(StrictModel):
    date: StrictDateValue | None = None
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None

    @field_validator("date")
    @classmethod
    def reject_null_date(cls, value: object | None) -> object:
        if value is None:
            raise ValueError("Field cannot be null")
        return value

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Title cannot be null")
        return normalize_text(value, "Title", 1, 120)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("Content cannot be null")
        return normalize_text(value, "Content", 1, 5000)

    @field_validator("tags", mode="before")
    @classmethod
    def validate_tags(cls, value: object) -> list[str]:
        if value is None:
            raise ValueError("Tags cannot be null")
        return normalize_tags(value)


class NoteResponse(BaseModel):
    id: int
    owner_id: int
    date: DateValue
    title: str
    content: str
    tags: list[str]
    created_at: DateTimeValue
