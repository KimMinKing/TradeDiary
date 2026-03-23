// [파일 용도] OAuth2 로그인 성공 시 JWT 발급 후 프론트엔드로 리다이렉트

package com.tradediary.common.security;

import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;

// [클래스] OAuth2 인증 성공 후 JWT 생성 및 프론트로 리다이렉트 / [호출] SecurityConfig oauth2Login
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Value("${frontend.url}")
    private String frontendUrl;

    // [용도] 인증 성공 시 JWT 발급 후 /oauth/callback 으로 리다이렉트 / [호출] Spring Security OAuth2 필터
    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        CustomOAuth2User oAuth2User = (CustomOAuth2User) authentication.getPrincipal();
        Long userId = oAuth2User.getUserId();

        String accessToken  = jwtUtil.generateAccessToken(userId);
        String refreshToken = jwtUtil.generateRefreshToken(userId);

        // 기존 RefreshToken 삭제 후 새로 저장
        refreshTokenRepository.deleteByUserId(userId);
        User user = userRepository.getReferenceById(userId);
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .token(refreshToken)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
                .build());

        String redirectUrl = frontendUrl + "/oauth/callback"
                + "?access_token=" + accessToken
                + "&refresh_token=" + refreshToken;

        response.sendRedirect(redirectUrl);
    }
}
