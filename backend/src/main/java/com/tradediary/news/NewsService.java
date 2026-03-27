// [파일 용도] CryptoPanic API 호출 및 뉴스 데이터 반환 서비스

package com.tradediary.news;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

// [클래스] CryptoPanic REST API 프록시 서비스 (API 키 보호 + CORS 우회)
@Service
public class NewsService {

    @Value("${cryptopanic.api-key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String CRYPTOPANIC_BASE = "https://cryptopanic.com/api/developer/v2/posts/";

    // [용도] CryptoPanic 뉴스 목록 조회 후 결과 그대로 반환 / [호출] NewsController.getNews()
    public Map<String, Object> getNews(String filter, int page) {
        String url = UriComponentsBuilder.fromHttpUrl(CRYPTOPANIC_BASE)
                .queryParam("auth_token", apiKey)
                .queryParam("public", "true")
                .queryParam("kind", "news")
                .queryParam("filter", filter)
                .queryParam("page", page)
                .toUriString();

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.getForObject(url, Map.class);
        return response != null ? response : Map.of();
    }
}
