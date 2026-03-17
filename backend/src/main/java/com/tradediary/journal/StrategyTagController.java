// [파일 용도] 전략 태그 CRUD API 엔드포인트

package com.tradediary.journal;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// [클래스] 전략 태그 REST API 컨트롤러
@RestController
@RequestMapping("/api/strategy-tags")
@RequiredArgsConstructor
public class StrategyTagController {

    private final StrategyTagService strategyTagService;

    // [용도] 기본 + 커스텀 태그 목록 조회 / [호출] GET /api/strategy-tags
    @GetMapping
    public ResponseEntity<List<StrategyTagService.TagResponse>> getTags(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(strategyTagService.getTags(userId));
    }

    // [용도] 커스텀 태그 생성 / [호출] POST /api/strategy-tags
    @PostMapping
    public ResponseEntity<StrategyTagService.TagResponse> createTag(
            @AuthenticationPrincipal Long userId,
            @RequestBody StrategyTagService.TagCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(strategyTagService.createTag(userId, request));
    }

    // [용도] 커스텀 태그 삭제 / [호출] DELETE /api/strategy-tags/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTag(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        strategyTagService.deleteTag(userId, id);
        return ResponseEntity.noContent().build();
    }
}
