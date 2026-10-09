// [?뚯씪 ?⑸룄] Python AI ?쒕쾭 ?몄텧 HTTP ?대씪?댁뼵??

package com.tradediary.ai;

import com.tradediary.stats.StatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.HashMap;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;

// [?대옒?? Python FastAPI AI ?쒕쾭??/report/analyze ?붾뱶?ъ씤???몄텧
@Slf4j
@Component
@RequiredArgsConstructor
public class AiReportClient {

    @Value("${ai-server.url}")
    private String aiServerUrl;

    @Value("${ai-server.api-key}")
    private String aiServerApiKey;

    @Value("${deepseek.api-key}")
    private String deepseekApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

    // [?⑸룄] ?듦퀎 ?곗씠?곕? AI ?쒕쾭???꾩넚 ??遺꾩꽍 由ы룷???섏떊 / [?몄텧] AiReportService.generateReport()
    public String analyze(AiReportRequest request) {
        try {
            ObjectMapper mapper = new ObjectMapper()
                    .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
            String json = mapper.writeValueAsString(request);

            HttpHeaders headers = createAiServerHeaders();
            HttpEntity<String> entity = new HttpEntity<>(json, headers);

            ResponseEntity<String> resp = restTemplate.exchange(
                    aiServerUrl + "/report/analyze",
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            JsonNode root = mapper.readTree(resp.getBody());
            return root.path("report").asText("AI 遺꾩꽍 寃곌낵瑜?媛?몄삱 ???놁뒿?덈떎.");
        } catch (Exception e) {
            log.error("[AI] 由ы룷???앹꽦 ?ㅽ뙣: {}", e.getMessage());
            throw new RuntimeException("AI ?쒕쾭 ?곌껐 ?ㅽ뙣: " + e.getMessage());
        }
    }

    // AI ?쒕쾭 ?붿껌 DTO (Python models.py ??ReportRequest ? 留ㅽ븨)
    public record AiReportRequest(
            String language,
            String exchange,
            StatsService.StatsResponse.SummaryStats summary,
            List<StatsService.StatsResponse.SymbolStats> topSymbols,
            List<StatsService.StatsResponse.EmotionStats> emotionStats,
            Integer bestHour,
            Integer worstHour
    ) {}

    // AI ?쒕쾭 ?묐떟 DTO
    public record AiReportResponse(String report) {}

    // [?⑸룄] ?쇨린 ?쇰뱶諛??붿껌 / [?몄텧] TradeJournalService.getJournalFeedback()
    public String analyzeJournal(JournalFeedbackRequest request) {
        try {
            ObjectMapper mapper = new ObjectMapper()
                    .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
            String json = mapper.writeValueAsString(request);

            HttpHeaders headers = createAiServerHeaders();
            HttpEntity<String> entity = new HttpEntity<>(json, headers);

            ResponseEntity<String> resp = restTemplate.exchange(
                    aiServerUrl + "/journal/feedback",
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            JsonNode root = mapper.readTree(resp.getBody());
            return root.path("feedback").asText("AI 遺꾩꽍 寃곌낵瑜?媛?몄삱 ???놁뒿?덈떎.");
        } catch (Exception e) {
            log.error("[AI] ?쇨린 ?쇰뱶諛??앹꽦 ?ㅽ뙣: {}", e.getMessage());
            throw new RuntimeException("AI ?쒕쾭 ?곌껐 ?ㅽ뙣: " + e.getMessage());
        }
    }

    // [?⑸룄] ?몃젅?대뜑 ?좏삎 AI 肄붿묶 ?붿껌 / [?몄텧] TraderTypeService.generateAdvice()
    //        RestClient 媛 蹂몃Ц??鍮꾩썙/malformed 濡?蹂대궡 RestTemplate ?쇰줈 吏곸젒 ?꾩넚
    // [용도] 매매 계획 AI 한줄평 / [호출] TradeJournalService.getPlanReview()
    public String analyzePlanReview(PlanReviewRequest request) {
        try {
            ObjectMapper mapper = new ObjectMapper()
                    .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
            String json = mapper.writeValueAsString(request);

            HttpHeaders headers = createAiServerHeaders();
            HttpEntity<String> entity = new HttpEntity<>(json, headers);

            ResponseEntity<String> resp = restTemplate.exchange(
                    aiServerUrl + "/journal/plan-review",
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            JsonNode root = mapper.readTree(resp.getBody());
            return root.path("feedback").asText("AI 한줄평을 가져오지 못했습니다.");
        } catch (Exception e) {
            log.error("[AI] 매매 계획 한줄평 생성 실패: {}", e.getMessage());
            throw new RuntimeException("AI 서버 연결 실패: " + e.getMessage());
        }
    }
    // [용도] 매매 계획 AI 한줄평 / [호출] TradeJournalService.getPlanReview()
    public String analyzeTraderTypeAdvice(TraderTypeAdviceRequest request) {
        try {
            ObjectMapper mapper = new ObjectMapper()
                    .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
            String json = mapper.writeValueAsString(request);

            HttpHeaders headers = createAiServerHeaders();
            HttpEntity<String> entity = new HttpEntity<>(json, headers);

            ResponseEntity<String> resp = restTemplate.exchange(
                    aiServerUrl + "/trader-type/advice",
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            JsonNode root = mapper.readTree(resp.getBody());
            return root.path("advice").asText("AI 遺꾩꽍 寃곌낵瑜?媛?몄삱 ???놁뒿?덈떎.");
        } catch (Exception e) {
            log.error("[AI] ?몃젅?대뜑 ?좏삎 肄붿묶 ?앹꽦 ?ㅽ뙣: {}", e.getMessage());
            throw new RuntimeException("AI ?쒕쾭 ?곌껐 ?ㅽ뙣: " + e.getMessage());
        }
    }

    // [?⑸룄] 湲곌컙蹂?由щ럭 ?붿껌 / [?몄텧] TradeJournalService.getPeriodReview()
    public String analyzePeriod(PeriodReviewRequest request) {
        try {
            // DeepSeek API瑜?吏곸젒 ?몄텧?섏뿬 湲곌컙蹂?由щ럭 ?앹꽦
            return callDeepSeekForPeriodReview(request);
        } catch (Exception e) {
            log.error("[AI] 湲곌컙 由щ럭 ?앹꽦 ?ㅽ뙣: {}", e.getMessage());
            throw new RuntimeException("AI ?쒕쾭 ?곌껐 ?ㅽ뙣: " + e.getMessage());
        }
    }

    // [?⑸룄] DeepSeek API ?몄텧?섏뿬 湲곌컙蹂?由щ럭 ?앹꽦 / [?몄텧] analyzePeriod()
    private String callDeepSeekForPeriodReview(PeriodReviewRequest request) {
        try {
            // 湲곌컙蹂??쇨린 ?댁슜 ?듯빀
            String journalsText = request.journals().stream()
                    .map(journal -> String.format("- %s: %s",
                            journal.get("trade_date"),
                            journal.get("content")))
                    .collect(Collectors.joining("\n"));

            String prompt = String.format("""
                ?ㅼ쓬? %s 湲곌컙??留ㅻℓ ?쇨린 ?곗씠?곗엯?덈떎.
                湲곌컙: %s ~ %s

                ?쇨린 ?댁슜:
                %s

                ???곗씠?곕? 遺꾩꽍?섏뿬 ?ㅼ쓬 ??ぉ?ㅼ쓣 ?쒓뎅?대줈 ?붿빟?댁＜?몄슂.
                諛섎뱶???쒓뎅?대줈留??묐떟?섍퀬, ?대뼚???쒖옄???ъ슜?섏? 留덉꽭??
                1. 珥?嫄곕옒 ?깃낵 (?밸쪧, ?섏씡瑜???
                2. 二쇱슂 ?깃났 ?⑦꽩
                3. 媛쒖꽑???꾩슂????
                4. ?쒖옣 ?곹깭? ?몃젅?대뵫 愿怨?

                媛꾧껐?섍퀬 ?듭떖?곸씤 ?댁슜 ?꾩＜濡?5~6臾몄옣?쇰줈 ?묒꽦?댁＜?몄슂.
                """,
                request.period(),
                request.from(),
                request.to(),
                journalsText);

            // DeepSeek API ?몄텧
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(deepseekApiKey);

            Map<String, Object> body = new HashMap<>();
            body.put("model", "deepseek-chat");
            body.put("messages", List.of(Map.of("role", "user", "content", prompt)));
            body.put("temperature", 0.4);
            body.put("max_tokens", 500);

            ResponseEntity<String> response = restTemplate.exchange(
                    DEEPSEEK_URL,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class
            );

            // JSON ?묐떟?먯꽌 content 異붿텧
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response.getBody());
            return root.path("choices").get(0)
                    .path("message").path("content").asText("遺꾩꽍 寃곌낵瑜??앹꽦?????놁뒿?덈떎.");

        } catch (Exception e) {
            log.error("[DeepSeek] 湲곌컙 由щ럭 ?앹꽦 ?ㅽ뙣: {}", e.getMessage());
            return "AI 遺꾩꽍???ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?쒕룄?댁＜?몄슂.";
        }
    }

    // ?쇨린 ?쇰뱶諛??붿껌 DTO
    public record JournalFeedbackRequest(
            String language,
            Long journalId,
            String tradeDate,
            String symbol,
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            List<String> tags,
            double checklistRate,
            String positionPnl
    ) {}

    // ?쇨린 ?쇰뱶諛??묐떟 DTO
    public record JournalFeedbackResponse(String feedback) {}

    // ?몃젅?대뜑 ?좏삎 肄붿묶 ?붿껌 DTO (Python models.py ??TraderTypeAdviceRequest ? 留ㅽ븨)
    public record TraderTypeAdviceRequest(
            String language,
            String typeCode,
            String typeName,
            String description,
            String strength,
            String weakness,
            Stats stats
    ) {
        public record Stats(
                int totalPositions,
                double avgHoldHours,
                int uniqueSymbols,
                double winRate,
                double avgPnlPerTrade
        ) {}
    }

    // ?몃젅?대뜑 ?좏삎 肄붿묶 ?묐떟 DTO (?몃? ?묐떟 DTO ? ?대쫫 異⑸룎 ?뚰뵾)
    public record AiAdviceResponse(String advice) {}

    // 湲곌컙蹂?由щ럭 ?붿껌 DTO
    public record PeriodReviewRequest(
            String language,
            String period,
            String from,
            String to,
            List<Map<String, String>> journals
    ) {}

    // 湲곌컙蹂?由щ럭 ?묐떟 DTO
    public record PeriodReviewResponse(String review) {}

    private HttpHeaders createAiServerHeaders() {
        if (aiServerApiKey == null || aiServerApiKey.isBlank()) {
            throw new IllegalStateException("AI_SERVER_API_KEY가 설정되지 않았습니다.");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Internal-API-Key", aiServerApiKey);
        return headers;
    }

    // 湲곌컙蹂?由щ럭???쇨린 ?붿빟
    // 매매 계획 AI 요청 DTO
    public record PlanReviewRequest(
            String language,
            String tradeDate,
            List<PlanSummary> plans,
            JournalDraft journal
    ) {}

    public record PlanSummary(
            String planDate,
            String symbol,
            String direction,
            String content,
            Boolean done
    ) {}

    public record JournalDraft(
            String symbol,
            String entryReason,
            String exitReason,
            String emotion,
            String memo
    ) {}
    // 매매 계획 AI 요청 DTO
    public record JournalSummary(
            Long id,
            String tradeDate,
            String symbol,
            String entryReason,
            String exitReason,
            String emotion,
            String memo,
            List<String> tags
    ) {}

    // 湲곌컙蹂?由щ럭???ъ????붿빟
    public record PositionSummary(
            Long id,
            String symbol,
            String pnl
    ) {}
}
