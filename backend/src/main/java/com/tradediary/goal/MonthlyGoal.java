// [파일 용도] 월별 거래 목표 JPA 엔티티

package com.tradediary.goal;

import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// [클래스] monthly_goals 테이블 매핑 엔티티 (월별 승률/수익/거래횟수 목표)
@Entity
@Table(name = "monthly_goals",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "year_month"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MonthlyGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 7)
    private String yearMonth;  // 예: "2024-01"

    @Column(precision = 5, scale = 2)
    private BigDecimal targetWinRate;  // 목표 승률 (%)

    @Column(precision = 20, scale = 2)
    private BigDecimal targetPnl;  // 목표 수익 금액

    @Column
    private Integer targetTradeCount;  // 목표 거래 횟수

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public MonthlyGoal(User user, String yearMonth,
                        BigDecimal targetWinRate, BigDecimal targetPnl, Integer targetTradeCount) {
        this.user              = user;
        this.yearMonth         = yearMonth;
        this.targetWinRate     = targetWinRate;
        this.targetPnl         = targetPnl;
        this.targetTradeCount  = targetTradeCount;
        this.createdAt         = LocalDateTime.now();
        this.updatedAt         = LocalDateTime.now();
    }

    // [용도] 목표값 수정 / [호출] MonthlyGoalService.saveGoal()
    public void update(BigDecimal targetWinRate, BigDecimal targetPnl, Integer targetTradeCount) {
        this.targetWinRate    = targetWinRate;
        this.targetPnl        = targetPnl;
        this.targetTradeCount = targetTradeCount;
        this.updatedAt        = LocalDateTime.now();
    }
}
