package com.tradediary.common.service;

import com.tradediary.exchange.ExchangeKey;
import com.tradediary.exchange.ExchangeRateController;
import com.tradediary.position.Position;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PnlCalculationService {

    private static final BigDecimal DEFAULT_KRW_PER_USDT = new BigDecimal("1400");
    private static final long RATE_CACHE_MILLIS = 60_000;

    private final ExchangeRateController exchangeRateController;
    private volatile BigDecimal cachedKrwPerUsdt;
    private volatile long cachedAtMillis;

    public BigDecimal toKrw(Position position) {
        return toKrw(position, getKrwPerUsdt());
    }

    private BigDecimal toKrw(Position position, BigDecimal krwPerUsdt) {
        if (position.getExchange() == ExchangeKey.Exchange.UPBIT) {
            return position.getPnl();
        }
        return position.getPnl().multiply(krwPerUsdt);
    }

    public BigDecimal amountToKrw(Position position, BigDecimal amount) {
        return position.getExchange() == ExchangeKey.Exchange.UPBIT
                ? amount : amount.multiply(getKrwPerUsdt());
    }

    public BigDecimal sumKrw(List<Position> positions) {
        BigDecimal krwPerUsdt = getKrwPerUsdt();
        return positions.stream()
                .map(position -> toKrw(position, krwPerUsdt))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public String formatKrw(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    public BigDecimal getKrwPerUsdt() {
        long now = System.currentTimeMillis();
        BigDecimal cached = cachedKrwPerUsdt;
        if (cached != null && now - cachedAtMillis < RATE_CACHE_MILLIS) {
            return cached;
        }

        try {
            Map<String, Object> rates = exchangeRateController.getExchangeRate().getBody();
            if (rates == null || rates.get("krwPerUsdt") == null) {
                return DEFAULT_KRW_PER_USDT;
            }
            BigDecimal rate = new BigDecimal(rates.get("krwPerUsdt").toString());
            cachedKrwPerUsdt = rate;
            cachedAtMillis = now;
            return rate;
        } catch (Exception e) {
            return DEFAULT_KRW_PER_USDT;
        }
    }
}
