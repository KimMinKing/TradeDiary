// [파일 용도] Google OAuth2 로그인 시 사용자 조회 또는 자동 가입 처리

package com.tradediary.common.security;

import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// [클래스] Google 프로필로 기존 사용자 찾거나 신규 사용자 생성 / [호출] SecurityConfig oauth2Login
@Service
@RequiredArgsConstructor
public class GoogleOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    // [용도] Google 로그인 성공 시 사용자 조회/생성 후 CustomOAuth2User 반환 / [호출] Spring Security OAuth2 필터
    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String googleId = oAuth2User.getAttribute("sub");
        String email    = oAuth2User.getAttribute("email");
        String name     = oAuth2User.getAttribute("name");

        // Google ID로 기존 사용자 조회, 없으면 이메일로 재조회 (일반 가입 계정과 연동)
        User user = userRepository.findByGoogleId(googleId)
                .orElseGet(() -> userRepository.findByEmail(email)
                        .map(existing -> {
                            // 기존 이메일 계정에 googleId 연동
                            existing.linkGoogleId(googleId);
                            return existing;
                        })
                        .orElseGet(() -> userRepository.save(
                                User.builder()
                                        .email(email)
                                        .nickname(name != null ? name : email.split("@")[0])
                                        .googleId(googleId)
                                        .build()
                        ))
                );

        return new CustomOAuth2User(oAuth2User, user.getId());
    }
}
