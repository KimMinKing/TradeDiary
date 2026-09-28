package com.tradediary.journal;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class JournalEncryptionMigrator implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final JournalFieldCrypto crypto;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT id,symbol,trade_refs_json,entry_reason,exit_reason,emotion,memo,image,ai_feedback
            FROM trade_journals WHERE content_encryption_version=0 FOR UPDATE
            """);
        for (Map<String, Object> row : rows) {
            jdbc.update("""
                UPDATE trade_journals SET symbol=?,trade_refs_json=?,entry_reason=?,exit_reason=?,emotion=?,memo=?,
                  image=?,ai_feedback=?,content_encryption_version=1,content_encrypted_at=CURRENT_TIMESTAMP WHERE id=?
                """, encrypted(row, "symbol"), encrypted(row, "trade_refs_json"),
                    encrypted(row, "entry_reason"), encrypted(row, "exit_reason"), encrypted(row, "emotion"),
                    encrypted(row, "memo"), encrypted(row, "image"), encrypted(row, "ai_feedback"), row.get("id"));
        }
        if (!rows.isEmpty()) log.info("[JournalSecurity] encrypted {} existing journal records", rows.size());
    }

    private String encrypted(Map<String, Object> row, String field) {
        Object value = row.get(field);
        return value == null ? null : crypto.encrypt(value.toString());
    }
}
