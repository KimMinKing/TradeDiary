// [파일 용도] 비밀번호 재설정 토큰 저장 및 조회 Repository

package com.tradediary.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;

// [클래스] password_reset_tokens 테이블 JPA Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    // [용도] 토큰 문자열로 조회 / [호출] UserService.resetPassword()
    Optional<PasswordResetToken> findByToken(String token);

    // [용도] 사용자의 기존 미사용 토큰 전체 삭제 (중복 요청 방지) / [호출] UserService.requestPasswordReset()
    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.user.id = :userId AND t.used = false")
    void deleteUnusedByUserId(Long userId);

    // [용도] 만료된 토큰 일괄 삭제 (정기 정리용) / [호출] 스케줄러 (향후)
    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :now")
    void deleteExpiredTokens(LocalDateTime now);
}
