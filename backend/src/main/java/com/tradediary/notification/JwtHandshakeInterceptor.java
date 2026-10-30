// [파일 용도] WebSocket 핸드셰이크 시 JWT를 검증하여 userId를 세션 속성에 저장

package com.tradediary.notification;

import com.tradediary.common.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.List;
import java.util.Map;

// [클래스] STOMP 핸드셰이크 단계에서 JWT 검증 후 Principal(userId) 주입
// WebSocket은 Authorization 헤더를 직접 설정하기 어려워 쿼리 파라미터 ?token=<JWT> 로 전달받음
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtUtil jwtUtil;

    // [용도] 핸드셰이크 전 JWT 검증 → userId를 attributes와 Principal로 저장 / [호출] STOMP 핸드셰이크
    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        String token = extractToken(request.getURI());
        if (token != null && jwtUtil.validateToken(token)) {
            Long userId = jwtUtil.getUserId(token);
            // STOMP 세션 식별자로 userId를 문자열로 저장 (convertAndSendToUser 가 Principal.getName() 사용)
            attributes.put("userId", String.valueOf(userId));

            // Principal 주입: STOMP 메시지 브로커가 convertAndSendToUser 시 사용자 식별에 활용
            Principal principal = () -> String.valueOf(userId);
            attributes.put(Principal.class.getName(), principal);

            // SecurityContext에도 설정 (선택, 호환성)
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, null, List.of());
            SecurityContextHolder.getContext().setAuthentication(authentication);
            return true;
        }
        log.warn("WebSocket 핸드셰이크 JWT 검증 실패");
        return false;
    }

    // [용도] URI 쿼리스트링에서 token 파라미터 추출 / [호출] beforeHandshake()
    private String extractToken(URI uri) {
        String query = uri.getQuery();
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] pair = param.split("=", 2);
            if ("token".equals(pair[0]) && pair.length > 1) {
                return URLDecoder.decode(pair[1], StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    // [용도] 핸드셰이크 후 처리 (미사용)
    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
        // no-op
    }
}
