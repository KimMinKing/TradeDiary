// [파일 용도] RefreshToken 저장 및 조회 Repository

package com.tradediary.common.security;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// [클래스] refresh_tokens 테이블 JPA Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    // [용도] 토큰 값으로 RefreshToken 조회 / [호출] UserService.refresh()
    Optional<RefreshToken> findByToken(String token);

    // [용도] 사용자의 RefreshToken 전체 삭제 / [호출] UserService.logout()
    void deleteByUserId(Long userId);
}
