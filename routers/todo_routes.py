from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import schemas
import models
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/v1", tags=["todos"])


@router.get("/todos", response_model=schemas.TodoListResponse)
def get_todos(
    keyword: str | None = None,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """获取当前用户的待办事项列表,支持分页和搜索"""
    query = db.query(models.Todo).filter(
        models.Todo.owner_id == current_user["id"],
    )
    if keyword:
        query = query.filter(
            models.Todo.title.like(f"%{keyword}%")
        )
    todos = query.order_by(models.Todo.id.desc()).offset(skip).limit(limit).all()
    total = query.count()
    return {"todos": todos, "total": total}


@router.post("/todos")
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
        priority=item.priority,
        due_date=item.due_date,
        notes=item.notes,
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@router.delete("/todos/completed")
def delete_completed_todos(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """删除当前用户所有已完成的待办事项"""
    count = db.query(models.Todo).filter(
        models.Todo.owner_id == current_user["id"],
        models.Todo.done == True,
    ).delete()
    db.commit()
    return {"message": f"已删除 {count} 个已完成的待办事项", "deleted_count": count}


@router.delete("/todos/{id}")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="待办事项不存在")
    db.delete(todo)
    db.commit()
    return {"message": "删除成功", "deleted_todo": todo}


@router.put("/todos/{id}")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="待办事项不存在")
    if item.title is not None:
        todo.title = item.title
    if item.done is not None:
        todo.done = item.done
    if item.priority is not None:
        todo.priority = item.priority
    if item.due_date is not None:
        todo.due_date = item.due_date
    if item.notes is not None:
        todo.notes = item.notes
    db.commit()
    db.refresh(todo)
    return {"message": "更新成功", "updated_todo": todo}
