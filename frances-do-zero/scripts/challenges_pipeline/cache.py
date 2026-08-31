import json
import os
from . import config


def _load():
    if not os.path.exists(config.CACHE_PATH):
        return {}
    with open(config.CACHE_PATH, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def _save(data):
    os.makedirs(os.path.dirname(config.CACHE_PATH), exist_ok=True)
    with open(config.CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def make_key(video_id, expression, start, end, model):
    return f"{video_id}|{expression}|{start}-{end}|{model}"


def get(key):
    return _load().get(key)


def set(key, value):
    data = _load()
    data[key] = value
    _save(data)
