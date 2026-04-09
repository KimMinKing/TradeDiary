// [파일 용도] 비밀번호 재설정 토큰 JPA 엔티티

package com.tradediary.user;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

// [클래스] password_reset_tokens 테이블 매핑 (UUID 토큰, 30분 유효, 1회용)
@Entity
@Table(name = "password_reset_tokens")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean used;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public PasswordResetToken(User user, String token, LocalDateTime expiresAt) {
        this.user      = user;
        this.token     = token;
        this.expiresAt = expiresAt;
        this.used      = false;
        this.createdAt = LocalDateTime.now();
    }

    // [용도] 토큰 사용 처리 / [호출] UserService.resetPassword()
    public void markUsed() {
        this.used = true;
    }
}
