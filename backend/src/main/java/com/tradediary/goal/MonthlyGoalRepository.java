// [파일 용도] 월별 목표 저장 및 조회 Repository

package com.tradediary.goal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// [클래스] monthly_goals 테이블 JPA Repository
public interface MonthlyGoalRepository extends JpaRepository<MonthlyGoal, Long> {

    // [용도] 특정 사용자의 특정 월 목표 조회 / [호출] MonthlyGoalService.getGoal()
    Optional<MonthlyGoal> findByUserIdAndYearMonth(Long userId, String yearMonth);
}
