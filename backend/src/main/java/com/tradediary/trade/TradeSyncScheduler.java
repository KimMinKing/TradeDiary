package com.tradediary.trade;

import com.tradediary.exchange.ExchangeKey;
import com.tradediary.exchange.ExchangeKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
// Replaced by AdaptiveSyncCoordinator. Kept temporarily for migration history only.
@RequiredArgsConstructor
public class TradeSyncScheduler {

    private final ExchangeKeyRepository exchangeKeyRepository;
    private final TradeService tradeService;
    private final AtomicBoolean running = new AtomicBoolean(false);

    @Scheduled(
            initialDelayString = "${trade-sync.scheduler.initial-delay-ms:30000}",
            fixedDelayString = "${trade-sync.scheduler.interval-ms:60000}"
    )
    public void syncAllActiveExchangeKeys() {
        if (!running.compareAndSet(false, true)) {
            log.info("[TradeSyncScheduler] previous run still active, skip");
            return;
        }

        try {
            List<ExchangeKey> activeKeys = exchangeKeyRepository.findAllByIsActiveTrue();
            if (activeKeys.isEmpty()) {
                return;
            }

            int successCount = 0;
            for (ExchangeKey key : activeKeys) {
                Long userId = key.getUser().getId();
                ExchangeKey.Exchange exchange = key.getExchange();
                try {
                    int savedCount = tradeService.syncTrades(userId, exchange);
                    successCount++;
                    log.info("[TradeSyncScheduler] sync done - userId={}, exchange={}, savedCount={}",
                            userId, exchange, savedCount);
                } catch (RuntimeException e) {
                    if (isDecryptFailure(e)) {
                        key.deactivate();
                        exchangeKeyRepository.save(key);
                        log.warn("[TradeSyncScheduler] deactivated broken key - userId={}, exchange={}, message={}",
                                userId, exchange, e.getMessage());
                        continue;
                    }
                    log.warn("[TradeSyncScheduler] sync failed - userId={}, exchange={}, message={}",
                            userId, exchange, e.getMessage(), e);
                }
            }

            log.info("[TradeSyncScheduler] run complete - activeKeys={}, successCount={}",
                    activeKeys.size(), successCount);
        } finally {
            running.set(false);
        }
    }

    private boolean isDecryptFailure(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String message = current.getMessage();
            if (message != null && message.contains("복호화 실패")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
