// [파일 용도] 매매 계획 메모 JPA Repository

package com.tradediary.plan;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

// [클래스] trade_plans 테이블 JPA Repository
public interface TradePlanRepository extends JpaRepository<TradePlan, Long> {

    // [용도] 사용자의 계획 목록 최신순 조회 / [호출] TradePlanService.getPlans()
    List<TradePlan> findAllByUserIdOrderByPlanDateDescCreatedAtDesc(Long userId);

    // [용도] 특정 계획 단건 조회 (소유 검증 포함) / [호출] TradePlanService
    Optional<TradePlan> findByIdAndUserId(Long id, Long userId);
}
