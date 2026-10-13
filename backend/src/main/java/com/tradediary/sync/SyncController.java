package com.tradediary.sync;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
public class SyncController {
    private final AdaptiveSyncCoordinator coordinator;

    @GetMapping("/status")
    public AdaptiveSyncCoordinator.SyncStatus status(@AuthenticationPrincipal Long userId) {
        return coordinator.status(userId);
    }

    @PostMapping("/activity") @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String,String> activity(@AuthenticationPrincipal Long userId) {
        coordinator.registerActivity(userId);
        return Map.of("status","QUEUED");
    }

    @PostMapping("/request") @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String,String> request(@AuthenticationPrincipal Long userId, @RequestParam(required=false) String exchange) {
        coordinator.request(userId, exchange);
        return Map.of("status","QUEUED");
    }
}
