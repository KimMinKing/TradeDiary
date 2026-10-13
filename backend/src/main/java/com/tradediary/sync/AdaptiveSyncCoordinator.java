package com.tradediary.sync;

import com.tradediary.exchange.ExchangeKey;
import com.tradediary.trade.TradeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Semaphore;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdaptiveSyncCoordinator {
    private static final Semaphore BACKFILL_SLOTS = new Semaphore(2);
    private final JdbcTemplate jdbc;
    private final TradeService tradeService;
    private final ThreadPoolTaskExecutor exchangeIoExecutor;

    @Scheduled(initialDelay = 5_000, fixedDelay = 60_000)
    public void seedConnections() {
        jdbc.update("INSERT INTO portfolio_versions(user_id) SELECT id FROM users ON CONFLICT (user_id) DO NOTHING");
        jdbc.update("""
            INSERT INTO exchange_sync_state(exchange_key_id,user_id,exchange,next_sync_at)
            SELECT id,user_id,exchange,CURRENT_TIMESTAMP FROM exchange_keys WHERE is_active=TRUE
            ON CONFLICT (exchange_key_id) DO NOTHING
            """);
    }

    public void registerActivity(Long userId) {
        seedUser(userId);
        jdbc.update("""
            UPDATE exchange_sync_state SET active_until=CURRENT_TIMESTAMP + INTERVAL '2 minutes',
              last_activity_at=CURRENT_TIMESTAMP,
              priority=GREATEST(priority,50), status=CASE WHEN status='ACTION_REQUIRED' THEN status ELSE 'QUEUED' END,
              next_sync_at=CASE WHEN last_success_at IS NULL OR last_success_at < CURRENT_TIMESTAMP - INTERVAL '20 seconds'
                                THEN CURRENT_TIMESTAMP ELSE next_sync_at END, updated_at=CURRENT_TIMESTAMP
            WHERE user_id=?
            """, userId);
    }

    public void request(Long userId, String exchange) {
        seedUser(userId);
        if (exchange == null || exchange.isBlank()) {
            jdbc.update("UPDATE exchange_sync_state SET status='QUEUED', priority=100, next_sync_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE user_id=?", userId);
        } else {
            jdbc.update("UPDATE exchange_sync_state SET status='QUEUED', priority=100, next_sync_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND exchange=?", userId, exchange.toUpperCase(Locale.ROOT));
        }
    }

    public SyncStatus status(Long userId) {
        seedUser(userId);
        Long version = jdbc.queryForObject("SELECT version FROM portfolio_versions WHERE user_id=?", Long.class, userId);
        List<Map<String,Object>> connections = jdbc.queryForList("""
            SELECT exchange,status,sync_phase,latest_ready,history_complete,
                   last_success_at,next_sync_at,failure_count,last_error
            FROM exchange_sync_state WHERE user_id=? ORDER BY exchange
            """, userId);
        boolean syncing = connections.stream().anyMatch(row -> "RUNNING".equals(row.get("status")) || "QUEUED".equals(row.get("status")));
        return new SyncStatus(version == null ? 0 : version, syncing, connections);
    }

    private void seedUser(Long userId) {
        jdbc.update("INSERT INTO portfolio_versions(user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING", userId);
        jdbc.update("""
            INSERT INTO exchange_sync_state(exchange_key_id,user_id,exchange,next_sync_at)
            SELECT id,user_id,exchange,CURRENT_TIMESTAMP FROM exchange_keys WHERE user_id=? AND is_active=TRUE
            ON CONFLICT (exchange_key_id) DO NOTHING
            """, userId);
    }

    @Scheduled(initialDelay = 8_000, fixedDelay = 2_000)
    public void dispatchDueJobs() {
        claim(8).forEach(job -> exchangeIoExecutor.execute(() -> execute(job)));
    }

    @Transactional
    public List<SyncJob> claim(int limit) {
        return jdbc.query("""
            UPDATE exchange_sync_state s SET status='RUNNING', locked_until=CURRENT_TIMESTAMP + INTERVAL '2 minutes',
              last_started_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
            WHERE s.id IN (
              SELECT id FROM exchange_sync_state
              WHERE status <> 'ACTION_REQUIRED' AND next_sync_at <= CURRENT_TIMESTAMP
                AND (locked_until IS NULL OR locked_until < CURRENT_TIMESTAMP)
              ORDER BY priority DESC,next_sync_at ASC FOR UPDATE SKIP LOCKED LIMIT ?
            ) RETURNING id,user_id,exchange,latest_ready,history_complete
            """, (rs, n) -> new SyncJob(rs.getLong("id"), rs.getLong("user_id"), rs.getString("exchange"),
                    rs.getBoolean("latest_ready"), rs.getBoolean("history_complete")), limit);
    }

    private void execute(SyncJob job) {
        boolean backfillPermit = false;
        try {
            ExchangeKey.Exchange exchange = ExchangeKey.Exchange.valueOf(job.exchange());
            boolean quickSync = !job.latestReady();
            boolean backfill = job.latestReady() && !job.historyComplete();
            if (backfill) {
                backfillPermit = BACKFILL_SLOTS.tryAcquire();
                if (!backfillPermit) {
                    jdbc.update("UPDATE exchange_sync_state SET status='QUEUED',locked_until=NULL,next_sync_at=CURRENT_TIMESTAMP + INTERVAL '5 seconds',updated_at=CURRENT_TIMESTAMP WHERE id=?", job.id());
                    return;
                }
            }
            int saved = quickSync
                    ? tradeService.syncRecentTrades(job.userId(), exchange)
                    : backfill
                        ? tradeService.backfillTrades(job.userId(), exchange)
                        : tradeService.syncTrades(job.userId(), exchange);
            jdbc.update("""
                UPDATE exchange_sync_state SET status='IDLE',priority=0,failure_count=0,last_error=NULL,
                  last_success_at=CURRENT_TIMESTAMP,last_cursor_at=CURRENT_TIMESTAMP,locked_until=NULL,
                  next_sync_at=CASE
                    WHEN ? THEN CURRENT_TIMESTAMP
                    WHEN EXISTS (SELECT 1 FROM follows f WHERE f.following_id=exchange_sync_state.user_id AND f.trade_alerts_enabled=TRUE)
                      THEN CURRENT_TIMESTAMP + INTERVAL '30 seconds'
                    WHEN active_until>CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + INTERVAL '30 seconds'
                    WHEN last_activity_at>CURRENT_TIMESTAMP - INTERVAL '1 day' THEN CURRENT_TIMESTAMP + INTERVAL '5 minutes'
                    WHEN last_activity_at>CURRENT_TIMESTAMP - INTERVAL '7 days' THEN CURRENT_TIMESTAMP + INTERVAL '30 minutes'
                    WHEN last_activity_at>CURRENT_TIMESTAMP - INTERVAL '30 days' THEN CURRENT_TIMESTAMP + INTERVAL '6 hours'
                    ELSE CURRENT_TIMESTAMP + INTERVAL '24 hours'
                  END,
                  latest_ready=CASE WHEN ? THEN TRUE ELSE latest_ready END,
                  history_complete=CASE WHEN ? THEN TRUE ELSE history_complete END,
                  sync_phase=CASE WHEN ? THEN 'BACKFILL' WHEN ? THEN 'READY' ELSE sync_phase END,
                  updated_at=CURRENT_TIMESTAMP WHERE id=?
                """, quickSync, quickSync, backfill, quickSync, backfill, job.id());
            if (saved > 0 || quickSync) {
                jdbc.update("INSERT INTO portfolio_versions(user_id,version,updated_at) VALUES (?,1,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET version=portfolio_versions.version+1,updated_at=CURRENT_TIMESTAMP", job.userId());
            }
            log.info("[AdaptiveSync] complete userId={}, exchange={}, phase={}, saved={}", job.userId(),
                    job.exchange(), quickSync ? "QUICK_SYNC" : backfill ? "BACKFILL" : "READY", saved);
        } catch (RuntimeException error) {
            fail(job, error);
        } finally {
            if (backfillPermit) BACKFILL_SLOTS.release();
        }
    }

    private void fail(SyncJob job, RuntimeException error) {
        String message = String.valueOf(error.getMessage());
        String lower = message.toLowerCase(Locale.ROOT);
        boolean credential = lower.contains("401") || lower.contains("invalid_key") || lower.contains("decrypt") || lower.contains("permission") || lower.contains("not_allowed");
        jdbc.update("""
            UPDATE exchange_sync_state SET status=?,failure_count=failure_count+1,last_error=?,locked_until=NULL,priority=0,
              next_sync_at=CASE WHEN failure_count=0 THEN CURRENT_TIMESTAMP+INTERVAL '1 minute'
                                WHEN failure_count=1 THEN CURRENT_TIMESTAMP+INTERVAL '5 minutes'
                                WHEN failure_count=2 THEN CURRENT_TIMESTAMP+INTERVAL '30 minutes'
                                ELSE CURRENT_TIMESTAMP+INTERVAL '1 hour' END,updated_at=CURRENT_TIMESTAMP WHERE id=?
            """, credential ? "ACTION_REQUIRED" : "BACKOFF", message.substring(0, Math.min(message.length(), 500)), job.id());
        log.warn("[AdaptiveSync] failed userId={}, exchange={}, actionRequired={}", job.userId(), job.exchange(), credential);
    }

    private record SyncJob(long id, long userId, String exchange, boolean latestReady, boolean historyComplete) {}
    public record SyncStatus(long version, boolean syncing, List<Map<String,Object>> connections) {}
}
