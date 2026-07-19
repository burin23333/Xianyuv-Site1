import os
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from auth import get_current_user

router = APIRouter(prefix="/api/v1", tags=["avatar"])


@router.post("/users/avatar")
async def upload_avatar(
    avatar: Annotated[UploadFile, File()],
    current_user: dict = Depends(get_current_user),
):
    """上传/更新头像"""
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if avatar.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="仅支持 JPG/PNG/GIF/WebP 格式")

    content = await avatar.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="头像文件不能超过 2MB")

    upload_dir = "static/avatars"
    os.makedirs(upload_dir, exist_ok=True)

    ext = avatar.filename.rsplit(".", 1)[-1]
    filepath = f"{upload_dir}/{current_user['id']}.{ext}"
    with open(filepath, "wb") as f:
        f.write(content)

    return {"message": "头像上传成功", "url": f"/static/avatars/{current_user['id']}.{ext}"}


@router.get("/users/avatar")
def get_avatar(current_user: dict = Depends(get_current_user)):
    """获取当前用户头像 URL（没有则返回 null）"""
    avatar_dir = "static/avatars"
    if not os.path.isdir(avatar_dir):
        return {"url": None}
    for f in os.listdir(avatar_dir):
        if f.startswith(f"{current_user['id']}."):
            return {"url": f"/static/avatars/{f}"}
    return {"url": None}
