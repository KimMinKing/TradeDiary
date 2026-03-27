// [파일 용도] CryptoCompare News API 호출 및 뉴스 데이터 반환 서비스

package com.tradediary.news;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

// [클래스] CryptoCompare News API 프록시 서비스 (무료, API 키 불필요, CORS 우회)
@Service
public class NewsService {

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String CRYPTOCOMPARE_BASE = "https://min-api.cryptocompare.com/data/v2/news/";
    // 카테고리 목록: https://min-api.cryptocompare.com/data/news/categories
    private static final Map<String, String> CATEGORY_MAP = Map.of(
        "all",      "",
        "bitcoin",  "BTC",
        "ethereum", "ETH",
        "altcoin",  "Altcoin",
        "market",   "Market",
        "mining",   "Mining",
        "trading",  "Trading",
        "regulation", "Regulation"
    );

    // [용도] CryptoCompare 뉴스 목록 조회 / [호출] NewsController.getNews()
    // sortOrder: latest | popular
    // categories: 쉼표 구분 (예: BTC,ETH)
    public Map<String, Object> getNews(String category, String sortOrder) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(CRYPTOCOMPARE_BASE)
                .queryParam("lang", "EN")
                .queryParam("sortOrder", sortOrder != null ? sortOrder : "latest");

        String cats = CATEGORY_MAP.getOrDefault(category, "");
        if (!cats.isEmpty()) {
            builder.queryParam("categories", cats);
        }

        String url = builder.toUriString();

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.getForObject(url, Map.class);
        return response != null ? response : Map.of();
    }
}
