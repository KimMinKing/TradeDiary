// [파일 용도] 매매 계획 메모 REST API 엔드포인트

package com.tradediary.plan;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// [클래스] 매매 계획 메모 CRUD API / [엔드포인트] /api/trade-plans
@RestController
@RequestMapping("/api/trade-plans")
@RequiredArgsConstructor
public class TradePlanController {

    private final TradePlanService planService;

    // [용도] 계획 목록 조회 / [호출] GET /api/trade-plans
    @GetMapping
    public ResponseEntity<List<TradePlanService.PlanDto>> getPlans(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(planService.getPlans(userId));
    }

    // [용도] 계획 생성 / [호출] POST /api/trade-plans
    @PostMapping
    public ResponseEntity<TradePlanService.PlanDto> create(
            @AuthenticationPrincipal Long userId,
            @RequestBody TradePlanService.PlanRequest req) {
        return ResponseEntity.ok(planService.create(userId, req));
    }

    // [용도] 계획 수정 / [호출] PUT /api/trade-plans/{id}
    @PutMapping("/{id}")
    public ResponseEntity<TradePlanService.PlanDto> update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @RequestBody TradePlanService.PlanRequest req) {
        return ResponseEntity.ok(planService.update(userId, id, req));
    }

    // [용도] 완료 토글 / [호출] PATCH /api/trade-plans/{id}/done
    @PatchMapping("/{id}/done")
    public ResponseEntity<TradePlanService.PlanDto> toggleDone(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        return ResponseEntity.ok(planService.toggleDone(userId, id));
    }

    // [용도] 계획 삭제 / [호출] DELETE /api/trade-plans/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        planService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
