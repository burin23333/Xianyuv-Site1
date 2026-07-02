from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import schemas
import models
from database import engine, SessionLocal
from fastapi.security import OAuth2PasswordRequestForm
import auth
from auth import get_current_user

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS 中间件（允许前端跨域访问，开发时方便）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录
app.mount("/static", StaticFiles(directory="static"), name="static")


def get_db():
    """利用依赖注入获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def read_root():
    """返回前端主页"""
    return FileResponse("static/index.html")


# ==================== Todo CRUD ====================

@app.get("/todos")
def get_todos(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """获取当前用户的待办事项列表"""
    todos = db.query(models.Todo).filter(
        models.Todo.owner_id == current_user["id"]
    ).all()
    return todos


@app.post("/todos")
def create_todo(
    item: schemas.TodoCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """创建待办事项"""
    todo = models.Todo(
        title=item.title,
        done=item.done,
        owner_id=current_user["id"],
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@app.delete("/todos/{id}")
def delete_todo(
    id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """删除自己的待办事项"""
    todo = db.query(models.Todo).filter(
        models.Todo.id == id,
        models.Todo.owner_id == current_user["id"],
    ).first()
    if todo is None:
        return {"message": "待办事项不存在"}
    db.delete(todo)
    db.commit()
    return {"message": "删除成功", "deleted_todo": todo}


@app.put("/todos/{id}")
def update_todo(
    id: int,
    item: schemas.TodoUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """更新自己的待办事项"""
    todo = db.query(models.Todo).filter(
        models.Todo.id == id,
        models.Todo.owner_id == current_user["id"],
    ).first()
    if todo is None:
        return {"message": "待办事项不存在"}
    if item.title is not None:
        todo.title = item.title
    if item.done is not None:
        todo.done = item.done
    db.commit()
    db.refresh(todo)
    return {"message": "更新成功", "updated_todo": todo}


# ==================== 用户认证 ====================

@app.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """用户注册"""
    existing = db.query(models.User).filter(
        models.User.username == user.username
    ).first()
    if existing:
        return {"message": "用户名已存在"}

    new_user = models.User(
        username=user.username,
        hashed_password=auth.hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/token")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """用户登录，返回 JWT Token"""
    user = db.query(models.User).filter(
        models.User.username == form_data.username
    ).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        return {"message": "用户名或密码错误"}

    access_token = auth.create_access_token(
        data={"sub": user.username, "user_id": user.id}
    )
    return {"access_token": access_token, "token_type": "bearer"}
