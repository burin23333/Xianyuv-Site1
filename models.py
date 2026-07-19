from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from datetime import datetime
from sqlalchemy.orm import relationship
from database import Base
import enum

class User(Base):
    """用户模型"""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    todos = relationship("Todo", back_populates="owner")

class PriorityEnum(enum.IntEnum):
    low = 0
    medium = 1
    high = 2
    urgent = 3

class Todo(Base):
    """待办事项模型"""
    __tablename__ = "todos"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    done = Column(Boolean, default=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    owner = relationship("User", back_populates="todos")
    priority = Column(Integer, default=PriorityEnum.medium, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    due_date = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)

