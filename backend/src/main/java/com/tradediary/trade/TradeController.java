// [파일 용도] 거래 내역 동기화 및 조회 API 엔드포인트

package com.tradediary.trade;

import com.tradediary.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// [클래스] 거래 내역 REST API 컨트롤러
@Slf4j
@RestController
@RequestMapping("/api/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;
    private final UserService userService;

    // [용도] Upbit 거래 내역 동기화 / [호출] POST /api/trades/sync/upbit
    // API 오류(IP 차단 등) 발생 시 400 + 에러 메시지 반환
    @PostMapping("/sync/upbit")
    public ResponseEntity<Map<String, Object>> syncUpbitTrades(
            @AuthenticationPrincipal Long userId) {
        try {
            int count = tradeService.syncUpbitTrades(userId);
            return ResponseEntity.ok(Map.of("savedCount", count));
        } catch (RuntimeException e) {
            String message = resolveErrorMessage(e.getMessage());
            log.warn("[TradeSync] Upbit 동기화 실패 - userId={}, message={}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", message));
        }
    }

    // [용도] Bybit 거래 내역 동기화 / [호출] POST /api/trades/sync/bybit
    // API 오류(IP 차단 등) 발생 시 400 + 에러 메시지 반환
    @PostMapping("/sync/bybit")
    public ResponseEntity<Map<String, Object>> syncBybitTrades(
            @AuthenticationPrincipal Long userId) {
        try {
            int count = tradeService.syncBybitTrades(userId);
            return ResponseEntity.ok(Map.of("savedCount", count));
        } catch (RuntimeException e) {
            String message = resolveErrorMessage(e.getMessage());
            log.warn("[TradeSync] Bybit 동기화 실패 - userId={}, message={}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", message));
        }
    }

    // [용도] Bitget 거래 내역 동기화 / [호출] POST /api/trades/sync/bitget
    @PostMapping("/sync/bitget")
    public ResponseEntity<Map<String, Object>> syncBitgetTrades(
            @AuthenticationPrincipal Long userId) {
        try {
            int count = tradeService.syncBitgetTrades(userId);
            return ResponseEntity.ok(Map.of("savedCount", count));
        } catch (RuntimeException e) {
            String message = resolveErrorMessage(e.getMessage());
            log.warn("[TradeSync] Bitget 동기화 실패 - userId={}, message={}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", message));
        }
    }

    // [용도] OKX 거래 내역 동기화 / [호출] POST /api/trades/sync/okx
    @PostMapping("/sync/okx")
    public ResponseEntity<Map<String, Object>> syncOkxTrades(
            @AuthenticationPrincipal Long userId) {
        try {
            int count = tradeService.syncOkxTrades(userId);
            return ResponseEntity.ok(Map.of("savedCount", count));
        } catch (RuntimeException e) {
            String message = resolveErrorMessage(e.getMessage());
            log.warn("[TradeSync] OKX 동기화 실패 - userId={}, message={}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", message));
        }
    }

    // [용도] Binance 거래 내역 동기화 / [호출] POST /api/trades/sync/binance
    @PostMapping("/sync/binance")
    public ResponseEntity<Map<String, Object>> syncBinanceTrades(
            @AuthenticationPrincipal Long userId) {
        try {
            int count = tradeService.syncBinanceTrades(userId);
            return ResponseEntity.ok(Map.of("savedCount", count));
        } catch (RuntimeException e) {
            String message = resolveErrorMessage(e.getMessage());
            log.warn("[TradeSync] Binance 동기화 실패 - userId={}, message={}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", message));
        }
    }

    // [용도] BingX 거래 내역 동기화 / [호출] POST /api/trades/sync/bingx
    @PostMapping("/sync/bingx")
    public ResponseEntity<Map<String, Object>> syncBingxTrades(
            @AuthenticationPrincipal Long userId) {
        try {
            int count = tradeService.syncBingxTrades(userId);
            return ResponseEntity.ok(Map.of("savedCount", count));
        } catch (RuntimeException e) {
            String message = resolveErrorMessage(e.getMessage());
            log.warn("[TradeSync] BingX 동기화 실패 - userId={}, message={}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", message));
        }
    }

    @PostMapping("/sync/kraken")
    public ResponseEntity<Map<String, Object>> syncKrakenTrades(
            @AuthenticationPrincipal Long userId) {
        try {
            int count = tradeService.syncTrades(userId, com.tradediary.exchange.ExchangeKey.Exchange.KRAKEN);
            return ResponseEntity.ok(Map.of("savedCount", count));
        } catch (RuntimeException e) {
            log.warn("[TradeSync] Kraken sync failed - userId={}, message={}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", resolveErrorMessage(e.getMessage())));
        }
    }

    // [용도] 에러 메시지에서 사용자 친화적 메시지 추출 / [호출] 거래소 동기화 엔드포인트
    private String resolveErrorMessage(String rawMessage) {
        if (rawMessage == null) return "거래소 API 호출 실패";
        String lower = rawMessage.toLowerCase();
        if (lower.contains("ip") || lower.contains("not_allowed") || lower.contains("ip_address")) {
            return "IP 주소가 연결되어 있지 않습니다. 거래소 API 설정에서 허용 IP를 확인해주세요.";
        }
        if (lower.contains("out_of_scope") || lower.contains("no_authorization") ||
                lower.contains("permission") || lower.contains("scope")) {
            return "API Key 권한이 부족합니다. Upbit API Key에 주문 조회 권한이 있는지 확인해주세요.";
        }
        if (lower.contains("401") || lower.contains("auth") || lower.contains("invalid_key")) {
            return "API Key 인증에 실패했습니다. API Key를 다시 확인해주세요.";
        }
        return "거래소 API 오류가 발생했습니다. API Key와 허용 IP를 확인해주세요.";
    }

    // [용도] 거래 목록 조회 (exchange 필터 선택) / [호출] GET /api/trades?exchange=UPBIT|BYBIT
    @GetMapping
    public ResponseEntity<List<TradeService.TradeResponse>> getTrades(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) String exchange) {
        return ResponseEntity.ok(tradeService.getTrades(userId, exchange));
    }

    // [용도] 특정 사용자의 공개 거래 내역 조회 / [호출] GET /api/trades/public/{userId}
    @GetMapping("/public/{userId}")
    public ResponseEntity<List<TradeService.TradeResponse>> getPublicTrades(
            @PathVariable Long userId) {
        // diaryPublic 검증
        userService.validatePublicSection(userId, UserService.PublicSection.TRADES);
        return ResponseEntity.ok(tradeService.getTrades(userId, null));
    }
}
