// [파일 용도] 트레이더 유형 AI 코칭 결과 캐시 JPA 엔티티

package com.tradediary.trader;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// [클래스] trader_type_advice 테이블 매핑 (사용자별 AI 코칭 요약 1건 캐싱)
@Entity
@Table(name = "trader_type_advice",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TraderTypeAdvice {

    // [필드] PK
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // [필드] 사용자 ID (1:1)
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    // [필드] AI 코칭 요약 전문 (마크다운)
    @Column(name = "advice_text", nullable = false, columnDefinition = "TEXT")
    private String adviceText;

    @Column(nullable = false, length = 2)
    private String language;

    // [필드] 생성(갱신) 일시
    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    // [생성자] 신규 코칭 결과 저장 / [호출] TraderTypeService.generateAdvice()
    @Builder
    public TraderTypeAdvice(Long userId, String adviceText, String language) {
        this.userId      = userId;
        this.adviceText  = adviceText;
        this.language = language;
        this.generatedAt = LocalDateTime.now();
    }

    // [용도] 코칭 결과 갱신 (재생성 시) / [호출] TraderTypeService.refreshAdvice()
    public void update(String adviceText, String language) {
        this.adviceText  = adviceText;
        this.language = language;
        this.generatedAt = LocalDateTime.now();
    }
}
