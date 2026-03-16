// [파일 용도] 거래 원본 데이터 JPA 엔티티

package com.tradediary.trade;

import com.tradediary.exchange.ExchangeKey;
import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// [클래스] trades 테이블 매핑 엔티티 (거래소에서 가져온 원본 데이터)
@Entity
@Table(name = "trades")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Trade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ExchangeKey.Exchange exchange;

    @Column(nullable = false, length = 100)
    private String exchangeTradeId;   // 거래소 고유 ID

    @Column(nullable = false, length = 30)
    private String symbol;            // 예: KRW-BTC

    @Column(nullable = false, length = 5)
    @Enumerated(EnumType.STRING)
    private TradeSide side;           // BUY, SELL

    @Column(nullable = false, precision = 30, scale = 10)
    private BigDecimal qty;           // 체결 수량

    @Column(nullable = false, precision = 30, scale = 10)
    private BigDecimal price;         // 체결 가격

    @Column(nullable = false, precision = 30, scale = 10)
    private BigDecimal fee;           // 수수료

    @Column(nullable = false)
    private LocalDateTime tradedAt;   // 체결 시각

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Trade(User user, ExchangeKey.Exchange exchange, String exchangeTradeId,
                 String symbol, TradeSide side, BigDecimal qty,
                 BigDecimal price, BigDecimal fee, LocalDateTime tradedAt) {
        this.user = user;
        this.exchange = exchange;
        this.exchangeTradeId = exchangeTradeId;
        this.symbol = symbol;
        this.side = side;
        this.qty = qty;
        this.price = price;
        this.fee = fee;
        this.tradedAt = tradedAt;
        this.createdAt = LocalDateTime.now();
    }
}
