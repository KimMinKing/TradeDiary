// [파일 용도] 번역+요약된 뉴스 기사 DB 엔티티

package com.tradediary.news;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// [클래스] news_articles 테이블 JPA 엔티티
@Entity
@Table(name = "news_articles")
@Getter @Setter
@NoArgsConstructor
public class NewsArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // CryptoCompare 기사 고유 ID (중복 방지)
    @Column(name = "external_id", nullable = false, unique = true, length = 255)
    private String externalId;

    // Gemini 번역 제목
    @Column(name = "title_ko", nullable = false, columnDefinition = "TEXT")
    private String titleKo;

    // Gemini 번역+요약 본문
    @Column(name = "summary_ko", nullable = false, columnDefinition = "TEXT")
    private String summaryKo;

    @Column(name = "source", length = 255)
    private String source;

    @Column(name = "original_url", nullable = false, columnDefinition = "TEXT")
    private String originalUrl;

    @Column(name = "categories", length = 255)
    private String categories;

    @Column(name = "published_at", nullable = false)
    private LocalDateTime publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
