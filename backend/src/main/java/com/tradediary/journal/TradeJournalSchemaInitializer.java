package com.tradediary.journal;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.legacy-schema-initializers.enabled", havingValue = "true")
@RequiredArgsConstructor
public class TradeJournalSchemaInitializer {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void initialize() {
        jdbcTemplate.execute("ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS ai_feedback TEXT");
        jdbcTemplate.execute("ALTER TABLE trade_journals ADD COLUMN IF NOT EXISTS ai_feedback_updated_at TIMESTAMP");
        log.info("[TradeJournalSchema] ai_feedback columns checked");
    }
}
