// [파일 용도] 5분마다 CryptoCompare 뉴스 수집 → Gemini 번역 → DB 저장 스케줄러

package com.tradediary.news;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

// [클래스] 뉴스 수집·번역·저장 스케줄러 (5분 주기)
@Slf4j
@Component
@RequiredArgsConstructor
public class NewsScheduler {

    private final NewsArticleRepository newsArticleRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${cryptocompare.api-key}")
    private String cryptoCompareKey;

    @Value("${ai-server.url}")
    private String aiServerUrl;

    private static final String CRYPTOCOMPARE_BASE = "https://min-api.cryptocompare.com/data/v2/news/";

    // [용도] 5분마다 뉴스 수집·번역·저장 실행 / [호출] Spring Scheduler
    @Scheduled(fixedDelay = 300_000, initialDelay = 10_000)
    public void fetchAndTranslateNews() {
        try {
            log.info("[NewsScheduler] 뉴스 수집 시작");
            List<JsonNode> articles = fetchFromCryptoCompare();
            if (articles.isEmpty()) {
                log.info("[NewsScheduler] 새 기사 없음");
                return;
            }

            // DB에 없는 새 기사만 필터링
            List<String> externalIds = articles.stream()
                    .map(a -> a.path("id").asText())
                    .collect(Collectors.toList());
            Set<String> existing = newsArticleRepository.findExistingExternalIds(externalIds);
            List<JsonNode> newArticles = articles.stream()
                    .filter(a -> !existing.contains(a.path("id").asText()))
                    .limit(20)  // 한 번에 최대 20건만 처리
                    .collect(Collectors.toList());

            if (newArticles.isEmpty()) {
                log.info("[NewsScheduler] 모두 기존 기사, 스킵");
                return;
            }

            log.info("[NewsScheduler] 새 기사 {}건 번역 요청", newArticles.size());

            // Gemini 번역 (최대 10건씩 배치, 배치 간 3초 대기)
            List<NewsArticle> toSave = new ArrayList<>();
            for (int i = 0; i < newArticles.size(); i += 10) {
                List<JsonNode> batch = newArticles.subList(i, Math.min(i + 10, newArticles.size()));
                List<NewsArticle> translated = translateBatch(batch);
                toSave.addAll(translated);
                if (i + 10 < newArticles.size()) {
                    Thread.sleep(3000);
                }
            }

            newsArticleRepository.saveAll(toSave);
            log.info("[NewsScheduler] {}건 저장 완료", toSave.size());

        } catch (Exception e) {
            log.error("[NewsScheduler] 오류: {}", e.getMessage());
        }
    }

    // [용도] CryptoCompare에서 최신 뉴스 100건 수집 / [호출] fetchAndTranslateNews
    private List<JsonNode> fetchFromCryptoCompare() {
        String url = UriComponentsBuilder.fromHttpUrl(CRYPTOCOMPARE_BASE)
                .queryParam("lang", "EN")
                .queryParam("sortOrder", "latest")
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        if (cryptoCompareKey != null && !cryptoCompareKey.isBlank()) {
            headers.set("Authorization", "Apikey " + cryptoCompareKey);
        }

        try {
            ResponseEntity<String> res = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            JsonNode root = objectMapper.readTree(res.getBody());
            JsonNode data = root.path("Data");
            if (!data.isArray()) return List.of();

            List<JsonNode> result = new ArrayList<>();
            data.forEach(result::add);
            return result;
        } catch (Exception e) {
            log.error("[NewsScheduler] CryptoCompare fetch 오류: {}", e.getMessage());
            return List.of();
        }
    }

    // [용도] AI 서버에 번역 요청 후 NewsArticle 리스트 반환 / [호출] fetchAndTranslateNews
    private List<NewsArticle> translateBatch(List<JsonNode> batch) {
        try {
            // 요청 body 구성
            ArrayNode articlesArray = objectMapper.createArrayNode();
            for (JsonNode a : batch) {
                ObjectNode item = objectMapper.createObjectNode();
                item.put("external_id", a.path("id").asText());
                item.put("title",       a.path("title").asText());
                item.put("body",        a.path("body").asText(""));
                item.put("source",      a.path("source").asText(""));
                item.put("url",         a.path("url").asText(""));
                item.put("categories",  a.path("categories").asText(""));
                articlesArray.add(item);
            }
            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.set("articles", articlesArray);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<String> res = restTemplate.exchange(
                    aiServerUrl + "/news/translate",
                    HttpMethod.POST,
                    new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers),
                    String.class
            );

            JsonNode root = objectMapper.readTree(res.getBody());
            JsonNode results = root.path("results");

            // 원본 기사 맵 (id → node)
            Map<String, JsonNode> originalMap = new HashMap<>();
            for (JsonNode a : batch) originalMap.put(a.path("id").asText(), a);

            List<NewsArticle> saved = new ArrayList<>();
            results.forEach(r -> {
                String externalId = r.path("external_id").asText();
                JsonNode original = originalMap.get(externalId);
                if (original == null) return;

                NewsArticle article = new NewsArticle();
                article.setExternalId(externalId);
                article.setTitleKo(r.path("title_ko").asText());
                article.setSummaryKo(r.path("summary_ko").asText());
                article.setSource(original.path("source").asText(""));
                article.setOriginalUrl(original.path("url").asText(""));
                article.setCategories(original.path("categories").asText(""));
                long publishedOn = original.path("published_on").asLong();
                article.setPublishedAt(
                        LocalDateTime.ofInstant(Instant.ofEpochSecond(publishedOn), ZoneId.of("Asia/Seoul"))
                );
                saved.add(article);
            });
            return saved;

        } catch (Exception e) {
            log.error("[NewsScheduler] 번역 오류: {}", e.getMessage());
            return List.of();
        }
    }
}
