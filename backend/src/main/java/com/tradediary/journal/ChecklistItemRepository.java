// [파일 용도] 체크리스트 항목 JPA Repository

package com.tradediary.journal;

import com.tradediary.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

// [클래스] checklist_items 테이블 쿼리 / [호출] ChecklistService
@Repository
public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {

    // [용도] 특정 사용자의 활성화된 체크리스트 항목 조회 / [호출] ChecklistService.getUserChecklist()
    @Query("SELECT c FROM ChecklistItem c WHERE c.user.id = :userId AND c.isActive = true ORDER BY c.category, c.sortOrder ASC")
    List<ChecklistItem> findByUserIdAndIsActiveTrueOrderByCategorySortOrderAsc(@Param("userId") Long userId);

    // [용도] 시스템 기본 체크리스트 항목 조회 / [호출] ChecklistService.getDefaultChecklist()
    @Query("SELECT c FROM ChecklistItem c WHERE c.user IS NULL AND c.isActive = true ORDER BY c.category, c.sortOrder ASC")
    List<ChecklistItem> findByUserIsNullAndIsActiveTrueOrderByCategorySortOrderAsc();

    // [용도] 특정 사용자 또는 시스템의 체크리스트 항목 조회 / [호출] ChecklistService.getUserChecklist()
    @Query("SELECT c FROM ChecklistItem c WHERE (c.user.id = :userId OR c.user IS NULL) AND c.isActive = true ORDER BY c.category, c.sortOrder ASC")
    List<ChecklistItem> findByUserIdOrUserIsNullAndIsActiveTrueOrderByCategorySortOrderAsc(@Param("userId") Long userId);

    // [용도] 특정 카테고리의 체크리스트 항목 조회 / [호출] UI에서 카테고리별 항목 표시
    List<ChecklistItem> findByUserIdAndCategoryAndIsActiveTrueOrderBySortOrder(Long userId, String category);

    // [용도] 시스템 기본 카테고리 항목 조회 / [호출] UI에서 기본 항목 표시
    List<ChecklistItem> findByUserIsNullAndCategoryAndIsActiveTrueOrderBySortOrder(String category);

    // [용도] 특정 사용자의 카테고리별 내용으로 체크리스트 항목 조회 / [호출] ChecklistService.createCustomItem()
    List<ChecklistItem> findByUserIdAndCategoryAndContent(Long userId, String category, String content);
}