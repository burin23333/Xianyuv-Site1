from pydantic import BaseModel


class TodoCreate(BaseModel):
    title: str
    done: bool = False


class TodoUpdate(BaseModel):
    title: str | None = None
    done: bool | None = None


class TodoOut(BaseModel):
    id: int
    title: str
    done: bool
    owner_id: int

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    password: str          # 前端发来的明文密码


class UserOut(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True
