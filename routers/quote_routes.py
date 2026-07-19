import json
import os
import random
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["quotes"])

# quotes.json 位于项目根目录，与 routers/ 平级
QUOTES_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "quotes.json")


def load_quotes():
    """从 JSON 文件加载名言列表"""
    if not os.path.exists(QUOTES_FILE):
        return []
    with open(QUOTES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/quotes/random")
def get_random_quote():
    """返回一条随机名人名言"""
    quotes = load_quotes()
    if not quotes:
        return {"text": "", "author": ""}
    return random.choice(quotes)
