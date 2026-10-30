package com.tradediary.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.legacy-schema-initializers.enabled", havingValue = "true")
@RequiredArgsConstructor
public class NotificationSchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        try {
            jdbcTemplate.execute("""
                    ALTER TABLE notifications
                        ALTER COLUMN related_id TYPE VARCHAR(255)
                    """);
            jdbcTemplate.execute("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check");
            jdbcTemplate.execute("""
                    ALTER TABLE notifications
                        ADD CONSTRAINT notifications_type_check CHECK (
                            type IN (
                                'TRADE_EXECUTED',
                                'POSITION_OPENED',
                                'POSITION_CLOSED',
                                'PROFIT_TAKEN',
                                'LOSS_CUT',
                                'EXCHANGE_CONNECTED',
                                'EXCHANGE_DISCONNECTED',
                                'MARGIN_WARNING',
                                'DAILY_SUMMARY',
                                'WEEKLY_SUMMARY',
                                'MONTHLY_SUMMARY',
                                'AI_REPORT_READY',
                                'NEWS_ALERT',
                                'SYSTEM_ALERT',
                                'FOLLOWER_TRADE'
                            )
                        )
                    """);
            log.info("[NotificationSchema] notifications schema refreshed");
        } catch (RuntimeException e) {
            log.warn("[NotificationSchema] failed to refresh notifications schema: {}", e.getMessage(), e);
        }
    }
}
