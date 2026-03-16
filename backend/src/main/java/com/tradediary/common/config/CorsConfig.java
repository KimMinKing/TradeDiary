// [파일 용도] CORS 설정 (React 개발 서버 → Spring Boot 요청 허용)

package com.tradediary.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

// [클래스] 프론트엔드 개발 서버에서 오는 요청 CORS 허용
@Configuration
public class CorsConfig {

    // [용도] CORS 필터 등록 / [호출] Spring Security 필터 체인 자동 적용
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedOriginPattern("http://localhost:*");
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);

        return new CorsFilter(source);
    }
}
