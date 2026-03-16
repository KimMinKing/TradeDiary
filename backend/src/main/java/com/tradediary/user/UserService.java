// [파일 용도] 회원가입, 로그인, 토큰 재발급, 로그아웃 비즈니스 로직

package com.tradediary.user;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.common.security.JwtUtil;
import com.tradediary.common.security.RefreshToken;
import com.tradediary.common.security.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

// [클래스] 인증 관련 핵심 비즈니스 로직 처리
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    // [용도] 회원가입 / [호출] AuthController.signup()
    @Transactional
    public void signup(String email, String password, String nickname) {
        if (userRepository.existsByEmail(email)) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .nickname(nickname)
                .build();

        userRepository.save(user);
    }

    // [용도] 로그인 → AccessToken + RefreshToken 반환 / [호출] AuthController.login()
    @Transactional
    public TokenResponse login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }

        String accessToken = jwtUtil.generateAccessToken(user.getId());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());

        // 기존 RefreshToken 삭제 후 새로 저장
        refreshTokenRepository.deleteByUserId(user.getId());
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(refreshToken)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
                .build());

        return new TokenResponse(accessToken, refreshToken);
    }

    // [용도] RefreshToken으로 AccessToken 재발급 / [호출] AuthController.refresh()
    @Transactional
    public TokenResponse refresh(String refreshToken) {
        RefreshToken stored = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new BusinessException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(stored);
            throw new BusinessException(ErrorCode.EXPIRED_TOKEN);
        }

        Long userId = stored.getUser().getId();
        String newAccessToken = jwtUtil.generateAccessToken(userId);
        String newRefreshToken = jwtUtil.generateRefreshToken(userId);

        // RefreshToken 교체
        refreshTokenRepository.delete(stored);
        refreshTokenRepository.save(RefreshToken.builder()
                .user(stored.getUser())
                .token(newRefreshToken)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
                .build());

        return new TokenResponse(newAccessToken, newRefreshToken);
    }

    // [용도] 로그아웃 (RefreshToken 삭제) / [호출] AuthController.logout()
    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository.deleteByUserId(userId);
    }

    // [용도] 토큰 응답 DTO (내부 클래스)
    public record TokenResponse(String accessToken, String refreshToken) {}
}
