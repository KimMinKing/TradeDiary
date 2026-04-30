// [파일 용도] 거래소 보유 자산 조회 REST API 엔드포인트

package com.tradediary.exchange;

import com.tradediary.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

// [클래스] 거래소별 현재 보유 자산 조회 API
@Slf4j
@RestController
@RequestMapping("/api/balances")
@RequiredArgsConstructor
public class BalanceController {

    private final BalanceService balanceService;
    private final UserService userService;

    // [용도] 등록된 모든 거래소의 보유 자산 조회 / [호출] GET /api/balances
    @GetMapping
    public ResponseEntity<List<BalanceService.ExchangeBalance>> getBalances(
            @AuthenticationPrincipal Long userId) {
        List<BalanceService.ExchangeBalance> result = balanceService.getAllBalances(userId);
        result.forEach(ex -> {
            log.info("[Balance] 거래소={}, assets={}, error={}", ex.exchange(), ex.assets(), ex.error());
            ex.assets().forEach(a ->
                log.info("  └ currency={}, balance={}, available={}, avgBuyPrice={}, unitCurrency={}",
                    a.currency(), a.balance(), a.available(), a.avgBuyPrice(), a.unitCurrency()));
        });

        // 총 자산 스냅샷 저장
        try {
            BigDecimal totalAssets = balanceService.calculateTotalAssetsValue(result);
            userService.updateTotalAssets(userId, totalAssets);
        } catch (Exception e) {
            log.warn("[Balance] 총 자산 스냅샷 저장 실패: {}", e.getMessage());
        }

        return ResponseEntity.ok(result);
    }
}
