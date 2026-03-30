// [파일 용도] 뉴스 일별 요약 조회 및 CryptoCompare 원문 기사 프록시 서비스

package com.tradediary.news;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

// [클래스] 뉴스 관련 비즈니스 로직 서비스 (요약 조회, 원문 기사 프록시)
@Slf4j
@Service
@RequiredArgsConstructor
public class NewsService {

    private final NewsDailySummaryRepository summaryRepository;
    private final NewsScheduler newsScheduler;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${cryptocompare.api-key}")
    private String cryptoCompareKey;

    private static final String CRYPTOCOMPARE_BASE = "https://min-api.cryptocompare.com/data/v2/news/";

    // [용도] 오늘의 AI 시장 요약 조회 / [호출] NewsController.getSummary()
    public Optional<SummaryDto> getTodaySummary() {
        return summaryRepository.findBySummaryDate(LocalDate.now())
                .map(s -> new SummaryDto(s.getSummaryKo(), s.getUpdatedAt().toString()));
    }

    // [용도] 오늘 요약 강제 재생성 / [호출] NewsController.refreshSummary()
    public SummaryDto refreshTodaySummary() {
        newsScheduler.generateSummaryForDate(LocalDate.now(), true);
        return summaryRepository.findBySummaryDate(LocalDate.now())
                .map(s -> new SummaryDto(s.getSummaryKo(), s.getUpdatedAt().toString()))
                .orElse(new SummaryDto("요약 생성에 실패했습니다.", ""));
    }

    // [용도] CryptoCompare 원문 영어 기사 목록 조회 (프록시) / [호출] NewsController.getRawNews()
    public List<RawArticleDto> getRawNews(String category) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(CRYPTOCOMPARE_BASE)
                    .queryParam("lang", "EN")
                    .queryParam("sortOrder", "latest");
            if (category != null && !category.equals("all")) {
                builder.queryParam("categories", category.toUpperCase());
            }

            HttpHeaders headers = new HttpHeaders();
            if (cryptoCompareKey != null && !cryptoCompareKey.isBlank()) {
                headers.set("Authorization", "Apikey " + cryptoCompareKey);
            }

            ResponseEntity<String> res = restTemplate.exchange(
                    builder.toUriString(), HttpMethod.GET,
                    new HttpEntity<>(headers), String.class);

            JsonNode root = objectMapper.readTree(res.getBody());
            JsonNode data = root.path("Data");
            if (!data.isArray()) return List.of();

            List<RawArticleDto> result = new ArrayList<>();
            for (JsonNode a : data) {
                result.add(new RawArticleDto(
                        a.path("id").asText(),
                        a.path("title").asText(),
                        a.path("body").asText("").length() > 200
                                ? a.path("body").asText("").substring(0, 200) + "..."
                                : a.path("body").asText(""),
                        a.path("source").asText(""),
                        a.path("url").asText(""),
                        a.path("categories").asText(""),
                        a.path("published_on").asLong()
                ));
            }
            return result;

        } catch (Exception e) {
            log.error("[NewsService] CryptoCompare 조회 오류: {}", e.getMessage());
            return List.of();
        }
    }

    // [용도] 오늘의 AI 요약 응답 DTO
    public record SummaryDto(String summaryKo, String updatedAt) {}

    // [용도] CryptoCompare 원문 기사 응답 DTO
    public record RawArticleDto(
            String id,
            String title,
            String body,
            String source,
            String url,
            String categories,
            long publishedOn
    ) {}
}
