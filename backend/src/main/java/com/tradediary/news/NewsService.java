// [파일 용도] CryptoCompare News API 호출 및 뉴스 데이터 반환 서비스

package com.tradediary.news;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

// [클래스] CryptoCompare News API 프록시 서비스 (무료, API 키 불필요, CORS 우회)
// JsonNode 사용으로 Spring SNAKE_CASE 직렬화 변환 방지
@Service
public class NewsService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String CRYPTOCOMPARE_BASE = "https://min-api.cryptocompare.com/data/v2/news/";

    private static final java.util.Map<String, String> CATEGORY_MAP = java.util.Map.of(
        "bitcoin",    "BTC",
        "ethereum",   "ETH",
        "altcoin",    "Altcoin",
        "market",     "Market",
        "mining",     "Mining",
        "trading",    "Trading",
        "regulation", "Regulation"
    );

    // [용도] CryptoCompare 뉴스 목록 조회 후 JsonNode 그대로 반환 / [호출] NewsController.getNews()
    // JsonNode 반환 시 Jackson이 키 이름을 변환하지 않아 원본 구조 유지됨
    public JsonNode getNews(String category, String sortOrder) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(CRYPTOCOMPARE_BASE)
                .queryParam("lang", "EN")
                .queryParam("sortOrder", sortOrder != null ? sortOrder : "latest");

        String cats = CATEGORY_MAP.getOrDefault(category, "");
        if (!cats.isEmpty()) {
            builder.queryParam("categories", cats);
        }

        String url = builder.toUriString();

        try {
            String raw = restTemplate.getForObject(url, String.class);
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            return objectMapper.createObjectNode();
        }
    }
}
