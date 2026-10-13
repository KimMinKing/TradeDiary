import asyncio
import importlib
from contextlib import nullcontext

import httpx


def test_journal_feedback_route_requires_internal_key_and_returns_feedback(monkeypatch):
    monkeypatch.setenv("AI_SERVER_API_KEY", "integration-internal-key")
    main = importlib.import_module("main")
    monkeypatch.setattr(main, "AI_SERVER_API_KEY", "integration-internal-key")
    journal = importlib.import_module("routers.journal")

    async def fake_feedback(request):
        assert request.journal_id == 42
        assert request.symbol == "KRW-BTC"
        assert request.entry_reason == ""
        assert request.memo == ""
        return "손절 기준을 먼저 지켰습니다."

    monkeypatch.setattr(journal, "generate_journal_feedback", fake_feedback)
    payload = {
        "journal_id": 42,
        "trade_date": "2026-09-28",
        "symbol": "KRW-BTC",
        "entry_reason": None,
        "exit_reason": "손절",
        "emotion": "차분함",
        "memo": None,
        "tags": [],
        "checklist_rate": 1.0,
    }

    async def exercise():
        transport = httpx.ASGITransport(app=main.app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            class ReadyEngine:
                def connect(self):
                    return nullcontext(self)

                def execute(self, statement):
                    assert str(statement) == "SELECT 1"

            monkeypatch.setattr(main, "engine", ReadyEngine())
            health = await client.get("/health")
            assert health.status_code == 200
            assert health.json()["database"] == "UP"

            class BrokenEngine:
                def connect(self):
                    raise OSError("test database offline")

            monkeypatch.setattr(main, "engine", BrokenEngine())
            unavailable = await client.get("/health")
            assert unavailable.status_code == 503
            assert unavailable.json() == {"detail": "Database unavailable"}

            anonymous = await client.post("/api/journal/feedback", json=payload)
            assert anonymous.status_code == 401

            response = await client.post(
                "/api/journal/feedback",
                json=payload,
                headers={"X-Internal-API-Key": "integration-internal-key"},
            )
            assert response.status_code == 200
            assert response.json() == {"feedback": "손절 기준을 먼저 지켰습니다."}

    asyncio.run(exercise())
