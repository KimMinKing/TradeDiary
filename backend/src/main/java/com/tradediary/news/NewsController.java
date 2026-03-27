// [파일 용도] CryptoCompare 뉴스 프록시 API 엔드포인트

package com.tradediary.news;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// [클래스] 코인 뉴스 REST API 컨트롤러 (CryptoCompare 프록시)
@RestController
@RequestMapping("/api/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    // [용도] 코인 뉴스 목록 조회 / [호출] GET /api/news?category=all|bitcoin|ethereum|...&sortOrder=latest|popular
    @GetMapping
    public ResponseEntity<Map<String, Object>> getNews(
            @RequestParam(defaultValue = "all") String category,
            @RequestParam(defaultValue = "latest") String sortOrder) {
        return ResponseEntity.ok(newsService.getNews(category, sortOrder));
    }
}
