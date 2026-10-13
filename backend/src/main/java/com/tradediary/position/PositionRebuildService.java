package com.tradediary.position;

import com.tradediary.exchange.ExchangeKey;
import com.tradediary.exchange.ExchangeKeyRepository;
import com.tradediary.trade.TradeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class PositionRebuildService {

    private final PositionService positionService;
    private final ExchangeKeyRepository exchangeKeyRepository;
    private final TradeRepository tradeRepository;

    @Transactional
    public void rebuildAllPositions(Long userId) {
        List<ExchangeKey> keys = exchangeKeyRepository.findAllByUserId(userId);
        Set<ExchangeKey.Exchange> exchanges = new LinkedHashSet<>();
        keys.stream()
                .map(ExchangeKey::getExchange)
                .forEach(exchanges::add);
        exchanges.addAll(tradeRepository.findDistinctExchangesByUserId(userId));

        log.info("[Position] rebuild all start - userId={}, exchangeCount={}", userId, exchanges.size());

        for (ExchangeKey.Exchange exchange : exchanges) {
            if (!tradeRepository.existsByUserIdAndExchange(userId, exchange)) {
                continue;
            }
            positionService.rebuildPositions(userId, exchange);
        }

        log.info("[Position] rebuild all complete - userId={}", userId);
    }
}
