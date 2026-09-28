// [?뚯씪 ?⑸룄] 留ㅻℓ ?쇨린 CRUD API ?붾뱶?ъ씤??

package com.tradediary.journal;

import lombok.RequiredArgsConstructor;
import lombok.Data;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

// [?대옒?? 留ㅻℓ ?쇨린 REST API 而⑦듃濡ㅻ윭
@RestController
@RequestMapping("/api/journals")
@RequiredArgsConstructor
public class TradeJournalController {

    // [?⑸룄] 理쒓렐 1二쇱씪 AI 由щ럭 Response DTO
    @Data
    static class WeeklyReviewResponse {
        private String review;
        private LocalDateTime created_at;
    }

    private final TradeJournalService journalService;

    // [?⑸룄] ?쇨린 紐⑸줉 議고쉶 (symbol/from/to/keyword/tagId ?꾪꽣 ?좏깮) / [?몄텧] GET /api/journals
    @GetMapping
    public ResponseEntity<List<TradeJournalService.JournalResponse>> getJournals(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String symbol,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) List<Long> tagId) {
        return ResponseEntity.ok(journalService.getJournals(userId, symbol, from, to, keyword, tagId));
    }

    // [?⑸룄] ?쇨린 ?④굔 議고쉶 / [?몄텧] GET /api/journals/{id}
    @GetMapping("/{id}")
    public ResponseEntity<TradeJournalService.JournalDetailResponse> getJournal(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        return ResponseEntity.ok(journalService.getJournal(userId, id));
    }

    // [?⑸룄] ?쇨린 ?묒꽦 / [?몄텧] POST /api/journals
    @PostMapping
    public ResponseEntity<TradeJournalService.JournalResponse> createJournal(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody TradeJournalService.JournalCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(journalService.createJournal(userId, request));
    }

    // [?⑸룄] ?쇨린 ?섏젙 / [?몄텧] PUT /api/journals/{id}
    @PutMapping("/{id}")
    public ResponseEntity<TradeJournalService.JournalResponse> updateJournal(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody TradeJournalService.JournalUpdateRequest request) {
        return ResponseEntity.ok(journalService.updateJournal(userId, id, request));
    }

    // [?⑸룄] ?쇨린 ??젣 / [?몄텧] DELETE /api/journals/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJournal(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        journalService.deleteJournal(userId, id);
        return ResponseEntity.noContent().build();
    }

    // [?⑸룄] 媛먯젙 ?몃젋???곗씠??議고쉶 / [?몄텧] GET /api/journals/emotion-timeline
    @GetMapping("/emotion-timeline")
    public ResponseEntity<List<TradeJournalService.EmotionTimeline>> getEmotionTimeline(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(journalService.getEmotionTimeline(userId, from, to));
    }

    // [?⑸룄] ?뱀젙 ?ъ슜?먯쓽 怨듦컻 ?쇨린 議고쉶 / [?몄텧] GET /api/journals/public/{userId}
    @GetMapping("/public/{userId}")
    public ResponseEntity<TradeJournalService.PublicJournalResponse> getPublicJournals(
            @AuthenticationPrincipal Long requesterId,
            @PathVariable Long userId) {
        return ResponseEntity.ok(journalService.getPublicJournals(userId));
    }

    @GetMapping("/public/{userId}/{journalId}/image")
    public ResponseEntity<Map<String, String>> getPublicJournalImage(
            @AuthenticationPrincipal Long requesterId,
            @PathVariable Long userId,
            @PathVariable Long journalId) {
        return ResponseEntity.ok(Map.of("image", journalService.getPublicJournalImage(userId, journalId)));
    }

    // [?⑸룄] 媛쒕퀎 ?쇨린 AI ?쇰뱶諛??앹꽦 / [?몄텧] POST /api/journals/{id}/ai-feedback
    @PostMapping("/{id}/ai-feedback")
    public ResponseEntity<String> getJournalFeedback(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean refresh) {
        return ResponseEntity.ok(journalService.getJournalFeedback(userId, id, refresh));
    }

    // [?⑸룄] 湲곌컙蹂?AI 由щ럭 ?앹꽦 / [?몄텧] POST /api/journals/period-review
    @PostMapping("/period-review")
    public ResponseEntity<String> getPeriodReview(
            @AuthenticationPrincipal Long userId,
            @RequestBody Map<String, String> request) {
        String period = request.get("period");
        String from = request.get("from");
        String to = request.get("to");
        return ResponseEntity.ok(journalService.getPeriodReview(userId, period, from, to));
    }

    // [?⑸룄] 理쒓렐 1二쇱씪 嫄곕옒 ?붿빟 AI 由щ럭 ?앹꽦 / [?몄텧] POST /api/journals/weekly-review
    // [용도] 날짜별 매매 계획 AI 한줄평 / [호출] JournalPage.jsx
    @PostMapping("/plan-review")
    public ResponseEntity<String> getPlanReview(
            @AuthenticationPrincipal Long userId,
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(journalService.getPlanReview(
                userId,
                request.get("trade_date"),
                request.get("symbol"),
                request.get("entry_reason"),
                request.get("exit_reason"),
                request.get("emotion"),
                request.get("memo")
        ));
    }

    @PostMapping("/weekly-review")
    public ResponseEntity<WeeklyReviewResponse> getWeeklyReview(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(journalService.getWeeklyReview(userId));
    }
}
