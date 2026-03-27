// [파일 용도] 번역된 뉴스 기사 조회 API 엔드포인트

package com.tradediary.news;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// [클래스] 뉴스 REST API 컨트롤러 (DB 기반 번역 기사 반환)
@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    // [용도] 번역된 뉴스 목록 조회 / [호출] GET /api/news?category=all|bitcoin|...&page=0&size=30
    @GetMapping
    public ResponseEntity<List<NewsService.NewsArticleDto>> getNews(
            @RequestParam(defaultValue = "all") String category,
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "30")  int size) {
        return ResponseEntity.ok(newsService.getNews(category, page, size));
    }
}
