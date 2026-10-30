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
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/balances")
@RequiredArgsConstructor
public class BalanceController {

    private final BalanceService balanceService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<BalanceService.ExchangeBalance>> getBalances(
            @AuthenticationPrincipal Long userId) {
        List<BalanceService.ExchangeBalance> result = balanceService.getAllBalances(userId);
        result.forEach(ex -> log.info("[Balance] exchange={}, assetCount={}, positionCount={}, error={}",
                ex.exchange(),
                ex.assets() != null ? ex.assets().size() : 0,
                ex.positions() != null ? ex.positions().size() : 0,
                ex.error()));

        try {
            BigDecimal totalAssets = balanceService.calculateTotalAssetsValue(result);
            userService.updateTotalAssets(userId, totalAssets);
        } catch (Exception e) {
            log.warn("[Balance] total asset update failed: {}", e.getMessage());
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/portfolio")
    public ResponseEntity<Map<String, Object>> getPortfolio(
            @AuthenticationPrincipal Long userId) {
        Map<String, Object> portfolio = balanceService.getPortfolio(userId);
        return ResponseEntity.ok(portfolio);
    }
}
