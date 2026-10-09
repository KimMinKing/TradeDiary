package com.tradediary.trade;

import com.tradediary.common.exception.BusinessException;
import com.tradediary.common.exception.ErrorCode;
import com.tradediary.exchange.BinanceClient;
import com.tradediary.exchange.BingxClient;
import com.tradediary.exchange.BitgetClient;
import com.tradediary.exchange.BybitClient;
import com.tradediary.exchange.ExchangeKey;
import com.tradediary.exchange.ExchangeKeyRepository;
import com.tradediary.exchange.ExchangeKeyService;
import com.tradediary.exchange.OkxClient;
import com.tradediary.exchange.KrakenClient;
import com.tradediary.exchange.UpbitClient;
import com.tradediary.follow.Follow;
import com.tradediary.follow.FollowService;
import com.tradediary.notification.NotificationService;
import com.tradediary.notification.NotificationType;
import com.tradediary.position.PositionService;
import com.tradediary.user.User;
import com.tradediary.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class TradeService {

    private static final Set<String> ACTIVE_SYNC_KEYS = ConcurrentHashMap.newKeySet();
    private static final ThreadLocal<LocalDateTime> START_TIME_OVERRIDE = new ThreadLocal<>();

    private final TradeRepository tradeRepository;
    private final ExchangeKeyService exchangeKeyService;
    private final ExchangeKeyRepository exchangeKeyRepository;
    private final UserRepository userRepository;
    private final UpbitClient upbitClient;
    private final BybitClient bybitClient;
    private final BitgetClient bitgetClient;
    private final OkxClient okxClient;
    private final BinanceClient binanceClient;
    private final BingxClient bingxClient;
    private final KrakenClient krakenClient;
    private final PositionService positionService;
    private final NotificationService notificationService;
    private final FollowService followService;

    @Transactional
    public int syncTrades(Long userId, ExchangeKey.Exchange exchange) {
        String syncKey = buildSyncKey(userId, exchange);
        if (!ACTIVE_SYNC_KEYS.add(syncKey)) {
            log.info("[TradeSync] duplicate sync skipped - userId={}, exchange={}", userId, exchange);
            return 0;
        }

        try {
            return switch (exchange) {
                case UPBIT -> syncUpbitTrades(userId);
                case BYBIT -> syncBybitTrades(userId);
                case BITGET -> syncBitgetTrades(userId);
                case OKX -> syncOkxTrades(userId);
                case BINANCE -> syncBinanceTrades(userId);
                case BINGX -> syncBingxTrades(userId);
                case KRAKEN -> syncKrakenTrades(userId);
            };
        } finally {
            ACTIVE_SYNC_KEYS.remove(syncKey);
        }
    }

    @Transactional
    public int syncRecentTrades(Long userId, ExchangeKey.Exchange exchange) {
        return syncWithStartTime(userId, exchange,
                LocalDateTime.now(java.time.ZoneId.of("Asia/Seoul")).minusDays(7));
    }

    @Transactional
    public int backfillTrades(Long userId, ExchangeKey.Exchange exchange) {
        int days = switch (exchange) {
            case BITGET, OKX, BINGX -> 90;
            default -> 365;
        };
        return syncWithStartTime(userId, exchange,
                LocalDateTime.now(java.time.ZoneId.of("Asia/Seoul")).minusDays(days));
    }

    private int syncWithStartTime(Long userId, ExchangeKey.Exchange exchange, LocalDateTime startTime) {
        START_TIME_OVERRIDE.set(startTime);
        try {
            return syncTrades(userId, exchange);
        } finally {
            START_TIME_OVERRIDE.remove();
        }
    }

    private LocalDateTime resolveStartTime(Long userId, ExchangeKey.Exchange exchange, int defaultLookbackDays) {
        LocalDateTime override = START_TIME_OVERRIDE.get();
        if (override != null) return override;
        return tradeRepository.findTopByUserIdAndExchangeOrderByTradedAtDesc(userId, exchange)
                .map(Trade::getTradedAt)
                .orElse(LocalDateTime.now(java.time.ZoneId.of("Asia/Seoul")).minusDays(defaultLookbackDays));
    }

    @Transactional
    public int syncKrakenTrades(Long userId) {
        ExchangeKeyService.DecryptedKey keys =
                exchangeKeyService.getDecryptedKey(userId, ExchangeKey.Exchange.KRAKEN);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Set<String> existingTradeIds = existingTradeIds(userId, ExchangeKey.Exchange.KRAKEN);
        LocalDateTime startTime = resolveStartTime(userId, ExchangeKey.Exchange.KRAKEN, 365);
        List<KrakenClient.KrakenTrade> trades = krakenClient.getTrades(
                keys.apiKey(), keys.secretKey(), startTime);
        int savedCount = 0;
        List<TradeNotificationData> newTrades = new ArrayList<>();
        for (KrakenClient.KrakenTrade trade : trades) {
            if (!existingTradeIds.add(trade.id())) continue;
            Trade saved = tradeRepository.save(Trade.builder()
                    .user(user).exchange(ExchangeKey.Exchange.KRAKEN)
                    .exchangeTradeId(trade.id()).symbol(trade.symbol()).side(trade.side())
                    .qty(trade.qty()).price(trade.price()).fee(trade.fee()).tradedAt(trade.tradedAt())
                    .build());
            savedCount++;
            newTrades.add(TradeNotificationData.from(saved));
        }
        if (savedCount > 0) runPostSyncTasks(userId, ExchangeKey.Exchange.KRAKEN, newTrades);
        return savedCount;
    }

    private String buildSyncKey(Long userId, ExchangeKey.Exchange exchange) {
        return userId + ":" + exchange.name();
    }

    @Transactional
    public int syncUpbitTrades(Long userId) {
        ExchangeKeyService.DecryptedKey keys =
                exchangeKeyService.getDecryptedKey(userId, ExchangeKey.Exchange.UPBIT);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Set<String> existingTradeIds = existingTradeIds(userId, ExchangeKey.Exchange.UPBIT);

        LocalDateTime startTime = resolveStartTime(userId, ExchangeKey.Exchange.UPBIT, 365);

        List<UpbitClient.UpbitOrder> orders =
                upbitClient.getClosedOrders(keys.apiKey(), keys.secretKey(), startTime);

        int savedCount = 0;
        List<TradeNotificationData> newTrades = new ArrayList<>();
        for (UpbitClient.UpbitOrder order : orders) {
            if (order.executed_volume == null || "0".equals(order.executed_volume)) {
                continue;
            }
            if (!existingTradeIds.add(order.uuid)) {
                continue;
            }

            UpbitClient.NormalizedTrade normalized = UpbitClient.NormalizedTrade.from(order);
            if (!normalized.isValid()) {
                continue;
            }

            Trade savedTrade = tradeRepository.save(Trade.builder()
                    .user(user)
                    .exchange(ExchangeKey.Exchange.UPBIT)
                    .exchangeTradeId(normalized.exchangeTradeId())
                    .symbol(normalized.symbol())
                    .side(normalized.side())
                    .qty(normalized.qty())
                    .price(normalized.price())
                    .fee(normalized.fee())
                    .tradedAt(normalized.tradedAt())
                    .build());
            savedCount++;
            newTrades.add(TradeNotificationData.from(savedTrade));
        }

        log.info("Upbit sync complete - userId={}, fetchedCount={}, savedCount={}",
                userId, orders.size(), savedCount);

        if (savedCount > 0) {
            runPostSyncTasks(userId, ExchangeKey.Exchange.UPBIT, newTrades);
        }
        return savedCount;
    }

    @Transactional(readOnly = true)
    public List<TradeResponse> getTrades(Long userId, String exchange) {
        if (exchange != null && !exchange.isBlank()) {
            ExchangeKey.Exchange exchangeEnum = ExchangeKey.Exchange.valueOf(exchange.toUpperCase());
            return tradeRepository.findByUserIdAndExchangeOrderByTradedAtDesc(userId, exchangeEnum)
                    .stream()
                    .map(TradeResponse::from)
                    .toList();
        }

        return tradeRepository.findByUserIdOrderByTradedAtDesc(userId).stream()
                .map(TradeResponse::from)
                .toList();
    }

    @Transactional
    public int syncBybitTrades(Long userId) {
        ExchangeKeyService.DecryptedKey keys =
                exchangeKeyService.getDecryptedKey(userId, ExchangeKey.Exchange.BYBIT);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Set<String> existingTradeIds = existingTradeIds(userId, ExchangeKey.Exchange.BYBIT);

        LocalDateTime startTime = resolveStartTime(userId, ExchangeKey.Exchange.BYBIT, 365);

        List<BybitClient.BybitExecution> executions =
                bybitClient.getExecutions(keys.apiKey(), keys.secretKey(), startTime);

        int savedCount = 0;
        List<TradeNotificationData> newTrades = new ArrayList<>();
        for (BybitClient.BybitExecution exec : executions) {
            if (!existingTradeIds.add(exec.execId)) {
                continue;
            }

            BybitClient.NormalizedTrade normalized = BybitClient.NormalizedTrade.from(exec);
            if (!normalized.isValid()) {
                continue;
            }

            Trade savedTrade = tradeRepository.save(Trade.builder()
                    .user(user)
                    .exchange(ExchangeKey.Exchange.BYBIT)
                    .exchangeTradeId(normalized.exchangeTradeId())
                    .symbol(normalized.symbol())
                    .side(normalized.side())
                    .qty(normalized.qty())
                    .price(normalized.price())
                    .fee(normalized.fee())
                    .tradedAt(normalized.tradedAt())
                    .build());
            savedCount++;
            newTrades.add(TradeNotificationData.from(savedTrade));
        }

        log.info("Bybit sync complete - userId={}, fetchedCount={}, savedCount={}",
                userId, executions.size(), savedCount);

        if (savedCount > 0) {
            runPostSyncTasks(userId, ExchangeKey.Exchange.BYBIT, newTrades);
        }
        return savedCount;
    }

    @Transactional
    public int syncBitgetTrades(Long userId) {
        ExchangeKeyService.DecryptedKey keys =
                exchangeKeyService.getDecryptedKey(userId, ExchangeKey.Exchange.BITGET);

        if (keys.passphrase() == null || keys.passphrase().isBlank()) {
            throw new RuntimeException("Bitget passphrase is required.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Set<String> existingTradeIds = new HashSet<>(
                tradeRepository.findExchangeTradeIdsByUserIdAndExchange(userId, ExchangeKey.Exchange.BITGET)
        );
        Set<String> importedTradeIds = new HashSet<>();

        LocalDateTime startTime = resolveStartTime(userId, ExchangeKey.Exchange.BITGET, 90);
        List<BitgetClient.BitgetOrder> orders =
                bitgetClient.getOrders(keys.apiKey(), keys.secretKey(), keys.passphrase(), startTime);

        int savedCount = 0;
        int newTradeCount = 0;
        List<TradeNotificationData> newTrades = new ArrayList<>();
        for (BitgetClient.BitgetOrder order : orders) {
            BitgetClient.NormalizedTrade normalized = BitgetClient.NormalizedTrade.from(order);
            if (!normalized.isValid()) {
                continue;
            }
            if (!importedTradeIds.add(normalized.exchangeTradeId())
                    || existingTradeIds.contains(normalized.exchangeTradeId())) {
                continue;
            }

            Trade savedTrade = tradeRepository.save(Trade.builder()
                    .user(user)
                    .exchange(ExchangeKey.Exchange.BITGET)
                    .exchangeTradeId(normalized.exchangeTradeId())
                    .symbol(normalized.symbol())
                    .side(normalized.side())
                    .qty(normalized.qty())
                    .price(normalized.price())
                    .fee(normalized.fee())
                    .tradedAt(normalized.tradedAt())
                    .build());
            savedCount++;

            if (!existingTradeIds.contains(normalized.exchangeTradeId())) {
                newTradeCount++;
                newTrades.add(TradeNotificationData.from(savedTrade));
            }
        }

        log.info("Bitget sync complete - userId={}, fetchedCount={}, savedCount={}, newTradeCount={}",
                userId, orders.size(), savedCount, newTradeCount);

        if (newTradeCount > 0) {
            runPostSyncTasks(userId, ExchangeKey.Exchange.BITGET, newTrades);
        } else {
            positionService.rebuildPositions(userId, ExchangeKey.Exchange.BITGET);
        }
        return savedCount;
    }

    @Transactional
    public int syncOkxTrades(Long userId) {
        ExchangeKeyService.DecryptedKey keys =
                exchangeKeyService.getDecryptedKey(userId, ExchangeKey.Exchange.OKX);

        if (keys.passphrase() == null || keys.passphrase().isBlank()) {
            throw new RuntimeException("OKX passphrase is required.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Set<String> existingTradeIds = existingTradeIds(userId, ExchangeKey.Exchange.OKX);

        LocalDateTime startTime = resolveStartTime(userId, ExchangeKey.Exchange.OKX, 90);

        List<OkxClient.OkxOrder> orders =
                okxClient.getOrders(keys.apiKey(), keys.secretKey(), keys.passphrase(), startTime);

        int savedCount = 0;
        List<TradeNotificationData> newTrades = new ArrayList<>();
        for (OkxClient.OkxOrder order : orders) {
            if (!existingTradeIds.add(order.orderId)) {
                continue;
            }

            OkxClient.NormalizedTrade normalized = OkxClient.NormalizedTrade.from(order);
            if (!normalized.isValid()) {
                continue;
            }

            Trade savedTrade = tradeRepository.save(Trade.builder()
                    .user(user)
                    .exchange(ExchangeKey.Exchange.OKX)
                    .exchangeTradeId(normalized.exchangeTradeId())
                    .symbol(normalized.symbol())
                    .side(normalized.side())
                    .qty(normalized.qty())
                    .price(normalized.price())
                    .fee(normalized.fee())
                    .tradedAt(normalized.tradedAt())
                    .build());
            savedCount++;
            newTrades.add(TradeNotificationData.from(savedTrade));
        }

        log.info("OKX sync complete - userId={}, fetchedCount={}, savedCount={}",
                userId, orders.size(), savedCount);

        if (savedCount > 0) {
            runPostSyncTasks(userId, ExchangeKey.Exchange.OKX, newTrades);
        }
        return savedCount;
    }

    @Transactional
    public int syncBinanceTrades(Long userId) {
        ExchangeKeyService.DecryptedKey keys =
                exchangeKeyService.getDecryptedKey(userId, ExchangeKey.Exchange.BINANCE);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Set<String> existingTradeIds = existingTradeIds(userId, ExchangeKey.Exchange.BINANCE);

        LocalDateTime startTime = resolveStartTime(userId, ExchangeKey.Exchange.BINANCE, 365);

        List<BinanceClient.BinanceTrade> trades =
                binanceClient.getTrades(keys.apiKey(), keys.secretKey(), startTime);

        int savedCount = 0;
        List<TradeNotificationData> newTrades = new ArrayList<>();
        for (BinanceClient.BinanceTrade raw : trades) {
            BinanceClient.NormalizedTrade normalized = BinanceClient.NormalizedTrade.from(raw);
            if (!normalized.isValid()) {
                continue;
            }
            if (!existingTradeIds.add(normalized.exchangeTradeId())) {
                continue;
            }

            Trade savedTrade = tradeRepository.save(Trade.builder()
                    .user(user)
                    .exchange(ExchangeKey.Exchange.BINANCE)
                    .exchangeTradeId(normalized.exchangeTradeId())
                    .symbol(normalized.symbol())
                    .side(normalized.side())
                    .qty(normalized.qty())
                    .price(normalized.price())
                    .fee(normalized.fee())
                    .tradedAt(normalized.tradedAt())
                    .build());
            savedCount++;
            newTrades.add(TradeNotificationData.from(savedTrade));
        }

        log.info("Binance sync complete - userId={}, fetchedCount={}, savedCount={}",
                userId, trades.size(), savedCount);

        if (savedCount > 0) {
            runPostSyncTasks(userId, ExchangeKey.Exchange.BINANCE, newTrades);
        }
        return savedCount;
    }

    @Transactional
    public int syncBingxTrades(Long userId) {
        ExchangeKeyService.DecryptedKey keys =
                exchangeKeyService.getDecryptedKey(userId, ExchangeKey.Exchange.BINGX);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Set<String> existingTradeIds = existingTradeIds(userId, ExchangeKey.Exchange.BINGX);

        LocalDateTime startTime = resolveStartTime(userId, ExchangeKey.Exchange.BINGX, 90);

        List<BingxClient.BingxOrder> orders =
                bingxClient.getTrades(keys.apiKey(), keys.secretKey(), startTime);

        int savedCount = 0;
        List<TradeNotificationData> newTrades = new ArrayList<>();
        for (BingxClient.BingxOrder raw : orders) {
            if (!existingTradeIds.add(String.valueOf(raw.orderId))) {
                continue;
            }

            BingxClient.NormalizedTrade normalized = BingxClient.NormalizedTrade.from(raw);
            if (!normalized.isValid()) {
                continue;
            }

            Trade savedTrade = tradeRepository.save(Trade.builder()
                    .user(user)
                    .exchange(ExchangeKey.Exchange.BINGX)
                    .exchangeTradeId(normalized.exchangeTradeId())
                    .symbol(normalized.symbol())
                    .side(normalized.side())
                    .qty(normalized.qty())
                    .price(normalized.price())
                    .fee(normalized.fee())
                    .tradedAt(normalized.tradedAt())
                    .build());
            savedCount++;
            newTrades.add(TradeNotificationData.from(savedTrade));
        }

        log.info("BingX sync complete - userId={}, fetchedCount={}, savedCount={}",
                userId, orders.size(), savedCount);

        if (savedCount > 0) {
            runPostSyncTasks(userId, ExchangeKey.Exchange.BINGX, newTrades);
        }
        return savedCount;
    }

    private void runPostSyncTasks(Long userId, ExchangeKey.Exchange exchange, List<TradeNotificationData> newTrades) {
        List<TradeNotificationData> sortedTrades = newTrades.stream()
                .sorted(Comparator.comparing(TradeNotificationData::tradedAt))
                .toList();

        positionService.rebuildPositions(userId, exchange);

        try {
            createTradeNotifications(userId, exchange, sortedTrades);
            notifyFollowersAboutTrades(userId, exchange, sortedTrades);
        } catch (RuntimeException e) {
            log.warn("[TradeSync] trade notification creation failed - userId={}, exchange={}, newTradeCount={}",
                    userId, exchange, sortedTrades.size(), e);
        }
    }

    private Set<String> existingTradeIds(Long userId, ExchangeKey.Exchange exchange) {
        return new HashSet<>(tradeRepository.findExchangeTradeIdsByUserIdAndExchange(userId, exchange));
    }

    private void createTradeNotifications(Long userId, ExchangeKey.Exchange exchange, List<TradeNotificationData> newTrades) {
        if (newTrades.isEmpty()) {
            return;
        }

        ExchangeKey exchangeKey = exchangeKeyRepository.findByUserIdAndExchange(userId, exchange)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        LocalDateTime lastTradeNotifiedAt = exchangeKey.getLastTradeNotifiedAt();
        LocalDateTime latestTradeAt = newTrades.get(newTrades.size() - 1).tradedAt();
        if (lastTradeNotifiedAt == null) {
            exchangeKey.updateLastTradeNotifiedAt(latestTradeAt);
            return;
        }

        LocalDateTime maxNotifiedAt = lastTradeNotifiedAt;
        for (TradeNotificationData trade : newTrades) {
            if (!trade.tradedAt().isAfter(lastTradeNotifiedAt)) {
                continue;
            }

            notificationService.createNotification(
                    userId,
                    NotificationType.TRADE_EXECUTED,
                    buildTradeTitle(trade),
                    buildTradeMessage(exchange, trade),
                    trade.symbol(),
                    "trade-executed-" + exchange.name() + "-" + trade.exchangeTradeId()
            );
            maxNotifiedAt = trade.tradedAt();
        }

        exchangeKey.updateLastTradeNotifiedAt(maxNotifiedAt);
    }

    private void notifyFollowersAboutTrades(Long userId, ExchangeKey.Exchange exchange, List<TradeNotificationData> newTrades) {
        if (newTrades.isEmpty()) {
            return;
        }

        List<Follow> follows = followService.getFollowersWithFollower(userId);
        if (follows.isEmpty()) {
            return;
        }

        User trader = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        LocalDateTime latestTradeAt = newTrades.get(newTrades.size() - 1).tradedAt();

        for (Follow follow : follows) {
            LocalDateTime lastNotifiedAt = follow.getLastFollowerTradeNotifiedAt();
            if (lastNotifiedAt == null) {
                follow.updateLastFollowerTradeNotifiedAt(latestTradeAt);
                continue;
            }

            LocalDateTime maxNotifiedAt = lastNotifiedAt;
            for (TradeNotificationData trade : newTrades) {
                if (!trade.tradedAt().isAfter(lastNotifiedAt)) {
                    continue;
                }

                notificationService.createNotification(
                        follow.getFollower().getId(),
                        NotificationType.FOLLOWER_TRADE,
                        trader.getNickname() + " · " + buildTradeTitle(trade),
                        buildTradeMessage(exchange, trade),
                        trade.symbol(),
                        "follower-trade-" + follow.getId() + "-" + trade.exchangeTradeId()
                );
                maxNotifiedAt = trade.tradedAt();
            }

            follow.updateLastFollowerTradeNotifiedAt(maxNotifiedAt);
        }
    }

    private String buildTradeTitle(TradeNotificationData trade) {
        return String.format("%s %s executed",
                trade.symbol(),
                trade.side() == TradeSide.BUY ? "BUY" : "SELL");
    }

    private String buildTradeMessage(ExchangeKey.Exchange exchange, TradeNotificationData trade) {
        return String.format("%s · %s · %s · Qty %s · Price %s",
                exchange.name(),
                trade.symbol(),
                trade.side() == TradeSide.BUY ? "BUY" : "SELL",
                formatDecimal(trade.qty()),
                formatDecimal(trade.price()));
    }

    private String formatDecimal(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private record TradeNotificationData(
            String exchangeTradeId,
            String symbol,
            TradeSide side,
            BigDecimal qty,
            BigDecimal price,
            LocalDateTime tradedAt
    ) {
        private static TradeNotificationData from(Trade trade) {
            return new TradeNotificationData(
                    trade.getExchangeTradeId(),
                    trade.getSymbol(),
                    trade.getSide(),
                    trade.getQty(),
                    trade.getPrice(),
                    trade.getTradedAt()
            );
        }
    }

    public record TradeResponse(
            Long id,
            String exchange,
            String symbol,
            String side,
            String qty,
            String price,
            String fee,
            String tradedAt
    ) {
        public static TradeResponse from(Trade trade) {
            return new TradeResponse(
                    trade.getId(),
                    trade.getExchange().name(),
                    trade.getSymbol(),
                    trade.getSide().name(),
                    trade.getQty().toPlainString(),
                    trade.getPrice().toPlainString(),
                    trade.getFee().toPlainString(),
                    trade.getTradedAt().toString()
            );
        }
    }
}
