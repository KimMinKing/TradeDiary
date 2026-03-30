// [파일 용도] 뉴스 API 엔드포인트 (일별 AI 요약 + 원문 기사 목록)

package com.tradediary.news;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// [클래스] 뉴스 REST API 컨트롤러
@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    // [용도] 오늘의 AI 시장 요약 조회 / [호출] GET /api/news/summary
    @GetMapping("/summary")
    public ResponseEntity<?> getSummary() {
        return newsService.getTodaySummary()
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(Map.of("summaryKo", "", "updatedAt", "")));
    }

    // [용도] 오늘 요약 강제 재생성 / [호출] POST /api/news/summary/refresh
    @PostMapping("/summary/refresh")
    public ResponseEntity<NewsService.SummaryDto> refreshSummary() {
        return ResponseEntity.ok(newsService.refreshTodaySummary());
    }

    // [용도] CryptoCompare 원문 영어 기사 목록 조회 / [호출] GET /api/news?category=all|BTC|ETH|...
    @GetMapping
    public ResponseEntity<List<NewsService.RawArticleDto>> getRawNews(
            @RequestParam(defaultValue = "all") String category) {
        return ResponseEntity.ok(newsService.getRawNews(category));
    }
}
