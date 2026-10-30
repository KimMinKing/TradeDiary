package com.tradediary.exchange;

import com.tradediary.common.util.AesUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/** Upgrades existing exchange credentials without requiring users to reconnect. */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExchangeKeyEncryptionMigrator implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final AesUtil aesUtil;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT id,api_key,secret_key,passphrase FROM exchange_keys
                WHERE api_key NOT LIKE 'v2:%' OR secret_key NOT LIKE 'v2:%'
                   OR (passphrase IS NOT NULL AND passphrase NOT LIKE 'v2:%')
                FOR UPDATE
                """);
        int upgraded = 0;
        for (Map<String, Object> row : rows) {
            long id = ((Number) row.get("id")).longValue();
            String apiKey;
            String secretKey;
            String passphrase;
            try {
                apiKey = aesUtil.decrypt((String) row.get("api_key"));
                secretKey = aesUtil.decrypt((String) row.get("secret_key"));
                passphrase = row.get("passphrase") == null ? null
                        : aesUtil.decrypt((String) row.get("passphrase"));
            } catch (RuntimeException error) {
                log.error("[ExchangeKeySecurity] credential migration failed for key id={}; reconnect required", id);
                continue;
            }
            jdbc.update("UPDATE exchange_keys SET api_key=?, secret_key=?, passphrase=? WHERE id=?",
                    aesUtil.encrypt(apiKey), aesUtil.encrypt(secretKey),
                    passphrase == null ? null : aesUtil.encrypt(passphrase), id);
            upgraded++;
        }
        if (upgraded > 0) log.info("[ExchangeKeySecurity] upgraded {} exchange keys", upgraded);
    }
}
