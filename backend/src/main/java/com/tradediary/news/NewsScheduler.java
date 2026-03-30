// [파일 용도] 매일 오전 6시 CryptoCompare 헤드라인 수집 → Gemini 요약 → DB 저장 스케줄러

package com.tradediary.news;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// [클래스] 뉴스 일별 AI 요약 생성 스케줄러 (매일 오전 6시)
@Slf4j
@Component
@RequiredArgsConstructor
public class NewsScheduler {

    private final NewsDailySummaryRepository summaryRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${cryptocompare.api-key}")
    private String cryptoCompareKey;

    @Value("${groq.api-key:}")
    private String groqApiKey;

    private static final String CRYPTOCOMPARE_BASE = "https://min-api.cryptocompare.com/data/v2/news/";
    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";

    // [용도] 매일 오전 6시 일별 요약 생성 (없으면 생성, 있으면 스킵) / [호출] Spring Scheduler
    @Scheduled(cron = "0 0 6 * * *", zone = "Asia/Seoul")
    public void scheduleDailySummary() {
        generateSummaryForDate(LocalDate.now(), false);
    }

    // [용도] 서버 시작 10초 후 오늘 요약 없으면 자동 생성 / [호출] Spring Scheduler
    @Scheduled(fixedDelay = Long.MAX_VALUE, initialDelay = 10_000)
    public void generateOnStartup() {
        if (summaryRepository.findBySummaryDate(LocalDate.now()).isEmpty()) {
            log.info("[NewsScheduler] 오늘 요약 없음 → 생성 시작");
            generateSummaryForDate(LocalDate.now(), false);
        }
    }

    // [용도] 특정 날짜 요약 생성 (force=true이면 기존 덮어쓰기) / [호출] scheduleDailySummary, generateOnStartup, NewsService
    public void generateSummaryForDate(LocalDate date, boolean force) {
        try {
            if (!force && summaryRepository.findBySummaryDate(date).isPresent()) {
                log.info("[NewsScheduler] {} 요약 이미 존재, 스킵", date);
                return;
            }

            log.info("[NewsScheduler] {} 요약 생성 시작", date);

            // CryptoCompare 헤드라인 수집 (최신 20건)
            List<String> headlines = fetchHeadlines();
            if (headlines.isEmpty()) {
                log.warn("[NewsScheduler] 헤드라인 없음, 중단");
                return;
            }

            // Groq 요약 생성
            String summaryKo = callGroq(headlines);
            if (summaryKo == null || summaryKo.isBlank()) {
                log.warn("[NewsScheduler] Gemini 응답 없음");
                return;
            }

            // DB 저장 (upsert)
            NewsDailySummary summary = summaryRepository.findBySummaryDate(date)
                    .orElseGet(NewsDailySummary::new);
            summary.setSummaryDate(date);
            summary.setSummaryKo(summaryKo);
            summary.setUpdatedAt(LocalDateTime.now());
            summaryRepository.save(summary);

            log.info("[NewsScheduler] {} 요약 저장 완료 ({}자)", date, summaryKo.length());

        } catch (Exception e) {
            log.error("[NewsScheduler] 요약 생성 오류: {}", e.getMessage());
        }
    }

    // [용도] CryptoCompare 최신 헤드라인 제목 목록 수집 (최대 20건) / [호출] generateSummaryForDate
    private List<String> fetchHeadlines() {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(CRYPTOCOMPARE_BASE)
                    .queryParam("lang", "EN")
                    .queryParam("sortOrder", "latest")
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            if (cryptoCompareKey != null && !cryptoCompareKey.isBlank()) {
                headers.set("Authorization", "Apikey " + cryptoCompareKey);
            }

            ResponseEntity<String> res = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            JsonNode root = objectMapper.readTree(res.getBody());
            JsonNode data = root.path("Data");
            if (!data.isArray()) return List.of();

            List<String> titles = new ArrayList<>();
            int count = 0;
            for (JsonNode article : data) {
                if (count++ >= 20) break;
                String title = article.path("title").asText("");
                if (!title.isBlank()) titles.add(title);
            }
            return titles;

        } catch (Exception e) {
            log.error("[NewsScheduler] CryptoCompare fetch 오류: {}", e.getMessage());
            return List.of();
        }
    }

    // [용도] Groq API 호출하여 헤드라인 기반 한국어 시장 요약 생성 / [호출] generateSummaryForDate
    private String callGroq(List<String> headlines) {
        try {
            String headlineText = String.join("\n", headlines.stream()
                    .map(h -> "- " + h)
                    .toList());

            String prompt = "아래는 오늘의 암호화폐 뉴스 헤드라인입니다.\n"
                    + "이 헤드라인들을 분석하여 오늘의 주요 시장 동향을 한국어로 3~4문장 이내로 간결하게 요약해주세요.\n"
                    + "가격 움직임, 주요 이벤트, 시장 분위기를 중심으로 작성하고, 다른 텍스트 없이 요약문만 반환하세요.\n\n"
                    + "헤드라인:\n" + headlineText;

            // Groq 요청 JSON 구성 (OpenAI 호환 형식)
            com.fasterxml.jackson.databind.node.ObjectNode messageNode = objectMapper.createObjectNode();
            messageNode.put("role", "user");
            messageNode.put("content", prompt);

            com.fasterxml.jackson.databind.node.ObjectNode body = objectMapper.createObjectNode();
            body.put("model", GROQ_MODEL);
            body.set("messages", objectMapper.createArrayNode().add(messageNode));
            body.put("temperature", 0.4);
            body.put("max_tokens", 300);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            ResponseEntity<String> res = restTemplate.exchange(
                    GROQ_URL, HttpMethod.POST,
                    new HttpEntity<>(objectMapper.writeValueAsString(body), headers),
                    String.class
            );

            JsonNode root = objectMapper.readTree(res.getBody());
            return root.path("choices").get(0)
                    .path("message").path("content").asText("").strip();

        } catch (Exception e) {
            log.error("[NewsScheduler] Groq 호출 오류: {}", e.getMessage());
            return null;
        }
    }
}
