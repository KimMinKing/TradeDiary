// [파일 용도] 일기 exchange 필드 NULL 값 업데이트 API 엔드포인트

package com.tradediary.journal.scripts;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.context.annotation.Profile;

@RestController
@RequestMapping("/api/scripts")
@RequiredArgsConstructor
@Profile({"local", "dev"})
public class JournalExchangeUpdateController {

    private final JournalExchangeUpdater journalExchangeUpdater;

    // [용도] NULL 값 업데이트 실행 (관리자용) / [호출] 직접 호출
    @PostMapping("/journal-exchange/update")
    public ResponseEntity<String> updateJournalExchange() {
        try {
            long beforeCount = journalExchangeUpdater.countNullExchanges();
            if (beforeCount == 0) {
                return ResponseEntity.ok("업데이트할 NULL 값이 없습니다.");
            }

            journalExchangeUpdater.updateNullExchanges();
            return ResponseEntity.ok("NULL 값 업데이트 완료");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("업데이트 실패: " + e.getMessage());
        }
    }

    // [용도] NULL 값 개수 확인 / [호출] 관리자 모니터링
    @GetMapping("/journal-exchange/null-count")
    public ResponseEntity<Long> countNullExchanges() {
        long count = journalExchangeUpdater.countNullExchanges();
        return ResponseEntity.ok(count);
    }

    // [용도] NULL 값인 일기 목록 확인 / [호출] 관리자 모니터링
    @GetMapping("/journal-exchange/null-list")
    public ResponseEntity<?> getNullExchanges() {
        try {
            var nullJournals = journalExchangeUpdater.findNullExchanges();
            return ResponseEntity.ok(nullJournals);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("조회 실패: " + e.getMessage());
        }
    }
}
