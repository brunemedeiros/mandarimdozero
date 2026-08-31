"""Descoberta de vídeos candidatos via YouTube Data API v3 — só busca e
metadados (título, descrição, duração). NUNCA baixa vídeo/áudio nem tenta
extrair legendas/transcrição por aqui; isso é papel do TranscriptionProvider
(Gemini/Vertex AI), que processa a URL do YouTube no servidor do Google."""

import re
from dataclasses import dataclass
from typing import List, Optional

import requests

from . import config

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


@dataclass
class VideoCandidate:
    video_id: str
    title: str
    channel_title: str
    duration_seconds: int


def _iso8601_duration_to_seconds(duration: str) -> int:
    match = re.match(
        r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration
    )
    if not match:
        return 0
    h, m, s = (int(g) if g else 0 for g in match.groups())
    return h * 3600 + m * 60 + s


def search_candidates(query: str, max_results: int = None) -> List[VideoCandidate]:
    if not config.YOUTUBE_API_KEY:
        raise RuntimeError("YOUTUBE_API_KEY não configurada (variável de ambiente).")
    max_results = max_results or config.YOUTUBE_MAX_CANDIDATES_PER_EXPRESSION

    search_resp = requests.get(
        SEARCH_URL,
        params={
            "key": config.YOUTUBE_API_KEY,
            "q": query,
            "part": "snippet",
            "type": "video",
            "relevanceLanguage": "fr",
            "videoCaption": "any",
            "maxResults": max_results,
        },
        timeout=30,
    )
    search_resp.raise_for_status()
    items = search_resp.json().get("items", [])
    video_ids = [it["id"]["videoId"] for it in items if it.get("id", {}).get("videoId")]
    if not video_ids:
        return []

    details_resp = requests.get(
        VIDEOS_URL,
        params={
            "key": config.YOUTUBE_API_KEY,
            "id": ",".join(video_ids),
            "part": "snippet,contentDetails",
        },
        timeout=30,
    )
    details_resp.raise_for_status()
    candidates = []
    for item in details_resp.json().get("items", []):
        duration = _iso8601_duration_to_seconds(item["contentDetails"]["duration"])
        if duration > config.MAX_VIDEO_DURATION_SECONDS:
            continue
        candidates.append(VideoCandidate(
            video_id=item["id"],
            title=item["snippet"]["title"],
            channel_title=item["snippet"]["channelTitle"],
            duration_seconds=duration,
        ))
    return candidates


def clip_windows(duration_seconds: int):
    """Gera janelas curtas (config.CLIP_WINDOW_SECONDS) cobrindo o começo do
    vídeo, até config.MAX_WINDOWS_PER_VIDEO janelas — nunca o vídeo inteiro."""
    windows = []
    start = 0
    while start < duration_seconds and len(windows) < config.MAX_WINDOWS_PER_VIDEO:
        end = min(start + config.CLIP_WINDOW_SECONDS, duration_seconds)
        windows.append((start, end))
        start = end
    return windows
