import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

import models
from database import engine
from routers import auth_routes, todo_routes, avatar_routes, quote_routes

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

# 注册路由
app.include_router(auth_routes.router)
app.include_router(todo_routes.router)
app.include_router(avatar_routes.router)
app.include_router(quote_routes.router)


@app.get("/")
def read_root():
    """返回前端主页"""
    return FileResponse("static/index.html")
