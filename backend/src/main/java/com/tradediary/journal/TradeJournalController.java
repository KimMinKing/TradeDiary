// [파일 용도] 매매 일기 CRUD API 엔드포인트

package com.tradediary.journal;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// [클래스] 매매 일기 REST API 컨트롤러
@RestController
@RequestMapping("/api/journals")
@RequiredArgsConstructor
public class TradeJournalController {

    private final TradeJournalService journalService;

    // [용도] 일기 목록 조회 (symbol/from/to 필터 선택) / [호출] GET /api/journals
    @GetMapping
    public ResponseEntity<List<TradeJournalService.JournalResponse>> getJournals(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String symbol,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(journalService.getJournals(userId, symbol, from, to));
    }

    // [용도] 일기 단건 조회 / [호출] GET /api/journals/{id}
    @GetMapping("/{id}")
    public ResponseEntity<TradeJournalService.JournalResponse> getJournal(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        return ResponseEntity.ok(journalService.getJournal(userId, id));
    }

    // [용도] 일기 작성 / [호출] POST /api/journals
    @PostMapping
    public ResponseEntity<TradeJournalService.JournalResponse> createJournal(
            @AuthenticationPrincipal Long userId,
            @RequestBody TradeJournalService.JournalCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(journalService.createJournal(userId, request));
    }

    // [용도] 일기 수정 / [호출] PUT /api/journals/{id}
    @PutMapping("/{id}")
    public ResponseEntity<TradeJournalService.JournalResponse> updateJournal(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @RequestBody TradeJournalService.JournalUpdateRequest request) {
        return ResponseEntity.ok(journalService.updateJournal(userId, id, request));
    }

    // [용도] 일기 삭제 / [호출] DELETE /api/journals/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJournal(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        journalService.deleteJournal(userId, id);
        return ResponseEntity.noContent().build();
    }
}
