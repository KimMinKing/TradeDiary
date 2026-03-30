// [파일 용도] 뉴스 일별 AI 요약 DB 저장 및 조회 Repository

package com.tradediary.news;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

// [클래스] news_daily_summary 테이블 JPA Repository
public interface NewsDailySummaryRepository extends JpaRepository<NewsDailySummary, Long> {

    // [용도] 특정 날짜의 요약 조회 / [호출] NewsService, NewsScheduler
    Optional<NewsDailySummary> findBySummaryDate(LocalDate date);
}
