// [파일 용도] CryptoCompare News API 호출 및 뉴스 데이터 반환 서비스

package com.tradediary.news;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

// [클래스] CryptoCompare News API 프록시 서비스 (CORS 우회, API 키 보호)
// JsonNode 반환으로 Spring SNAKE_CASE 변환 방지
@Service
public class NewsService {

    @Value("${cryptocompare.api-key}")
    private String apiKey;

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
    public JsonNode getNews(String category, String sortOrder) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(CRYPTOCOMPARE_BASE)
                .queryParam("lang", "EN")
                .queryParam("sortOrder", sortOrder != null ? sortOrder : "latest");

        String cats = CATEGORY_MAP.getOrDefault(category, "");
        if (!cats.isEmpty()) {
            builder.queryParam("categories", cats);
        }

        String url = builder.toUriString();

        // API 키를 Authorization 헤더로 전달 (CryptoCompare 권장 방식)
        HttpHeaders headers = new HttpHeaders();
        if (apiKey != null && !apiKey.isBlank()) {
            headers.set("Authorization", "Apikey " + apiKey);
        }
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return objectMapper.readTree(res.getBody());
        } catch (Exception e) {
            return objectMapper.createObjectNode();
        }
    }
}
