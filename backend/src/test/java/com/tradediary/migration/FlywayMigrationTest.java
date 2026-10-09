// [파일 용도] 빈 PostgreSQL에서 Flyway 전체 마이그레이션을 자동 검증

package com.tradediary.migration;

import com.tradediary.common.util.AesUtil;
import com.tradediary.exchange.ExchangeKeyEncryptionMigrator;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// [클래스] PostgreSQL 16 기반 스키마 생성·무결성 회귀 테스트
@Tag("migration")
class FlywayMigrationTest {

    // [용도] 빈 DB에 모든 마이그레이션 적용 후 핵심 구조와 시드 검증 / [호출] Gradle migrationTest
    @Test
    void migratesEmptyPostgresDatabase() throws Exception {
        String containerName = "tradediary-migration-test-" + UUID.randomUUID().toString().substring(0, 8);
        try {
            docker("run", "-d", "--name", containerName,
                    "-e", "POSTGRES_DB=tradediary",
                    "-e", "POSTGRES_USER=tradediary",
                    "-e", "POSTGRES_PASSWORD=tradediary",
                    "-p", "127.0.0.1::5432", "postgres:16-alpine");
            int port = mappedPort(containerName);
            String jdbcUrl = "jdbc:postgresql://127.0.0.1:" + port + "/tradediary";
            waitUntilReady(containerName, jdbcUrl);

            Flyway flyway = Flyway.configure()
                    .dataSource(jdbcUrl, "tradediary", "tradediary")
                    .locations("classpath:db/current")
                    .baselineOnMigrate(true)
                    .baselineVersion("100")
                    .validateOnMigrate(true)
                    .load();

            assertThat(flyway.migrate().migrationsExecuted).isGreaterThanOrEqualTo(16);
            flyway.validate();

            try (Connection connection = DriverManager.getConnection(jdbcUrl, "tradediary", "tradediary");
                 Statement statement = connection.createStatement()) {
                assertThat(singleLong(statement,
                        "SELECT COUNT(*) FROM flyway_schema_history WHERE success = TRUE")).isGreaterThanOrEqualTo(16);
                assertThat(singleLong(statement,
                        "SELECT character_maximum_length FROM information_schema.columns " +
                                "WHERE table_name='exchange_keys' AND column_name='api_key'"))
                        .isEqualTo(2048);
                assertThat(singleLong(statement,
                        "SELECT COUNT(*) FROM strategy_tags WHERE user_id IS NULL")).isEqualTo(8);
                assertThat(singleLong(statement,
                        "SELECT COUNT(*) FROM checklist_items WHERE user_id IS NULL")).isEqualTo(10);
                assertThat(singleText(statement,
                        "SELECT to_regclass('public.trade_stats')::text")).isEqualTo("trade_stats");
                assertThat(singleText(statement,
                        "SELECT to_regclass('public.streak_records')::text")).isEqualTo("streak_records");
                assertThat(singleLong(statement,
                        "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'uk_exchange_keys_user_exchange'"))
                        .isEqualTo(1);
                assertThat(singleText(statement,
                        "SELECT column_default FROM information_schema.columns " +
                                "WHERE table_name = 'trade_journals' AND column_name = 'visibility'"))
                        .contains("PRIVATE");
                assertThat(singleLong(statement,
                        "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'uk_notifications_user_related'"))
                        .isEqualTo(1);
                assertThat(singleText(statement,
                        "SELECT column_default FROM information_schema.columns " +
                                "WHERE table_name = 'users' AND column_name = 'assets_public'"))
                        .contains("false");
                assertThat(singleText(statement,
                        "SELECT to_regclass('public.community_posts')::text")).isEqualTo("community_posts");
                assertThat(singleText(statement,
                        "SELECT to_regclass('public.community_comments')::text")).isEqualTo("community_comments");
                assertThat(singleText(statement,
                        "SELECT to_regclass('public.exchange_sync_state')::text")).isEqualTo("exchange_sync_state");
                assertThat(singleText(statement,
                        "SELECT to_regclass('public.portfolio_versions')::text")).isEqualTo("portfolio_versions");
            }

            String testSecret = "0123456789abcdef0123456789abcdef";
            AesUtil crypto = new AesUtil(testSecret);
            JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(jdbcUrl, "tradediary", "tradediary"));
            jdbc.update("INSERT INTO users(email,nickname) VALUES (?,?)", "migration@example.com", "Migration");
            Long userId = jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class,
                    "migration@example.com");
            jdbc.update("INSERT INTO exchange_keys(user_id,exchange,api_key,secret_key,passphrase) VALUES (?,?,?,?,?)",
                    userId, "BITGET", legacyEncrypt("api-key", testSecret),
                    legacyEncrypt("secret-key", testSecret), legacyEncrypt("passphrase", testSecret));

            ExchangeKeyEncryptionMigrator migrator = new ExchangeKeyEncryptionMigrator(jdbc, crypto);
            migrator.run(null);
            Map<String, Object> converted = jdbc.queryForMap(
                    "SELECT api_key,secret_key,passphrase FROM exchange_keys WHERE user_id=?", userId);
            assertThat((String) converted.get("api_key")).startsWith("v2:");
            assertThat(crypto.decrypt((String) converted.get("api_key"))).isEqualTo("api-key");
            assertThat(crypto.decrypt((String) converted.get("secret_key"))).isEqualTo("secret-key");
            assertThat(crypto.decrypt((String) converted.get("passphrase"))).isEqualTo("passphrase");
            migrator.run(null);
            assertThat(jdbc.queryForObject("SELECT api_key FROM exchange_keys WHERE user_id=?", String.class, userId))
                    .isEqualTo(converted.get("api_key"));
        } finally {
            dockerIgnoringFailure("rm", "-f", containerName);
        }
    }

    private String legacyEncrypt(String value, String secret) throws Exception {
        byte[] key = secret.getBytes(StandardCharsets.UTF_8);
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"),
                new IvParameterSpec(Arrays.copyOf(key, 16)));
        return Base64.getEncoder().encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    }

    private int mappedPort(String containerName) throws Exception {
        String output = docker("port", containerName, "5432/tcp").trim();
        return Integer.parseInt(output.substring(output.lastIndexOf(':') + 1));
    }

    private void waitUntilReady(String containerName, String jdbcUrl) throws Exception {
        Instant deadline = Instant.now().plus(Duration.ofSeconds(30));
        while (Instant.now().isBefore(deadline)) {
            if (dockerIgnoringFailure("exec", containerName, "pg_isready", "-U", "tradediary") == 0) {
                try (Connection ignored = DriverManager.getConnection(jdbcUrl, "tradediary", "tradediary")) {
                    return;
                } catch (java.sql.SQLException ignored) {
                    // Docker may report database readiness before the mapped host port accepts connections.
                }
            }
            Thread.sleep(500);
        }
        throw new IllegalStateException("PostgreSQL 검증 컨테이너가 준비되지 않았습니다.");
    }

    private String docker(String... arguments) throws Exception {
        Process process = new ProcessBuilder(command(arguments)).redirectErrorStream(true).start();
        String output = new String(process.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        if (process.waitFor() != 0) throw new IllegalStateException("docker 명령 실패: " + output);
        return output;
    }

    private int dockerIgnoringFailure(String... arguments) throws Exception {
        Process process = new ProcessBuilder(command(arguments)).redirectErrorStream(true).start();
        process.getInputStream().transferTo(java.io.OutputStream.nullOutputStream());
        return process.waitFor();
    }

    private String[] command(String... arguments) {
        String[] command = new String[arguments.length + 1];
        command[0] = "docker";
        System.arraycopy(arguments, 0, command, 1, arguments.length);
        return command;
    }

    private long singleLong(Statement statement, String query) throws Exception {
        try (ResultSet resultSet = statement.executeQuery(query)) {
            resultSet.next();
            return resultSet.getLong(1);
        }
    }

    private String singleText(Statement statement, String query) throws Exception {
        try (ResultSet resultSet = statement.executeQuery(query)) {
            resultSet.next();
            return resultSet.getString(1);
        }
    }
}
