def response_language_instruction(language: str) -> str:
    if (language or "en").lower().startswith("ko"):
        return "모든 제목, 설명, 조언과 문장을 자연스러운 한국어로만 작성하세요. 영어 섹션 제목을 섞지 마세요."
    return "Write every heading, explanation, insight, and recommendation in natural English only. Do not include Korean text."
