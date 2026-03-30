// [파일 용도] 코인 뉴스 일별 AI 시장 요약 DB 엔티티

package com.tradediary.news;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

// [클래스] news_daily_summary 테이블 JPA 엔티티
@Entity
@Table(name = "news_daily_summary")
@Getter @Setter
@NoArgsConstructor
public class NewsDailySummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "summary_date", nullable = false, unique = true)
    private LocalDate summaryDate;

    // Gemini 한국어 시장 요약 (3~4문장)
    @Column(name = "summary_ko", nullable = false, columnDefinition = "TEXT")
    private String summaryKo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
