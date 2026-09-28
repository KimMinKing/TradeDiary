package com.tradediary.follow;

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
public class FollowSchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        try {
            jdbcTemplate.execute("""
                    ALTER TABLE follows
                        ADD COLUMN IF NOT EXISTS last_follower_trade_notified_at TIMESTAMP
                    """);
        } catch (RuntimeException e) {
            log.warn("[FollowSchema] failed to add last_follower_trade_notified_at: {}", e.getMessage(), e);
        }
    }
}
