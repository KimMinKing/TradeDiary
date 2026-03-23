// [파일 용도] Google/Kakao OAuth2 로그인 시 사용자 조회 또는 자동 가입 처리

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

import java.util.Map;

// [클래스] Google/Kakao 프로필로 기존 사용자 찾거나 신규 사용자 생성 / [호출] SecurityConfig oauth2Login
@Service
@RequiredArgsConstructor
public class GoogleOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    // [용도] OAuth2 로그인 성공 시 provider 구분 후 사용자 조회/생성 / [호출] Spring Security OAuth2 필터
    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String provider = userRequest.getClientRegistration().getRegistrationId();

        User user = switch (provider) {
            case "google" -> handleGoogle(oAuth2User);
            case "kakao"  -> handleKakao(oAuth2User);
            default -> throw new OAuth2AuthenticationException("지원하지 않는 OAuth2 provider: " + provider);
        };

        return new CustomOAuth2User(oAuth2User, user.getId());
    }

    // [용도] Google 사용자 조회/생성 / [호출] loadUser()
    private User handleGoogle(OAuth2User oAuth2User) {
        String googleId = oAuth2User.getAttribute("sub");
        String email    = oAuth2User.getAttribute("email");
        String name     = oAuth2User.getAttribute("name");

        return userRepository.findByGoogleId(googleId)
                .orElseGet(() -> userRepository.findByEmail(email)
                        .map(existing -> {
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
    }

    // [용도] Kakao 사용자 조회/생성 (이메일 없이 kakaoId 기반) / [호출] loadUser()
    private User handleKakao(OAuth2User oAuth2User) {
        Object idAttr = oAuth2User.getAttributes().get("id");
        String kakaoId = idAttr != null ? idAttr.toString() : null;

        // 닉네임: properties.nickname 또는 kakao_account.profile.nickname
        String nickname = null;
        Map<String, Object> properties = oAuth2User.getAttribute("properties");
        if (properties != null) {
            nickname = (String) properties.get("nickname");
        }
        if (nickname == null) {
            nickname = "카카오유저";
        }

        // 가상 이메일 생성 (kakaoId 기반)
        String virtualEmail = "kakao_" + kakaoId + "@tradediary.local";
        String finalNickname = nickname;

        return userRepository.findByKakaoId(kakaoId)
                .orElseGet(() -> userRepository.save(
                        User.builder()
                                .email(virtualEmail)
                                .nickname(finalNickname)
                                .kakaoId(kakaoId)
                                .build()
                ));
    }
}
