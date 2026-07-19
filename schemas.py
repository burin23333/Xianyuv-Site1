from pydantic import BaseModel, ConfigDict, field_validator
from models import PriorityEnum
from datetime import datetime


class TodoCreate(BaseModel):
    title: str
    done: bool = False
    priority: PriorityEnum = PriorityEnum.medium
    due_date: datetime | None = None
    notes: str | None = None


class TodoUpdate(BaseModel):
    title: str | None = None
    done: bool | None = None
    priority: PriorityEnum | None = None
    due_date: datetime | None = None
    notes: str | None = None


class TodoOut(BaseModel):
    id: int
    title: str
    done: bool
    owner_id: int
    priority: PriorityEnum
    created_at: datetime
    due_date: datetime | None = None
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str
    password: str          # 前端发来的明文密码

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("密码至少需要 6 个字符")
        return v


class UserOut(BaseModel):
    id: int
    username: str

    model_config = ConfigDict(from_attributes=True)


class TodoListResponse(BaseModel):
    todos: list[TodoOut]
    total: int
