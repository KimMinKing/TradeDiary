package com.tradediary.integration;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("migration")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class JournalFlowIntegrationTest {

    private static final String CONTAINER_NAME = "tradediary-flow-test-" +
            UUID.randomUUID().toString().substring(0, 8);
    private static final int DB_PORT = startPostgres();

    @Autowired
    private TestRestTemplate rest;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:postgresql://127.0.0.1:" + DB_PORT + "/tradediary");
        registry.add("spring.datasource.username", () -> "tradediary");
        registry.add("spring.datasource.password", () -> "tradediary");
        registry.add("jwt.secret", () -> "0123456789abcdef0123456789abcdef");
        registry.add("aes.secret", () -> "abcdef0123456789abcdef0123456789");
        registry.add("spring.security.oauth2.client.registration.google.client-id", () -> "test-google-id");
        registry.add("spring.security.oauth2.client.registration.google.client-secret", () -> "test-google-secret");
        registry.add("spring.security.oauth2.client.registration.kakao.client-id", () -> "test-kakao-id");
        registry.add("spring.security.oauth2.client.registration.kakao.client-secret", () -> "test-kakao-secret");
        registry.add("trade-sync.scheduler.initial-delay-ms", () -> "3600000");
    }

    @Test
    void signupJournalAndPrivateAccessWorkOverHttp() {
        String ownerToken = signupAndLogin("owner");
        String otherToken = signupAndLogin("other");

        ResponseEntity<Map> created = rest.exchange("/api/journals", HttpMethod.POST,
                request(ownerToken, Map.of(
                        "trade_date", "2026-09-28",
                        "symbol", "KRW-BTC",
                        "entry_reason", "Breakout",
                        "memo", "Risk defined before entry",
                        "visibility", "PRIVATE")), Map.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(created.getBody()).isNotNull();
        Number journalId = (Number) created.getBody().get("id");
        assertThat(journalId).isNotNull();

        ResponseEntity<Map> ownerRead = rest.exchange("/api/journals/" + journalId,
                HttpMethod.GET, request(ownerToken, null), Map.class);
        assertThat(ownerRead.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(ownerRead.getBody()).containsEntry("memo", "Risk defined before entry")
                .containsEntry("visibility", "PRIVATE");

        ResponseEntity<List<Map<String, Object>>> listed = rest.exchange("/api/journals",
                HttpMethod.GET, request(ownerToken, null), new ParameterizedTypeReference<>() {});
        assertThat(listed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listed.getBody()).hasSize(1);

        ResponseEntity<Map> otherRead = rest.exchange("/api/journals/" + journalId,
                HttpMethod.GET, request(otherToken, null), Map.class);
        assertThat(otherRead.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        ResponseEntity<Map> anonymousRead = rest.getForEntity("/api/journals/" + journalId, Map.class);
        assertThat(anonymousRead.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private String signupAndLogin(String prefix) {
        String email = prefix + "-" + UUID.randomUUID() + "@example.com";
        String password = "integration-password-123";
        ResponseEntity<Void> signup = rest.postForEntity("/api/auth/signup",
                Map.of("email", email, "password", password, "nickname", prefix + "User"), Void.class);
        assertThat(signup.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<Map> login = rest.postForEntity("/api/auth/login",
                Map.of("email", email, "password", password), Map.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(login.getBody()).isNotNull();
        return (String) login.getBody().get("access_token");
    }

    private HttpEntity<?> request(String token, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }

    private static int startPostgres() {
        try {
            docker("run", "-d", "--name", CONTAINER_NAME,
                    "-e", "POSTGRES_DB=tradediary",
                    "-e", "POSTGRES_USER=tradediary",
                    "-e", "POSTGRES_PASSWORD=tradediary",
                    "-p", "127.0.0.1::5432", "postgres:16-alpine");
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    // Spring's shutdown hook closes scheduled tasks and the connection pool first.
                    Thread.sleep(3000);
                    dockerIgnoringFailure("rm", "-f", CONTAINER_NAME);
                }
                catch (Exception ignored) { }
            }));
            Instant deadline = Instant.now().plus(Duration.ofSeconds(30));
            while (Instant.now().isBefore(deadline)) {
                if (dockerIgnoringFailure("exec", CONTAINER_NAME, "pg_isready", "-U", "tradediary") == 0) {
                    String mapped = docker("port", CONTAINER_NAME, "5432/tcp").trim();
                    return Integer.parseInt(mapped.substring(mapped.lastIndexOf(':') + 1));
                }
                Thread.sleep(500);
            }
            throw new IllegalStateException("PostgreSQL integration container did not become ready");
        } catch (Exception e) {
            try { dockerIgnoringFailure("rm", "-f", CONTAINER_NAME); }
            catch (Exception ignored) { }
            throw new IllegalStateException("Could not start PostgreSQL integration container", e);
        }
    }

    private static String docker(String... arguments) throws IOException, InterruptedException {
        String[] command = new String[arguments.length + 1];
        command[0] = "docker";
        System.arraycopy(arguments, 0, command, 1, arguments.length);
        Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        if (process.waitFor() != 0) throw new IllegalStateException("docker failed: " + output);
        return output;
    }

    private static int dockerIgnoringFailure(String... arguments) throws IOException, InterruptedException {
        String[] command = new String[arguments.length + 1];
        command[0] = "docker";
        System.arraycopy(arguments, 0, command, 1, arguments.length);
        Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
        process.getInputStream().transferTo(java.io.OutputStream.nullOutputStream());
        return process.waitFor();
    }
}
