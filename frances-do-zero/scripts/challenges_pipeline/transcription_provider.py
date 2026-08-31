"""Abstração pra análise audiovisual de um trecho de vídeo em busca de uma
expressão. Hoje só existe a implementação GeminiVertexAIProvider, mas o
pipeline (generate_challenges.py) só conhece esta interface — trocar de
provider no futuro não deveria exigir mudar o resto do código."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class ClipAnalysis:
    expression_found: bool
    canonical_expression: str
    spoken_occurrence: Optional[str]
    timestamp_start: Optional[float]
    timestamp_end: Optional[float]
    transcript: Optional[str]
    confidence: float
    audio_clarity: Optional[str]   # "high" | "medium" | "low"
    context_quality: Optional[str]  # "high" | "medium" | "low"
    notes: Optional[str]
    model_used: str


class TranscriptionProvider(ABC):
    @abstractmethod
    def analyze_clip(self, video_id: str, start_seconds: float, end_seconds: float,
                      canonical_expression: str) -> ClipAnalysis:
        """Analisa um trecho curto (start_seconds..end_seconds) de um vídeo do
        YouTube em busca da expressão. Nunca deve inventar uma ocorrência,
        timestamp ou transcrição — se não encontrar a expressão com confiança
        suficiente, expression_found deve ser False."""
        raise NotImplementedError
