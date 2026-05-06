// [파일 용도] 매매 계획 메모 JPA Repository

package com.tradediary.plan;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

// [클래스] trade_plans 테이블 JPA Repository
public interface TradePlanRepository extends JpaRepository<TradePlan, Long> {

    // [용도] 사용자의 계획 목록 최신순 조회 / [호출] TradePlanService.getPlans()
    List<TradePlan> findAllByUserIdOrderByPlanDateDescCreatedAtDesc(Long userId);

    // [용도] 특정 계획 단건 조회 (소유 검증 포함) / [호출] TradePlanService
    Optional<TradePlan> findByIdAndUserId(Long id, Long userId);

    // [용도] 오늘 이후 미완료 계획 조회 (다음 매매 할 일) / [호출] DashboardService
    List<TradePlan> findAllByUserIdAndPlanDateGreaterThanEqualAndDoneFalseOrderByPlanDateAscCreatedAtAsc(
            Long userId, LocalDate fromDate);

    // [용도] 과거 미완료 계획 조회 (계획 vs 실적 비교) / [호출] DashboardService
    List<TradePlan> findAllByUserIdAndPlanDateBeforeAndDoneFalseOrderByPlanDateDesc(
            Long userId, LocalDate beforeDate);

    // [용도] 과거 기간 계획 전체 조회 (비교용) / [호출] DashboardService
    List<TradePlan> findAllByUserIdAndPlanDateBetweenOrderByPlanDateDesc(
            Long userId, LocalDate from, LocalDate to);
}
