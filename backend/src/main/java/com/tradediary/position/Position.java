// [파일 용도] 포지션(묶인 거래 단위) JPA 엔티티

package com.tradediary.position;

import com.tradediary.exchange.ExchangeKey;
import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// [클래스] positions 테이블 매핑 엔티티 (trades를 묶은 완결된 포지션)
@Entity
@Table(name = "positions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Position {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ExchangeKey.Exchange exchange;

    @Column(nullable = false, length = 30)
    private String symbol;

    @Column(nullable = false, length = 5)
    @Enumerated(EnumType.STRING)
    private PositionSide side;            // LONG or SHORT

    @Column(nullable = false, precision = 30, scale = 10)
    private BigDecimal entryPrice;        // 평균 진입가

    @Column(nullable = false, precision = 30, scale = 10)
    private BigDecimal exitPrice;         // 평균 청산가

    @Column(nullable = false, precision = 30, scale = 10)
    private BigDecimal qty;               // 총 거래 수량

    @Column(nullable = false, precision = 30, scale = 10)
    private BigDecimal pnl;              // 손익 금액 (수수료 차감)

    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal pnlRate;          // 손익률 (%)

    @Column(nullable = false)
    private LocalDateTime openedAt;      // 첫 거래 시각

    @Column(nullable = false)
    private LocalDateTime closedAt;      // 마지막 거래 시각

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Position(User user, ExchangeKey.Exchange exchange, String symbol, PositionSide side,
                    BigDecimal entryPrice, BigDecimal exitPrice, BigDecimal qty,
                    BigDecimal pnl, BigDecimal pnlRate,
                    LocalDateTime openedAt, LocalDateTime closedAt) {
        this.user = user;
        this.exchange = exchange;
        this.symbol = symbol;
        this.side = side;
        this.entryPrice = entryPrice;
        this.exitPrice = exitPrice;
        this.qty = qty;
        this.pnl = pnl;
        this.pnlRate = pnlRate;
        this.openedAt = openedAt;
        this.closedAt = closedAt;
        this.createdAt = LocalDateTime.now();
    }
}
