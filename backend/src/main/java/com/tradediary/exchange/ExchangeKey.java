// [파일 용도] 거래소 API Key JPA 엔티티

package com.tradediary.exchange;

import com.tradediary.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// [클래스] exchange_keys 테이블 매핑 엔티티 (API Key는 암호화된 값으로 저장)
@Entity
@Table(name = "exchange_keys")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExchangeKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Exchange exchange;

    @Column(nullable = false, length = 512)
    private String apiKey;      // AES-256 암호화된 값

    @Column(nullable = false, length = 512)
    private String secretKey;   // AES-256 암호화된 값

    @Column(length = 512)
    private String passphrase;  // Bitget 전용 AES-256 암호화된 값 (nullable)

    @Column(nullable = false)
    private boolean isActive;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public ExchangeKey(User user, Exchange exchange, String apiKey, String secretKey, String passphrase) {
        this.user = user;
        this.exchange = exchange;
        this.apiKey = apiKey;
        this.secretKey = secretKey;
        this.passphrase = passphrase;
        this.isActive = true;
        this.createdAt = LocalDateTime.now();
    }

    public enum Exchange {
        UPBIT, BYBIT, BITGET
    }
}
