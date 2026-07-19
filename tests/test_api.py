"""API 基础测试"""
import os
import sys
import pytest
from fastapi.testclient import TestClient

# 设置 SECRET_KEY 环境变量（必须在 import main 之前）
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app
from database import engine, Base

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    """每个测试前重建表，保证测试隔离"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


class TestAuth:
    """认证相关测试"""

    def test_register_success(self):
        resp = client.post("/api/v1/register", json={
            "username": "testuser",
            "password": "test1234",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "testuser"
        assert "id" in data

    def test_register_duplicate(self):
        client.post("/api/v1/register", json={
            "username": "testuser",
            "password": "test1234",
        })
        resp = client.post("/api/v1/register", json={
            "username": "testuser",
            "password": "test1234",
        })
        assert resp.status_code == 409
        assert "已存在" in resp.json()["detail"]

    def test_register_weak_password(self):
        resp = client.post("/api/v1/register", json={
            "username": "testuser",
            "password": "123",
        })
        assert resp.status_code == 422  # Pydantic validation error

    def test_login_success(self):
        client.post("/api/v1/register", json={
            "username": "testuser",
            "password": "test1234",
        })
        resp = client.post("/api/v1/token", data={
            "username": "testuser",
            "password": "test1234",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self):
        client.post("/api/v1/register", json={
            "username": "testuser",
            "password": "test1234",
        })
        resp = client.post("/api/v1/token", data={
            "username": "testuser",
            "password": "wrongpassword",
        })
        assert resp.status_code == 400


class TestTodos:
    """待办事项 CRUD 测试"""

    _token = None

    def _get_token(self):
        if self._token is None:
            client.post("/api/v1/register", json={
                "username": "todouser",
                "password": "test1234",
            })
            resp = client.post("/api/v1/token", data={
                "username": "todouser",
                "password": "test1234",
            })
            self._token = resp.json()["access_token"]
        return self._token

    def _auth_header(self):
        return {"Authorization": f"Bearer {self._get_token()}"}

    def test_create_todo(self):
        resp = client.post(
            "/api/v1/todos",
            json={"title": "测试待办", "priority": 1},
            headers=self._auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "测试待办"
        assert data["done"] is False

    def test_get_todos(self):
        client.post(
            "/api/v1/todos",
            json={"title": "待办1"},
            headers=self._auth_header(),
        )
        client.post(
            "/api/v1/todos",
            json={"title": "待办2"},
            headers=self._auth_header(),
        )
        resp = client.get("/api/v1/todos", headers=self._auth_header())
        assert resp.status_code == 200
        data = resp.json()
        # 注册时创建了 1 个默认待办 + 新建 2 个 = 共 3 个
        assert data["total"] == 3

    def test_search_todos(self):
        client.post(
            "/api/v1/todos",
            json={"title": "买水果"},
            headers=self._auth_header(),
        )
        client.post(
            "/api/v1/todos",
            json={"title": "写代码"},
            headers=self._auth_header(),
        )
        resp = client.get(
            "/api/v1/todos?keyword=水果",
            headers=self._auth_header(),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["todos"][0]["title"] == "买水果"

    def test_update_todo(self):
        create_resp = client.post(
            "/api/v1/todos",
            json={"title": "待更新"},
            headers=self._auth_header(),
        )
        todo_id = create_resp.json()["id"]

        resp = client.put(
            f"/api/v1/todos/{todo_id}",
            json={"done": True},
            headers=self._auth_header(),
        )
        assert resp.status_code == 200

    def test_delete_todo(self):
        create_resp = client.post(
            "/api/v1/todos",
            json={"title": "待删除"},
            headers=self._auth_header(),
        )
        todo_id = create_resp.json()["id"]

        resp = client.delete(
            f"/api/v1/todos/{todo_id}",
            headers=self._auth_header(),
        )
        assert resp.status_code == 200

    def test_delete_nonexistent(self):
        resp = client.delete(
            "/api/v1/todos/99999",
            headers=self._auth_header(),
        )
        assert resp.status_code == 404

    def test_unauthorized_access(self):
        resp = client.get("/api/v1/todos")
        assert resp.status_code == 401
