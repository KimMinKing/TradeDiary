import asyncio

from services.chart_analysis_service import ChartAnalysisService


def test_chart_model_initializes_once_on_first_analysis(monkeypatch):
    service = ChartAnalysisService()
    calls = []

    async def initialize():
        calls.append("initialized")

    monkeypatch.setattr(service, "initialize", initialize)
    monkeypatch.setattr(service, "preprocess_chart_image", lambda path: None)

    async def exercise():
        assert (await service.analyze_patterns("missing.png"))["error"] == "Image processing failed"
        assert (await service.analyze_patterns("missing.png"))["error"] == "Image processing failed"

    asyncio.run(exercise())
    assert calls == ["initialized"]
