// [파일 용도] WebSocket 설정 클래스

package com.tradediary.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

// [클래스] WebSocket 메시지 브로커 설정
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtHandshakeInterceptor handshakeInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // 클라이언트에서 발행하는 메시지를 받을 엔드포인트 설정
        config.setApplicationDestinationPrefixes("/app");

        // 메시지 브로커로 가는 경로 설정 (메모리 기브엔드 사용)
        config.enableSimpleBroker("/queue", "/topic");

        // 메시지 브로커 프리픽스 설정
        config.setUserDestinationPrefix("/user/");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket 연결을 위한 엔드포인트 설정
        registry.addEndpoint("/ws")
                .addInterceptors(handshakeInterceptor) // 핸드셰이크 단계 JWT 검증 → Principal 주입
                .setAllowedOriginPatterns("*") // 개발 환경용, 프로덕션에서는 구체적 도메인 지정
                .withSockJS(); // SockJS 연결 허용
    }
}
