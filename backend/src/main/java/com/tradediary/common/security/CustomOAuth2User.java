// [파일 용도] Google OAuth2 로그인 후 userId를 함께 담는 OAuth2User 구현체

package com.tradediary.common.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.Map;

// [클래스] OAuth2User를 감싸고 내부 userId를 추가로 보유 / [호출] OAuth2SuccessHandler
public class CustomOAuth2User implements OAuth2User {

    private final OAuth2User delegate;
    private final Long userId;

    public CustomOAuth2User(OAuth2User delegate, Long userId) {
        this.delegate = delegate;
        this.userId = userId;
    }

    // [용도] 내부 사용자 ID 반환 / [호출] OAuth2SuccessHandler.onAuthenticationSuccess()
    public Long getUserId() {
        return userId;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return delegate.getAttributes();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return delegate.getAuthorities();
    }

    @Override
    public String getName() {
        return delegate.getName();
    }
}
