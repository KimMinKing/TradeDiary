// [파일 용도] 체크리스트 CRUD 비즈니스 로직

package com.tradediary.journal;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// [클래스] 체크리스트 항목 관리 및 조회 / [호출] ChecklistController, TradeJournalService
@Service
@RequiredArgsConstructor
public class ChecklistService {

    private final ChecklistItemRepository checklistItemRepository;
    private final JournalChecklistRepository journalChecklistRepository;
    private final UserRepository userRepository;

    // [용도] 시스템 기본 체크리스트 항목 조회 / [호출] TradeJournalService
    @Transactional(readOnly = true)
    public List<ChecklistItem> getDefaultChecklist() {
        return checklistItemRepository.findByUserIsNullAndIsActiveTrueOrderByCategorySortOrderAsc();
    }

    // [용도] 사용자의 체크리스트 항목 조회 (기본 + 커스텀) / [호출] TradeJournalService
    @Transactional(readOnly = true)
    public List<ChecklistItem> getUserChecklist(Long userId) {
        return checklistItemRepository.findByUserIdOrUserIsNullAndIsActiveTrueOrderByCategorySortOrderAsc(userId);
    }

    // [용도] 카테고리별 체크리스트 항목 조회 / [호출] UI에서 폼 표시
    @Transactional(readOnly = true)
    public Map<String, List<ChecklistItem>> getChecklistByCategory(Long userId) {
        List<ChecklistItem> items = getUserChecklist(userId);
        return items.stream()
                .collect(Collectors.groupingBy(ChecklistItem::getCategory));
    }

    // [용도] 커스텀 체크리스트 항목 생성 / [호출] ChecklistController
    @Transactional
    public ChecklistItem createCustomItem(Long userId, String category, String content) {
        // 사용자가 NULL이 아닌 경우에만 커스텀 항목 생성 가능
        if (userId == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "사용자 체크리스트만 생성할 수 있습니다");
        }

        // 카테고리 유효성 검사
        if (!List.of("ENTRY", "EXIT", "REVIEW").contains(category)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "유효하지 않은 카테고리입니다: " + category);
        }

        // 동일한 내용의 항목이 이미 있는지 확인
        boolean exists = checklistItemRepository
                .findByUserIdAndCategoryAndContent(userId, category, content)
                .stream()
                .anyMatch(item -> item.getContent().equals(content));

        if (exists) {
            throw new BusinessException(ErrorCode.DUPLICATE_CHECKLIST);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        ChecklistItem item = ChecklistItem.builder()
                .user(user)
                .category(category)
                .content(content)
                .sortOrder(getNextSortOrder(userId, category))
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build();

        return checklistItemRepository.save(item);
    }

    // [용도] 커스텀 체크리스트 항목 삭제 / [호출] ChecklistController
    @Transactional
    public void deleteCustomItem(Long userId, Long itemId) {
        ChecklistItem item = checklistItemRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHECKLIST_NOT_FOUND));

        // 해당 항목이 사용자 소유인지 확인
        if (item.getUser() == null || !userId.equals(item.getUser().getId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // 삭제 전 참조 확인
        List<JournalChecklist> references = journalChecklistRepository.findByChecklistId(itemId);
        if (!references.isEmpty()) {
            throw new BusinessException(ErrorCode.CHECKLIST_IN_USE);
        }

        checklistItemRepository.delete(item);
    }

    // [용도] 다음 정렬 순서 조회 / [호출] createCustomItem()
    private int getNextSortOrder(Long userId, String category) {
        List<ChecklistItem> items = checklistItemRepository.findByUserIdAndCategoryAndIsActiveTrueOrderBySortOrder(userId, category);
        return items.size();
    }

    // [용도] 체크리스트 응답 DTO
    public record ChecklistItemResponse(
            Long id,
            String category,
            String content,
            int sortOrder,
            boolean isDefault
    ) {
        public static ChecklistItemResponse from(ChecklistItem item, boolean isDefault) {
            return new ChecklistItemResponse(
                    item.getId(),
                    item.getCategory(),
                    item.getContent(),
                    item.getSortOrder(),
                    isDefault
            );
        }
    }
}