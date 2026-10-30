// [파일 용도] 체크리스트 REST API 컨트롤러

package com.tradediary.journal;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// [클래스] 체크리스트 REST API / [호출] frontend
@RestController
@RequestMapping("/api/checklist")
@RequiredArgsConstructor
public class ChecklistController {

    private final ChecklistService checklistService;

    // [용도] 사용자의 체크리스트 항목 조회 / [호출] JournalPage.jsx
    @GetMapping
    public ResponseEntity<List<ChecklistService.ChecklistItemResponse>> getChecklist(
            @AuthenticationPrincipal Long userId) {
        List<ChecklistService.ChecklistItemResponse> items = checklistService.getUserChecklist(userId)
                .stream()
                .map(item -> ChecklistService.ChecklistItemResponse.from(
                        item,
                        item.getUser() == null // user가 null이면 시스템 기본 항목
                ))
                .toList();
        return ResponseEntity.ok(items);
    }

    // [용도] 체크리스트 항목 카테고리별 조회 / [호출] JournalPage.jsx
    @GetMapping("/categories")
    public ResponseEntity<Map<String, List<ChecklistService.ChecklistItemResponse>>> getChecklistByCategory(
            @AuthenticationPrincipal Long userId) {
        Map<String, List<ChecklistItem>> itemsByCategory = checklistService.getChecklistByCategory(userId);

        Map<String, List<ChecklistService.ChecklistItemResponse>> response = itemsByCategory.entrySet()
                .stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue().stream()
                                .map(item -> ChecklistService.ChecklistItemResponse.from(item, item.getUser() == null))
                                .toList()
                ));

        return ResponseEntity.ok(response);
    }

    // [용도] 커스텀 체크리스트 항목 생성 / [호출] JournalPage.jsx
    @PostMapping
    public ResponseEntity<ChecklistService.ChecklistItemResponse> createChecklistItem(
            @AuthenticationPrincipal Long userId,
            @RequestBody ChecklistCreateRequest request) {
        ChecklistItem item = checklistService.createCustomItem(userId, request.category, request.content);
        ChecklistService.ChecklistItemResponse response = ChecklistService.ChecklistItemResponse.from(
                item,
                false // 새로 생성한 항목은 항상 커스텀
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // [용도] 커스텀 체크리스트 항목 삭제 / [호출] JournalPage.jsx
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChecklistItem(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        checklistService.deleteCustomItem(userId, id);
        return ResponseEntity.noContent().build();
    }

    // 체크리스트 작성 요청 DTO
    public record ChecklistCreateRequest(
            String category,
            String content
    ) {}

    // 체크리스트 수정 요청 DTO (체크 상태)
    public record ChecklistUpdateRequest(
            Map<Long, Boolean> checklist
    ) {}
}