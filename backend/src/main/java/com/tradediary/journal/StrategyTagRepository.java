// [파일 용도] 전략 태그 저장 및 조회 Repository

package com.tradediary.journal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// [클래스] strategy_tags 테이블 JPA Repository
public interface StrategyTagRepository extends JpaRepository<StrategyTag, Long> {

    // [용도] 기본 제공 태그 + 특정 유저의 커스텀 태그 조회 / [호출] StrategyTagService.getTags()
    @Query("SELECT s FROM StrategyTag s WHERE s.user IS NULL OR s.user.id = :userId ORDER BY s.id ASC")
    List<StrategyTag> findAllByUserIdOrDefault(@Param("userId") Long userId);

    // [용도] 특정 유저의 커스텀 태그만 조회 / [호출] StrategyTagService.deleteTag()
    boolean existsByIdAndUserId(Long id, Long userId);
}
