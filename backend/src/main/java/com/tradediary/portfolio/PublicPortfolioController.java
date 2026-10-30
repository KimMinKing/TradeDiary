package com.tradediary.portfolio;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user/public")
@RequiredArgsConstructor
public class PublicPortfolioController {
    private final PublicPortfolioService publicPortfolioService;
    private final PublicPortfolioRateLimiter rateLimiter;

    @GetMapping("/{userId}/portfolio")
    public ResponseEntity<PublicPortfolioService.PortfolioResponse> getPortfolio(
            @PathVariable Long userId,
            @AuthenticationPrincipal Long viewerId,
            @RequestParam(defaultValue = "all") String period) {
        rateLimiter.check(viewerId);
        return ResponseEntity.ok(publicPortfolioService.get(userId, period));
    }
}
