// [파일 용도] 거래소 API Key 등록/조회/삭제 API 엔드포인트

package com.tradediary.exchange;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// [클래스] 거래소 API Key 관리 REST API 컨트롤러
@RestController
@RequestMapping("/api/exchange-keys")
@RequiredArgsConstructor
public class ExchangeKeyController {

    private final ExchangeKeyService exchangeKeyService;

    // [용도] API Key 등록 / [호출] POST /api/exchange-keys
    @PostMapping
    public ResponseEntity<Void> saveKey(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody SaveKeyRequest request) {
        exchangeKeyService.saveKey(userId, request.exchange(), request.apiKey(), request.secretKey());
        return ResponseEntity.ok().build();
    }

    // [용도] 등록된 거래소 목록 조회 / [호출] GET /api/exchange-keys
    @GetMapping
    public ResponseEntity<List<String>> getMyKeys(@AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(exchangeKeyService.getMyKeys(userId));
    }

    // [용도] API Key 삭제 / [호출] DELETE /api/exchange-keys/{exchange}
    @DeleteMapping("/{exchange}")
    public ResponseEntity<Void> deleteKey(
            @AuthenticationPrincipal Long userId,
            @PathVariable String exchange) {
        exchangeKeyService.deleteKey(userId, exchange);
        return ResponseEntity.ok().build();
    }

    public record SaveKeyRequest(
            @NotBlank String exchange,
            @JsonProperty("api_key") @NotBlank String apiKey,
            @JsonProperty("secret_key") @NotBlank String secretKey
    ) {}
}
